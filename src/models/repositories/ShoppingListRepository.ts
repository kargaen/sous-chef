import type { ListGroup, ShoppingItem, StoreSection } from "../types";
import { MealPlanRepository } from "./MealPlanRepository";
import { PantryRepository } from "./PantryRepository";
import { RecipeRepository } from "./RecipeRepository";

// Heuristic section assignment — good enough for a shopping list.
// Extend or swap for a canonical ingredient database later.
const categorize = (name: string): StoreSection => {
  const lower = name.toLowerCase();
  if (/milk|cheese|cream|butter|yogurt|yoghurt|egg|feta|cheddar|mozzarella/.test(lower)) return "dairy";
  if (/chicken|beef|pork|lamb|fish|salmon|tuna|shrimp|prawn|meat|mince|sausage|bacon|turkey|duck/.test(lower)) return "meat";
  if (/bread|flour|pasta|rice|noodle|oat|tortilla|couscous|quinoa/.test(lower)) return "bakery";
  if (/frozen|pea|corn|ice cream/.test(lower)) return "frozen";
  if (/salt|pepper|oil|olive oil|vinegar|sauce|stock|tin|can|jar|spice|cinnamon|cumin|paprika|herb|bay|thyme|oregano|basil|chili|garlic|onion|ginger|mustard|soy|honey|sugar|flour|baking/.test(lower)) return "pantry";
  return "produce";
};

export class ShoppingListRepository {
  private mealPlanRepo = new MealPlanRepository();
  private pantryRepo = new PantryRepository();
  private recipeRepo = new RecipeRepository();

  // Derive the shopping list scoped to specific dates within the given plan.
  // If `dates` is omitted, all plan slots are included.
  async deriveForDates(weekStartDate: string, dates?: string[]): Promise<ListGroup[]> {
    const plan = await this.mealPlanRepo.getByWeek(weekStartDate);
    if (!plan) return [];

    const dateSet = dates ? new Set(dates) : null;
    const scoped = dateSet
      ? plan.slots.filter((s) => dateSet.has(s.date))
      : plan.slots;

    const pantryItems = await this.pantryRepo.getAll();
    const pantryNames = new Set(pantryItems.map((p) => p.name.toLowerCase()));

    // ingredient name (lower) → aggregated ShoppingItem
    const aggregated = new Map<string, ShoppingItem>();

    for (const slot of scoped) {
      if (!slot.recipeId) continue;

      const recipe = await this.recipeRepo.fetchById(slot.recipeId);
      if (!recipe) continue;

      // Tier-0 linear scale: multiply amounts by slot servings / recipe base servings.
      const multiplier =
        slot.servings != null && recipe.servings > 0
          ? slot.servings / recipe.servings
          : 1;

      for (const ingredient of recipe.ingredients) {
        const key = ingredient.name.toLowerCase().trim();
        const scaledQty = ingredient.quantity * multiplier;

        const existing = aggregated.get(key);
        if (existing) {
          existing.quantity += scaledQty;
          if (!existing.recipeIds.includes(slot.recipeId)) {
            existing.recipeIds.push(slot.recipeId);
          }
        } else {
          aggregated.set(key, {
            id: `item-${key.replace(/\s+/g, "-")}`,
            name: ingredient.name,
            quantity: scaledQty,
            unit: ingredient.unit,
            section: categorize(ingredient.name),
            checked: false,
            recipeIds: [slot.recipeId],
          });
        }
      }
    }

    // Remove anything the cook already has in their pantry.
    const items = [...aggregated.values()].filter(
      (item) => !pantryNames.has(item.name.toLowerCase().trim()),
    );

    // Group by store section and return in a stable order.
    const SECTION_ORDER: StoreSection[] = [
      "produce", "meat", "dairy", "bakery", "frozen", "pantry", "other",
    ];
    const grouped = new Map<StoreSection, ShoppingItem[]>();
    for (const item of items) {
      const bucket = grouped.get(item.section) ?? [];
      bucket.push(item);
      grouped.set(item.section, bucket);
    }

    return SECTION_ORDER.filter((s) => grouped.has(s)).map((section) => ({
      section,
      items: grouped.get(section) ?? [],
    }));
  }

  // Convenience: derive for the whole plan week (no date filter).
  async deriveForWeek(weekStartDate: string): Promise<ListGroup[]> {
    return this.deriveForDates(weekStartDate);
  }
}
