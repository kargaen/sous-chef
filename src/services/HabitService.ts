import { StorageService } from "./StorageService";

export type HabitEvent =
  | "pantry_item_added"
  | "pantry_item_removed"
  | "recipe_cooked"
  | "recipe_saved"
  | "meal_plan_created"
  | "shopping_list_viewed"
  | "waste_entry_recorded"
  | "chat_opened";

interface HabitRow {
  id: string;
  event: string;
  recorded_at: string;
}

export const HabitService = {
  record: (event: HabitEvent): void => {
    const id = `${event}_${Date.now()}`;
    const recordedAt = new Date().toISOString();
    StorageService.dbRun(
      "INSERT INTO habits (id, event, recorded_at) VALUES (?, ?, ?)",
      [id, event, recordedAt],
    );
  },

  getRecent: (limitDays = 7): HabitRow[] => {
    return StorageService.dbQuery<HabitRow>(
      `SELECT * FROM habits
       WHERE recorded_at >= datetime('now', '-${limitDays} days')
       ORDER BY recorded_at DESC`,
    );
  },

  getEventCount: (event: HabitEvent, limitDays = 30): number => {
    const row = StorageService.dbQueryFirst<{ count: number }>(
      `SELECT COUNT(*) as count FROM habits
       WHERE event = ? AND recorded_at >= datetime('now', '-${limitDays} days')`,
      [event],
    );
    return row?.count ?? 0;
  },

  getSummary: (): Record<string, number> => {
    const rows = StorageService.dbQuery<{ event: string; count: number }>(
      `SELECT event, COUNT(*) as count FROM habits
       WHERE recorded_at >= datetime('now', '-30 days')
       GROUP BY event`,
    );
    return rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.event] = row.count;
      return acc;
    }, {});
  },
};
