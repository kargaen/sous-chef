import { useState } from "react";

import type { RecipeActionsMenuItem } from "./RecipeActionsMenu.types";

export const useRecipeActionsMenu = (items: RecipeActionsMenuItem[]) => {
  const [open, setOpen] = useState(false);

  const toggle = (): void => setOpen((current) => !current);

  // Closing before running the action keeps the menu from lingering over the
  // confirmation dialogs some of these actions raise.
  const select = (item: RecipeActionsMenuItem): void => {
    setOpen(false);
    item.onPress();
  };

  return { open, select, toggle };
};
