import { useCallback, useMemo, useState } from "react";
import { ZodError } from "zod";

import { PantryRepository } from "../models/repositories/PantryRepository";
import { PantryItemSchema } from "../models/schemas/PantrySchema";
import { STORAGE_ZONES, type PantryItem, type PantryNudgeFrequency, type Recipe, type StorageZone } from "../models/types";
import { HabitService } from "../services/HabitService";
import { LLMService } from "../services/LLMService";
import { RecipeImportService } from "../services/RecipeImportService";
import { WasteService } from "../services/WasteService";
import { useChefProfileStore } from "../store/chefProfileStore";
import { usePantryStore } from "../store/pantryStore";
import { useSettingsStore } from "../store/settingsStore";
import { buildSystemPrompt } from "../prompts";
import {
  PANTRY_SUGGESTION_SYSTEM_PROMPT,
  buildPantrySuggestionsPrompt,
  buildPantrySwapPrompt,
  parsePantrySuggestions,
  type PantrySuggestion,
} from "../prompts/pantrySuggestions";
import { RecipeRepository } from "../models/repositories/RecipeRepository";
import {
  formatPantryQuantity,
  getDaysUntilExpiry,
  getPantryExpiryLabel,
  getPantryExpiryStatus,
  type PantryExpiryStatus,
  type PantryItemDraft,
  toPantryItemDraft,
} from "../utils/pantry";

import { createLogger } from "@/utils/logger";

const log = createLogger("usePantryController");

const NUDGE_WINDOW_MS: Record<PantryNudgeFrequency, number> = {
  daily: 1 * 86_400_000,
  weekly: 7 * 86_400_000,
  monthly: 30 * 86_400_000,
  rarely: 90 * 86_400_000,
};

const repo = new PantryRepository();
const recipeRepo = new RecipeRepository();

export interface PantryItemViewModel {
  id: string;
  name: string;
  quantity: string;
  zone: StorageZone;
  expiryStatus: PantryExpiryStatus;
  expiryLabel: string;
  createdLabel?: string;
  usedCount: number;
  draft: PantryItemDraft;
}

export interface PantryWasteAlertViewModel {
  itemId: string;
  title: string;
  body: string;
  actionLabel: string;
}

const isStorageZone = (value: string): value is StorageZone => {
  return STORAGE_ZONES.includes(value as StorageZone);
};

const formatValidationError = (error: unknown): string => {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "The pantry item is invalid.";
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "The pantry item is invalid.";
};

const normaliseQuantity = (value: string): number => {
  const parsed = Number(value.replace(",", ".").trim());

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("Quantity must be a positive number.");
  }

  return parsed;
};

const normaliseExpiryDate = (value: string): string | undefined =>
  normaliseDateField(value, "Expiry date");

const normaliseCreatedDate = (value: string): string | undefined =>
  normaliseDateField(value, "Made on date");

const normaliseDateField = (value: string, label: string): string | undefined => {
  const trimmed = value.trim();

  if (!trimmed) return undefined;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error(`${label} must use YYYY-MM-DD.`);
  }

  const parsed = new Date(`${trimmed}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${label} is not valid.`);
  }

  return trimmed;
};

const buildPantryItem = (draft: PantryItemDraft, id: string): PantryItem => {
  const name = draft.name.trim();

  if (!name) {
    throw new Error("Name is required.");
  }

  if (!isStorageZone(draft.storageZone)) {
    throw new Error("Choose where this item is stored.");
  }

  return PantryItemSchema.parse({
    id,
    name,
    quantity: normaliseQuantity(draft.quantity),
    unit: draft.unit.trim() || "unit",
    storageZone: draft.storageZone,
    expiryDate: normaliseExpiryDate(draft.expiryDate),
    createdDate: normaliseCreatedDate(draft.createdDate),
  });
};

const sortPantryItems = (items: PantryItem[]): PantryItem[] => {
  return [...items].sort((left, right) => {
    const leftDays = getDaysUntilExpiry(left.expiryDate);
    const rightDays = getDaysUntilExpiry(right.expiryDate);

    if (leftDays === null && rightDays === null) {
      return left.name.localeCompare(right.name);
    }

    if (leftDays === null) return 1;
    if (rightDays === null) return -1;
    if (leftDays !== rightDays) return leftDays - rightDays;

    return left.name.localeCompare(right.name);
  });
};

const getCreatedLabel = (createdDate?: string): string | undefined => {
  if (!createdDate) return undefined;
  const created = new Date(`${createdDate}T00:00:00`);
  const days = Math.floor((Date.now() - created.getTime()) / 86_400_000);
  if (days <= 0) return "made today";
  if (days === 1) return "made yesterday";
  return `made ${days} days ago`;
};

const toPantryItemViewModel = (item: PantryItem): PantryItemViewModel => {
  return {
    id: item.id,
    name: item.name,
    quantity: formatPantryQuantity(item),
    zone: item.storageZone,
    expiryStatus: getPantryExpiryStatus(item.expiryDate),
    expiryLabel: getPantryExpiryLabel(item.expiryDate),
    createdLabel: getCreatedLabel(item.createdDate),
    usedCount: item.usedCount ?? 0,
    draft: toPantryItemDraft(item),
  };
};

const toWasteAlertViewModel = (
  item: PantryItem | undefined,
): PantryWasteAlertViewModel | null => {
  if (!item) return null;

  const isExpired = getPantryExpiryStatus(item.expiryDate) === "expired";

  return {
    itemId: item.id,
    title: isExpired ? `${item.name} has expired` : `${item.name} needs a plan`,
    body: isExpired
      ? `${item.name} has passed its date. Review it now so the pantry stays honest.`
      : `${item.name} is due ${getPantryExpiryLabel(item.expiryDate).toLowerCase()}. It is a good candidate for the next meal.`,
    actionLabel: "Review item",
  };
};

export const usePantryController = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expiringSoon, setExpiringSoon] = useState<PantryItem[]>([]);
  const [expiredItems, setExpiredItems] = useState<PantryItem[]>([]);
  const [removalPrompt, setRemovalPrompt] = useState<{ id: string; name: string } | null>(null);

  const profile = useChefProfileStore((s) => s.profile);
  const appSettings = useSettingsStore((s) => s.settings);
  const items = usePantryStore((state) => state.items);
  const setItems = usePantryStore((state) => state.setItems);
  const upsertItem = usePantryStore((state) => state.upsertItem);
  const removeItem = usePantryStore((state) => state.removeItem);

  const refreshExpiryBuckets = useCallback(async (): Promise<void> => {
    const [soonItems, expired] = await Promise.all([
      repo.getExpiringSoon(3),
      repo.getExpired(),
    ]);

    setExpiringSoon(soonItems);
    setExpiredItems(expired);
  }, []);

  const loadItems = useCallback(async (): Promise<void> => {
    log.info("Loading pantry items");

    setLoading(true);
    setError(null);

    try {
      const allItems = await repo.getAll();

      setItems(allItems);
      await refreshExpiryBuckets();

      log.info("Loaded pantry items", {
        totalItems: allItems.length,
      });
    } catch (loadError) {
      log.error("Could not load pantry", loadError);
      setError("Could not load pantry.");
    } finally {
      setLoading(false);
    }
  }, [refreshExpiryBuckets, setItems]);

  const addItem = useCallback(
    async (draft: PantryItemDraft): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const item = buildPantryItem(draft, `pantry_${Date.now()}`);
        await repo.insert(item);
        upsertItem(item);
        HabitService.record("pantry_item_added");
        await refreshExpiryBuckets();
        return true;
      } catch (addError) {
        log.error("Could not add pantry item", addError);
        setError(formatValidationError(addError));
        return false;
      } finally {
        setLoading(false);
      }
    },
    [refreshExpiryBuckets, upsertItem],
  );

  const updateItem = useCallback(
    async (id: string, draft: PantryItemDraft): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const existingItem = await repo.getById(id);

        if (!existingItem) {
          throw new Error("That pantry item could not be found.");
        }

        const nextItem: PantryItem = {
          ...buildPantryItem(draft, id),
          usedCount: existingItem.usedCount ?? 0,
          // Prefer the user's edited createdDate; fall back to the stored value
          // so existing items without a draft createdDate don't lose their date.
          createdDate: draft.createdDate.trim()
            ? normaliseCreatedDate(draft.createdDate)
            : existingItem.createdDate,
          lastSurfacedAt: existingItem.lastSurfacedAt,
        };
        await repo.update(nextItem);
        upsertItem(nextItem);
        await refreshExpiryBuckets();
        return true;
      } catch (updateError) {
        log.error("Could not update pantry item", updateError);
        setError(formatValidationError(updateError));
        return false;
      } finally {
        setLoading(false);
      }
    },
    [refreshExpiryBuckets, upsertItem],
  );

  const removeItemById = useCallback(
    async (id: string): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        await repo.delete(id);
        removeItem(id);
        HabitService.record("pantry_item_removed");
        await refreshExpiryBuckets();
        return true;
      } catch (removeError) {
        log.error("Could not remove pantry item", removeError);
        setError("Could not remove item.");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [refreshExpiryBuckets, removeItem],
  );

  const markItemUsed = useCallback(
    async (id: string): Promise<boolean> => {
      setError(null);
      try {
        const item = await repo.getById(id);
        if (!item) return false;
        const updated: PantryItem = { ...item, usedCount: (item.usedCount ?? 0) + 1 };
        await repo.update(updated);
        upsertItem(updated);
        HabitService.record("pantry_item_used");

        // Fire LLM check detached — doesn't block the editor from closing.
        if (profile) {
          void (async () => {
            try {
              const response = await LLMService.send({
                system: "You are a practical kitchen assistant. Answer only yes or no.",
                messages: [
                  {
                    role: "user",
                    content: `Pantry item: "${updated.name}", used ${updated.usedCount} time${updated.usedCount === 1 ? "" : "s"}. Based on the name and usage count, should the user be asked if they want to remove it? Single-use items (one lime, one egg) → yes after 1 use. Bulk dry goods (flour, chickpeas, rice) → only after many uses. Homemade preserves → no. Reply with only: yes or no.`,
                  },
                ],
              });
              if (/^yes/i.test(response.content.trim())) {
                setRemovalPrompt({ id: updated.id, name: updated.name });
              }
            } catch {
              // LLM failure is non-fatal
            }
          })();
        }

        return true;
      } catch (err) {
        log.error("Could not mark pantry item as used", err);
        setError("Could not update item.");
        return false;
      }
    },
    [upsertItem, profile],
  );

  const clearRemovalPrompt = useCallback(() => setRemovalPrompt(null), []);

  // Asks the LLM how long a homemade item typically keeps in the fridge.
  // Returns a suggested YYYY-MM-DD expiry date, or null on failure.
  const suggestShelfLife = useCallback(
    async (itemName: string): Promise<string | null> => {
      if (!profile) return null;
      try {
        const response = await LLMService.send({
          system: buildSystemPrompt(profile),
          messages: [
            {
              role: "user",
              content: `How many days does homemade ${itemName.trim()} typically last when refrigerated? Reply with only a positive integer — no other text.`,
            },
          ],
        });
        const days = parseInt(response.content.trim(), 10);
        if (!Number.isFinite(days) || days <= 0) return null;
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + days);
        return expiry.toISOString().slice(0, 10);
      } catch {
        return null;
      }
    },
    [profile],
  );

  const logWasteForItem = useCallback(
    async (id: string, reason = "discarded"): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const item = await repo.getById(id);

        if (!item) {
          throw new Error("That pantry item could not be found.");
        }

        WasteService.logWaste(item, reason);
        HabitService.record("waste_entry_recorded");
        await repo.delete(id);
        removeItem(id);
        HabitService.record("pantry_item_removed");
        await refreshExpiryBuckets();
        return true;
      } catch (wasteError) {
        log.error("Could not record pantry waste", wasteError);
        setError("Could not record waste.");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [refreshExpiryBuckets, removeItem],
  );

  // Returns items prioritised for the pantry suggestion flow (P5).
  // Fridge/freezer items expiring soon come first; cupboard items follow
  // when they have not been surfaced within the user's nudge window.
  const getPrioritisedSuggestionItems = useCallback((): PantryItem[] => {
    const frequency = appSettings?.pantryNudgeFrequency ?? "monthly";
    const windowMs = NUDGE_WINDOW_MS[frequency];
    const now = Date.now();

    const expiring = items
      .filter((item) => {
        if (item.storageZone === "cupboard") return false;
        const status = getPantryExpiryStatus(item.expiryDate);
        return status === "soon" || status === "expired";
      })
      .sort((a, b) => {
        const ad = getDaysUntilExpiry(a.expiryDate) ?? 999;
        const bd = getDaysUntilExpiry(b.expiryDate) ?? 999;
        return ad - bd;
      });

    const cupboard = items
      .filter((item) => {
        if (item.storageZone !== "cupboard") return false;
        if (!item.lastSurfacedAt) return true;
        return now - new Date(item.lastSurfacedAt).getTime() >= windowMs;
      })
      .sort((a, b) => {
        const at = a.lastSurfacedAt ? new Date(a.lastSurfacedAt).getTime() : 0;
        const bt = b.lastSurfacedAt ? new Date(b.lastSurfacedAt).getTime() : 0;
        return at - bt;
      });

    return [...expiring, ...cupboard];
  }, [items, appSettings]);

  // Stamps lastSurfacedAt = now on a batch of items after a suggestion run.
  const markItemsSurfaced = useCallback(
    async (ids: string[]): Promise<void> => {
      const now = new Date().toISOString();
      for (const id of ids) {
        const item = items.find((i) => i.id === id);
        if (!item) continue;
        const updated: PantryItem = { ...item, lastSurfacedAt: now };
        await repo.update(updated);
        upsertItem(updated);
      }
    },
    [items, upsertItem],
  );

  // P5.2 — Returns 3-4 recipe suggestions derived from the prioritised
  // pantry items. Stamps lastSurfacedAt on all surfaced items.
  const suggestFromPantry = useCallback(async (): Promise<PantrySuggestion[]> => {
    if (!profile) return [];
    const candidates = getPrioritisedSuggestionItems();
    if (candidates.length === 0) return [];

    const contextItems = candidates.slice(0, 12).map((item) => ({
      name: item.name,
      zone: item.storageZone,
      daysUntilExpiry: getDaysUntilExpiry(item.expiryDate),
    }));

    try {
      const response = await LLMService.send({
        system: PANTRY_SUGGESTION_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: buildPantrySuggestionsPrompt({
              items: contextItems,
              cuisinePreferences: profile.preferences.cuisinePreferences ?? [],
              skillLevel: profile.skillLevel ?? null,
              month: new Date().getMonth() + 1,
            }),
          },
        ],
      });

      const suggestions = parsePantrySuggestions(response.content);
      if (suggestions.length > 0) {
        await markItemsSurfaced(candidates.slice(0, 12).map((i) => i.id));
      }
      return suggestions;
    } catch {
      return [];
    }
  }, [profile, getPrioritisedSuggestionItems, markItemsSurfaced]);

  // P5.1 — Generates a single recipe suggestion for a specific pantry item.
  const suggestForItem = useCallback(
    async (itemName: string): Promise<PantrySuggestion | null> => {
      if (!profile) return null;
      try {
        const response = await LLMService.send({
          system: PANTRY_SUGGESTION_SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: buildPantrySwapPrompt(
                itemName,
                [],
                {
                  cuisinePreferences: profile.preferences.cuisinePreferences ?? [],
                  skillLevel: profile.skillLevel ?? null,
                  month: new Date().getMonth() + 1,
                },
              ),
            },
          ],
        });
        const results = parsePantrySuggestions(response.content);
        return results[0] ?? null;
      } catch {
        return null;
      }
    },
    [profile],
  );

  // P5.3 — Swaps one suggestion in the list; returns the replacement or null.
  const swapSuggestion = useCallback(
    async (
      target: PantrySuggestion,
      current: PantrySuggestion[],
    ): Promise<PantrySuggestion | null> => {
      if (!profile) return null;
      try {
        const response = await LLMService.send({
          system: PANTRY_SUGGESTION_SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: buildPantrySwapPrompt(
                target.primaryItemName || target.title,
                current.map((s) => s.title),
                {
                  cuisinePreferences: profile.preferences.cuisinePreferences ?? [],
                  skillLevel: profile.skillLevel ?? null,
                  month: new Date().getMonth() + 1,
                },
              ),
            },
          ],
        });
        const results = parsePantrySuggestions(response.content);
        return results[0] ?? null;
      } catch {
        return null;
      }
    },
    [profile],
  );

  // P5.5 — Generates a full recipe from a pantry suggestion and saves it.
  // Delegates generation to RecipeImportService; caller saves via recipeRepo.
  const generateRecipeFromIdea = useCallback(
    async (suggestion: PantrySuggestion): Promise<Recipe | null> => {
      if (!profile) return null;
      const source = suggestion.description
        ? `${suggestion.title} — ${suggestion.description}`
        : suggestion.title;
      const recipe = await RecipeImportService.generateRecipeFromIdea(source, profile);
      if (recipe) await recipeRepo.save(recipe);
      return recipe;
    },
    [profile],
  );

  // P5.4 — Fuzzy-matches a suggestion title against saved recipes.
  // Returns the first match above a basic similarity threshold, or null.
  const findRecipeForSuggestion = useCallback(
    async (suggestion: PantrySuggestion): Promise<string | null> => {
      const results = await recipeRepo.search(suggestion.title);
      if (results.length === 0) return null;
      const q = suggestion.title.toLowerCase();
      const match = results.find((r) => {
        const t = r.title.toLowerCase();
        return t.includes(q) || q.includes(t) || t.split(" ").some((w) => q.includes(w) && w.length > 4);
      });
      return match?.id ?? null;
    },
    [],
  );

  // P7 — Saves a cooked dish as pantry leftovers. Uses suggestShelfLife to
  // derive an expiry date so the cook doesn't have to guess.
  const saveLeftoversFromCook = useCallback(
    async (recipeName: string): Promise<boolean> => {
      const trimmedName = recipeName.trim();
      if (!trimmedName) return false;
      setLoading(true);
      setError(null);
      try {
        const today = new Date().toISOString().slice(0, 10);
        const expiryDate = await suggestShelfLife(trimmedName);
        const item: PantryItem = PantryItemSchema.parse({
          id: `pantry_${Date.now()}`,
          name: `${trimmedName} leftovers`,
          quantity: 1,
          unit: "portion",
          storageZone: "fridge",
          expiryDate: expiryDate ?? undefined,
          createdDate: today,
          usedCount: 0,
        });
        await repo.insert(item);
        upsertItem(item);
        HabitService.record("pantry_item_added");
        await refreshExpiryBuckets();
        return true;
      } catch (e) {
        log.error("Could not save leftovers to pantry", e);
        setError("Could not save leftovers.");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [suggestShelfLife, upsertItem, refreshExpiryBuckets],
  );

  const itemViewModels = useMemo(() => {
    return sortPantryItems(items).map(toPantryItemViewModel);
  }, [items]);

  const wasteAlert = useMemo(() => {
    const urgentItem = sortPantryItems([...expiredItems, ...expiringSoon])[0];
    return toWasteAlertViewModel(urgentItem);
  }, [expiredItems, expiringSoon]);

  return {
    loadItems,
    addItem,
    updateItem,
    removeItemById,
    markItemUsed,
    removalPrompt,
    clearRemovalPrompt,
    logWasteForItem,
    suggestShelfLife,
    getPrioritisedSuggestionItems,
    markItemsSurfaced,
    suggestFromPantry,
    suggestForItem,
    swapSuggestion,
    generateRecipeFromIdea,
    findRecipeForSuggestion,
    saveLeftoversFromCook,
    items: itemViewModels,
    wasteAlert,
    loading,
    error,
  };
};
