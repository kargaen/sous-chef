import { useCallback, useMemo, useState } from "react";
import { ZodError } from "zod";

import { PantryRepository } from "../models/repositories/PantryRepository";
import { PantryItemSchema } from "../models/schemas/PantrySchema";
import { STORAGE_ZONES, type PantryItem, type StorageZone } from "../models/types";
import { HabitService } from "../services/HabitService";
import { WasteService } from "../services/WasteService";
import { usePantryStore } from "../store/pantryStore";
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

const repo = new PantryRepository();

export interface PantryItemViewModel {
  id: string;
  name: string;
  quantity: string;
  zone: StorageZone;
  expiryStatus: PantryExpiryStatus;
  expiryLabel: string;
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

const normaliseExpiryDate = (value: string): string | undefined => {
  const trimmed = value.trim();

  if (!trimmed) return undefined;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error("Expiry date must use YYYY-MM-DD.");
  }

  const parsed = new Date(`${trimmed}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Expiry date is not valid.");
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

const toPantryItemViewModel = (item: PantryItem): PantryItemViewModel => {
  return {
    id: item.id,
    name: item.name,
    quantity: formatPantryQuantity(item),
    zone: item.storageZone,
    expiryStatus: getPantryExpiryStatus(item.expiryDate),
    expiryLabel: getPantryExpiryLabel(item.expiryDate),
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
          createdDate: existingItem.createdDate,
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
        return true;
      } catch (err) {
        log.error("Could not mark pantry item as used", err);
        setError("Could not update item.");
        return false;
      }
    },
    [upsertItem],
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
    logWasteForItem,
    items: itemViewModels,
    wasteAlert,
    loading,
    error,
  };
};
