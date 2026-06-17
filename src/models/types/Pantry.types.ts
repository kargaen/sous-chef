export const STORAGE_ZONES = ["fridge", "freezer", "cupboard"] as const;

export type StorageZone = (typeof STORAGE_ZONES)[number];

export interface PantryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  storageZone: StorageZone;
  expiryDate?: string;
  createdDate?: string;      // YYYY-MM-DD — when a homemade item was made
  usedCount: number;         // incremented each time the item is marked used
  lastSurfacedAt?: string;   // ISO timestamp — last time this item appeared in a suggestion
}

export interface WasteEntry {
  id: string;
  pantryItemId: string;
  name: string;
  reason: string;
  recordedAt: string;
}
