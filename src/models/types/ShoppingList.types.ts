export type StoreSection =
  | "produce"
  | "dairy"
  | "meat"
  | "bakery"
  | "frozen"
  | "pantry"
  | "other";

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  section: StoreSection;
  checked: boolean;
  recipeIds: string[];
}

export interface ListGroup {
  section: StoreSection;
  items: ShoppingItem[];
}
