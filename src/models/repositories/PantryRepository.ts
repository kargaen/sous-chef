import type { PantryItem } from "../types";
import { StorageService } from "@/services/StorageService";

export class PantryRepository {
  async getAll(): Promise<PantryItem[]> {
    const rows = StorageService.dbQuery<{ data: string }>(
      "SELECT data FROM pantry ORDER BY COALESCE(expiry_date, '9999-12-31') ASC, id ASC",
    );
    return rows.map((r) => JSON.parse(r.data));
  }

  async getById(id: string): Promise<PantryItem | null> {
    const row = StorageService.dbQueryFirst<{ data: string }>(
      "SELECT data FROM pantry WHERE id = ?",
      [id],
    );

    return row ? (JSON.parse(row.data) as PantryItem) : null;
  }

  async getExpiringSoon(withinDays = 3): Promise<PantryItem[]> {
    const rows = StorageService.dbQuery<{ data: string }>(
      `SELECT data FROM pantry
       WHERE expiry_date IS NOT NULL
       AND date(expiry_date) >= date('now')
       AND date(expiry_date) <= date('now', '+${withinDays} days')
       ORDER BY date(expiry_date) ASC, id ASC`,
    );
    return rows.map((r) => JSON.parse(r.data));
  }

  async getExpired(): Promise<PantryItem[]> {
    const rows = StorageService.dbQuery<{ data: string }>(
      `SELECT data FROM pantry
       WHERE expiry_date IS NOT NULL
       AND date(expiry_date) < date('now')
       ORDER BY date(expiry_date) ASC, id ASC`,
    );
    return rows.map((r) => JSON.parse(r.data));
  }

  async insert(item: PantryItem): Promise<void> {
    StorageService.dbRun(
      "INSERT OR REPLACE INTO pantry (id, data, expiry_date) VALUES (?, ?, ?)",
      [item.id, JSON.stringify(item), item.expiryDate ?? null],
    );
  }

  async update(item: PantryItem): Promise<void> {
    StorageService.dbRun(
      "UPDATE pantry SET data = ?, expiry_date = ? WHERE id = ?",
      [JSON.stringify(item), item.expiryDate ?? null, item.id],
    );
  }

  async delete(id: string): Promise<void> {
    StorageService.dbRun("DELETE FROM pantry WHERE id = ?", [id]);
  }
}
