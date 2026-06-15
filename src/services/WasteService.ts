import { PantryRepository } from "../models/repositories/PantryRepository";
import type { PantryItem, WasteEntry } from "../models/types";
import { StorageService } from "./StorageService";

const pantryRepo = new PantryRepository();

export const WasteService = {
  logWaste: (item: PantryItem, reason: string): void => {
    const id = `waste_${item.id}_${Date.now()}`;
    StorageService.dbRun(
      "INSERT INTO waste_log (id, pantry_item_id, name, reason, recorded_at) VALUES (?, ?, ?, ?, ?)",
      [id, item.id, item.name, reason, new Date().toISOString()],
    );
  },

  getRecentWaste: (limitDays = 30): WasteEntry[] => {
    return StorageService.dbQuery<{
      id: string;
      pantryItemId: string;
      name: string;
      reason: string;
      recordedAt: string;
    }>(
      `SELECT
         id,
         pantry_item_id as pantryItemId,
         name,
         reason,
         recorded_at as recordedAt
       FROM waste_log
       WHERE recorded_at >= datetime('now', '-${limitDays} days')
       ORDER BY recorded_at DESC`,
    );
  },

  checkExpired: async (): Promise<PantryItem[]> => {
    return pantryRepo.getExpired();
  },
};
