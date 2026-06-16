import type { ListGroup, ShoppingItem, StoreSection } from "../types";
import { MealPlanRepository } from "./MealPlanRepository";
import { PantryRepository } from "./PantryRepository";

export class ShoppingListRepository {
  private mealPlanRepo = new MealPlanRepository();
  private pantryRepo = new PantryRepository();

  async deriveForWeek(weekStartDate: string): Promise<ListGroup[]> {
    const plan = await this.mealPlanRepo.getByWeek(weekStartDate);
    const pantryItems = await this.pantryRepo.getAll();
    const pantryNames = new Set(pantryItems.map((p) => p.name.toLowerCase()));

    if (!plan) return [];

    // Placeholder derivation — will be replaced with real logic in the controller layer
    const items: ShoppingItem[] = plan.slots
      .filter((slot) => !!slot.recipeId)
      .flatMap((slot) => [
        {
          id: `${slot.id}-placeholder`,
          name: `Ingredients for recipe ${slot.recipeId}`,
          quantity: slot.servings ?? 1,
          unit: "serving",
          section: "other" as StoreSection,
          checked: false,
          recipeIds: [slot.recipeId as string],
        },
      ])
      .filter((item) => !pantryNames.has(item.name.toLowerCase()));

    const groups = items.reduce<Record<string, ShoppingItem[]>>((acc, item) => {
      if (!acc[item.section]) acc[item.section] = [];
      acc[item.section].push(item);
      return acc;
    }, {});

    return Object.entries(groups).map(([section, items]) => ({
      section: section as StoreSection,
      items,
    }));
  }
}
