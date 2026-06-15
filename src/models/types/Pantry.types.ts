export const STORAGE_ZONES = ["fridge", "freezer", "cupboard"] as const;

export type StorageZone = (typeof STORAGE_ZONES)[number];

export interface PantryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  storageZone: StorageZone;
  expiryDate?: string;
}

export interface WasteEntry {
  id: string;
  pantryItemId: string;
  name: string;
  reason: string;
  recordedAt: string;
}
