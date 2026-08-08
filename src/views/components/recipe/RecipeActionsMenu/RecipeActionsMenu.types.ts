export interface RecipeActionsMenuItem {
  label: string;
  onPress: () => void;
  // Destructive items are tinted and sit last; the menu does not reorder them,
  // so callers keep control of the order.
  destructive?: boolean;
}
