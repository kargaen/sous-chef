import { BudgetRepository } from "../models/repositories/BudgetRepository";
import { ChefProfileRepository } from "../models/repositories/ChefProfileRepository";
import { CookLogRepository } from "../models/repositories/CookLogRepository";
import { CookbookRepository } from "../models/repositories/CookbookRepository";
import { DismissalRepository } from "../models/repositories/DismissalRepository";
import { MealPlanRepository } from "../models/repositories/MealPlanRepository";
import { PantryRepository } from "../models/repositories/PantryRepository";
import { PlanPresetRepository } from "../models/repositories/PlanPresetRepository";
import { RecipeRepository } from "../models/repositories/RecipeRepository";
import { SettingsRepository } from "../models/repositories/SettingsRepository";
import type { AppSnapshot } from "../models/types";
import { SnapshotService } from "./SnapshotService";
import { SupabaseService } from "./SupabaseService";

const budgetRepository = new BudgetRepository();
const chefProfileRepository = new ChefProfileRepository();
const cookLogRepository = new CookLogRepository();
const cookbookRepository = new CookbookRepository();
const dismissalRepository = new DismissalRepository();
const mealPlanRepository = new MealPlanRepository();
const pantryRepository = new PantryRepository();
const planPresetRepository = new PlanPresetRepository();
const recipeRepository = new RecipeRepository();
const settingsRepository = new SettingsRepository();

const wrapBackupError = (operation: string, error: unknown): Error => {
  const message = error instanceof Error ? error.message : String(error);
  return new Error(`BackupService ${operation} failed: ${message}`);
};

// Writes back through each repository's own save/insert methods — reusing
// their existing validation and INSERT OR REPLACE upsert semantics, so
// restore is a merge-by-id onto whatever is already on the device, not a
// destructive wipe. Cook history uses the id-preserving restore* methods
// (see CookLogRepository/BudgetRepository) so Rating rows still point at the
// right cook log and category after the round-trip.
const writeSnapshot = async (snapshot: AppSnapshot): Promise<void> => {
  await Promise.all(
    snapshot.recipes.map((recipe) => recipeRepository.save(recipe)),
  );
  await Promise.all(
    snapshot.cookbooks.map((cookbook) =>
      cookbookRepository.save(cookbook.id, {
        title: cookbook.title,
        description: cookbook.description,
        parentId: cookbook.parentId,
        recipeIds: cookbook.recipeIds,
      }),
    ),
  );
  await Promise.all(
    snapshot.pantryItems.map((item) => pantryRepository.insert(item)),
  );
  await Promise.all(
    snapshot.mealPlans.map((plan) => mealPlanRepository.save(plan)),
  );
  await Promise.all(
    snapshot.planPresets.map((preset) => planPresetRepository.save(preset)),
  );
  await Promise.all(
    snapshot.budgetPeriods.map((period) => budgetRepository.savePeriod(period)),
  );
  await Promise.all(
    snapshot.spendEntries.map((entry) => budgetRepository.restoreEntry(entry)),
  );

  snapshot.cookLogs.forEach((log) => cookLogRepository.restoreCookLog(log));
  snapshot.ratings.forEach((rating) => cookLogRepository.restoreRating(rating));
  snapshot.cookNotes.forEach((note) => cookLogRepository.restoreCookNote(note));
  snapshot.ratingCategories.forEach((category) =>
    cookLogRepository.restoreRatingCategory(category),
  );

  if (snapshot.chefProfile) {
    await chefProfileRepository.save(snapshot.chefProfile);
  }

  if (snapshot.settings) {
    // Merge onto the device's current settings and keep its geminiApiKey —
    // the snapshot never carries one, so a naive overwrite would null it out.
    const currentSettings = await settingsRepository.get();
    await settingsRepository.save({
      ...currentSettings,
      ...snapshot.settings,
      geminiApiKey: currentSettings.geminiApiKey,
    });
  }

  // Replayed via record() rather than a bulk setter — dismissal signals are a
  // small "gentle bias" ring buffer (see DismissalRepository), not
  // user-facing history, so re-stamping each title to "now" on restore is an
  // acceptable simplification. Reversed so the original most-recent title
  // still ends up at the front of the ring.
  for (const signal of [...snapshot.dismissalSignals].reverse()) {
    await dismissalRepository.record(signal.title);
  }
};

export const BackupService = {
  // Resolves the session itself rather than taking a userId — ties session +
  // snapshot + SupabaseService together so callers (useBackupController) just
  // invoke this and stamp the returned timestamp.
  async backupNow(): Promise<string> {
    try {
      const session = await SupabaseService.getSession();

      if (!session) {
        throw new Error("Sign in before backing up.");
      }

      const snapshot = await SnapshotService.build();
      await SupabaseService.uploadSnapshot(
        session.user.id,
        JSON.stringify(snapshot),
      );

      return snapshot.exportedAt;
    } catch (error) {
      throw wrapBackupError("backupNow", error);
    }
  },

  async restoreFromRemote(): Promise<string> {
    try {
      const session = await SupabaseService.getSession();

      if (!session) {
        throw new Error("Sign in before restoring.");
      }

      const snapshotJson = await SupabaseService.fetchSnapshot(session.user.id);

      if (!snapshotJson) {
        throw new Error("No backup found for this account.");
      }

      const snapshot = JSON.parse(snapshotJson) as AppSnapshot;
      await writeSnapshot(snapshot);

      return snapshot.exportedAt;
    } catch (error) {
      throw wrapBackupError("restoreFromRemote", error);
    }
  },
};
