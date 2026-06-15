import type { BudgetPeriod, SpendEntry } from "../types";
import { StorageService } from "@/services/StorageService";

export class BudgetRepository {
  async getPeriod(id: string): Promise<BudgetPeriod | null> {
    const row = StorageService.dbQueryFirst<{ data: string }>(
      "SELECT data FROM budget_periods WHERE id = ?",
      [id],
    );
    return row ? JSON.parse(row.data) : null;
  }

  async savePeriod(period: BudgetPeriod): Promise<void> {
    StorageService.dbRun(
      "INSERT OR REPLACE INTO budget_periods (id, data) VALUES (?, ?)",
      [period.id, JSON.stringify(period)],
    );
  }

  async getEntriesForPeriod(periodId: string): Promise<SpendEntry[]> {
    const rows = StorageService.dbQuery<{ data: string }>(
      "SELECT data FROM spend_entries WHERE period_id = ? ORDER BY recorded_at ASC",
      [periodId],
    );
    return rows.map((r) => JSON.parse(r.data));
  }

  async insertEntry(entry: SpendEntry): Promise<void> {
    StorageService.dbRun(
      "INSERT INTO spend_entries (id, period_id, recorded_at, data) VALUES (?, ?, ?, ?)",
      [entry.id, entry.periodId, entry.recordedAt, JSON.stringify(entry)],
    );
  }
}
