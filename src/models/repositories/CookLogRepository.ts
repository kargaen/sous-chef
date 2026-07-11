import {
  CookLogEntrySchema,
  CookNoteSchema,
  RatingCategorySchema,
  RatingSchema,
} from "../schemas/CookLogSchema";
import type {
  CookLogEntry,
  CookNote,
  Rating,
  RatingCategory,
} from "../types";
import { StorageService } from "@/services/StorageService";

const createId = (prefix: string): string =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export interface RatingInput {
  categoryId: string;
  score: number;
}

export interface RecordCookInput {
  recipeId: string;
  cookedAt?: string;
  /** Overall "how happy" score (1–5). Omitted when the reflection was skipped. */
  overallScore?: number;
  /** Per-dimension scores. */
  ratings?: RatingInput[];
  /** Optional cook note breadcrumb. */
  note?: string;
}

export interface RecipeCookStats {
  timesCooked: number;
  lastCookedDate: string | null;
  averageRating: number | null;
  latestCookNote: string | null;
}

export interface RecentCook {
  recipeId: string;
  cookedAt: string;
}

export class CookLogRepository {
  // Record a cook with its reflection (overall + dimension ratings + note).
  // Pass only recipeId for a skipped reflection — the cook still counts.
  recordCook(input: RecordCookInput): CookLogEntry {
    const cookLog: CookLogEntry = {
      id: createId("cooklog"),
      recipeId: input.recipeId,
      cookedAt: input.cookedAt ?? new Date().toISOString(),
      overallScore: input.overallScore,
    };

    StorageService.dbRun(
      "INSERT INTO cook_logs (id, recipe_id, cooked_at, overall_score) VALUES (?, ?, ?, ?)",
      [
        cookLog.id,
        cookLog.recipeId,
        cookLog.cookedAt,
        cookLog.overallScore ?? null,
      ],
    );

    (input.ratings ?? []).forEach((rating) => {
      StorageService.dbRun(
        "INSERT INTO ratings (id, cook_log_id, category_id, score) VALUES (?, ?, ?, ?)",
        [createId("rating"), cookLog.id, rating.categoryId, rating.score],
      );
    });

    const note = input.note?.trim();
    if (note) {
      StorageService.dbRun(
        "INSERT INTO cook_notes (id, recipe_id, body, created_at) VALUES (?, ?, ?, ?)",
        [createId("cooknote"), input.recipeId, note, cookLog.cookedAt],
      );
    }

    return cookLog;
  }

  getCookLogs(recipeId: string): CookLogEntry[] {
    const rows = StorageService.dbQuery<{
      id: string;
      recipeId: string;
      cookedAt: string;
      overallScore: number | null;
    }>(
      `SELECT id, recipe_id AS recipeId, cooked_at AS cookedAt, overall_score AS overallScore
       FROM cook_logs WHERE recipe_id = ? ORDER BY cooked_at DESC`,
      [recipeId],
    );

    return rows.map((row) =>
      CookLogEntrySchema.parse({
        ...row,
        overallScore: row.overallScore ?? undefined,
      }),
    );
  }

  // Cross-recipe recent cooks (Discover epic D.0c). Unlike getCookLogs, this is
  // not scoped to a single recipe — it answers "what did the cook make lately?"
  // so the leftover loop can suggest using up what's likely left over. Returns
  // only ids + timestamps; the producer resolves titles/ingredients via the
  // recipe repository to keep this storage-only.
  getRecentCooks(sinceDays = 2): RecentCook[] {
    return StorageService.dbQuery<RecentCook>(
      `SELECT recipe_id AS recipeId, cooked_at AS cookedAt
       FROM cook_logs
       WHERE cooked_at >= datetime('now', ?)
       ORDER BY cooked_at DESC`,
      [`-${sinceDays} days`],
    );
  }

  getRatingsForCookLog(cookLogId: string): Rating[] {
    const rows = StorageService.dbQuery<Rating>(
      `SELECT id, cook_log_id AS cookLogId, category_id AS categoryId, score
       FROM ratings WHERE cook_log_id = ?`,
      [cookLogId],
    );
    return rows.map((row) => RatingSchema.parse(row));
  }

  getCookNotes(recipeId: string): CookNote[] {
    const rows = StorageService.dbQuery<CookNote>(
      `SELECT id, recipe_id AS recipeId, body, created_at AS createdAt
       FROM cook_notes WHERE recipe_id = ? ORDER BY created_at DESC`,
      [recipeId],
    );
    return rows.map((row) => CookNoteSchema.parse(row));
  }

  getRatingCategories(recipeId: string): RatingCategory[] {
    const rows = StorageService.dbQuery<RatingCategory>(
      `SELECT id, recipe_id AS recipeId, label, display_order AS displayOrder
       FROM rating_categories WHERE recipe_id = ? ORDER BY display_order ASC`,
      [recipeId],
    );
    return rows.map((row) => RatingCategorySchema.parse(row));
  }

  // Replace the stored categories for a recipe (used when categories are
  // generated at recipe creation — see CS.2).
  saveRatingCategories(
    recipeId: string,
    categories: { label: string }[],
  ): void {
    StorageService.dbRun("DELETE FROM rating_categories WHERE recipe_id = ?", [
      recipeId,
    ]);

    categories.forEach((category, index) => {
      StorageService.dbRun(
        "INSERT INTO rating_categories (id, recipe_id, label, display_order) VALUES (?, ?, ?, ?)",
        [createId("ratingcat"), recipeId, category.label, index],
      );
    });
  }

  // Id-preserving writes for snapshot restore only. Unlike recordCook() and
  // saveRatingCategories() — which mint fresh ids for real cook-logging flows
  // — restore must keep the snapshot's original ids so Rating rows still
  // point at the correct cook log and category after a round-trip.
  restoreCookLog(entry: CookLogEntry): void {
    StorageService.dbRun(
      "INSERT OR REPLACE INTO cook_logs (id, recipe_id, cooked_at, overall_score) VALUES (?, ?, ?, ?)",
      [entry.id, entry.recipeId, entry.cookedAt, entry.overallScore ?? null],
    );
  }

  restoreRating(rating: Rating): void {
    StorageService.dbRun(
      "INSERT OR REPLACE INTO ratings (id, cook_log_id, category_id, score) VALUES (?, ?, ?, ?)",
      [rating.id, rating.cookLogId, rating.categoryId, rating.score],
    );
  }

  restoreCookNote(note: CookNote): void {
    StorageService.dbRun(
      "INSERT OR REPLACE INTO cook_notes (id, recipe_id, body, created_at) VALUES (?, ?, ?, ?)",
      [note.id, note.recipeId, note.body, note.createdAt],
    );
  }

  restoreRatingCategory(category: RatingCategory): void {
    StorageService.dbRun(
      "INSERT OR REPLACE INTO rating_categories (id, recipe_id, label, display_order) VALUES (?, ?, ?, ?)",
      [category.id, category.recipeId, category.label, category.displayOrder],
    );
  }

  // Derived stats — always computed from the underlying rows so they never drift.
  getStats(recipeId: string): RecipeCookStats {
    const aggregate = StorageService.dbQueryFirst<{
      timesCooked: number;
      lastCookedDate: string | null;
      averageRating: number | null;
    }>(
      `SELECT COUNT(*) AS timesCooked,
              MAX(cooked_at) AS lastCookedDate,
              AVG(overall_score) AS averageRating
       FROM cook_logs WHERE recipe_id = ?`,
      [recipeId],
    );

    const latestNote = StorageService.dbQueryFirst<{ body: string }>(
      `SELECT body FROM cook_notes WHERE recipe_id = ?
       ORDER BY created_at DESC LIMIT 1`,
      [recipeId],
    );

    return {
      timesCooked: aggregate?.timesCooked ?? 0,
      lastCookedDate: aggregate?.lastCookedDate ?? null,
      averageRating: aggregate?.averageRating ?? null,
      latestCookNote: latestNote?.body ?? null,
    };
  }
}
