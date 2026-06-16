import type { PantryItem, StorageZone } from "@/models/types";

export type PantryExpiryStatus = "fresh" | "soon" | "expired" | "unknown";

export interface PantryItemDraft {
  name: string;
  quantity: string;
  unit: string;
  storageZone: StorageZone | "";
  expiryDate: string;
  createdDate: string; // YYYY-MM-DD, for homemade items
}

export const STORAGE_ZONE_LABELS: Record<StorageZone, string> = {
  fridge: "Fridge",
  freezer: "Freezer",
  cupboard: "Cupboard",
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const EMPTY_PANTRY_ITEM_DRAFT: PantryItemDraft = {
  name: "",
  quantity: "",
  unit: "",
  storageZone: "",
  expiryDate: "",
  createdDate: "",
};

const parseDateValue = (value?: string): number | null => {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00`);
  const time = date.getTime();

  return Number.isNaN(time) ? null : time;
};

export const getDaysUntilExpiry = (expiryDate?: string): number | null => {
  const expiryTime = parseDateValue(expiryDate);

  if (expiryTime === null) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Math.ceil((expiryTime - today.getTime()) / MS_PER_DAY);
};

export const getPantryExpiryStatus = (
  expiryDate?: string,
): PantryExpiryStatus => {
  const daysUntilExpiry = getDaysUntilExpiry(expiryDate);

  if (daysUntilExpiry === null) return "unknown";
  if (daysUntilExpiry < 0) return "expired";
  if (daysUntilExpiry <= 3) return "soon";

  return "fresh";
};

export const getPantryExpiryLabel = (expiryDate?: string): string => {
  const daysUntilExpiry = getDaysUntilExpiry(expiryDate);

  if (daysUntilExpiry === null) return "No date";
  if (daysUntilExpiry < 0) return "Expired";
  if (daysUntilExpiry === 0) return "Today";
  if (daysUntilExpiry === 1) return "Tomorrow";

  return `${daysUntilExpiry} days`;
};

export const formatPantryQuantity = (item: PantryItem): string => {
  const quantity = String(item.quantity);
  const unit = item.unit.trim();

  return unit ? `${quantity} ${unit}` : quantity;
};

export const toPantryItemDraft = (item: PantryItem): PantryItemDraft => {
  return {
    name: item.name,
    quantity: String(item.quantity),
    unit: item.unit,
    storageZone: item.storageZone,
    expiryDate: item.expiryDate ?? "",
    createdDate: item.createdDate ?? "",
  };
};
