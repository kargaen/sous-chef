export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  notes?: string;
}

export interface Step {
  order: number;
  instruction: string;
  durationMinutes?: number;
}

export interface Substitution {
  originalIngredientId: string;
  substitute: string;
  reason: string;
}

export interface CookNote {
  id: string;
  recipeId: string;
  body: string;
  createdAt: string;
}

export interface CookLogEntry {
  id: string;
  recipeId: string;
  cookedAt: string;
  // Overall "how happy are you" score for this cook (1–5). Undefined when the
  // cook was logged but the reflection was skipped. Dimension scores live in
  // Rating rows; averageRating is derived from these overall scores.
  overallScore?: number;
}

export interface Rating {
  id: string;
  cookLogId: string;
  categoryId: string;
  score: number;
}

// No UI surfaces RatingCategory yet. Rating.categoryId references this row.
export interface RatingCategory {
  id: string;
  recipeId: string;
  label: string;
  displayOrder: number;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  categoryId?: string | null;
  parentId?: string | null;
  servings: number;
  prepMinutes: number;
  cookMinutes: number;
  ingredients: Ingredient[];
  steps: Step[];
  chefsNotes?: string;
  tags: string[];
  season?: string;
  estimatedCost?: number;
  // Local file URI of the recipe's photo (durable app-directory path), if any.
  imageUri?: string;
  // True once the photo has been through AI cleanup, so the UI can hide the
  // "Enhance" action for an already-enhanced image.
  imageEnhanced?: boolean;
  createdDate: string;
  lastUpdatedDate: string;
}

export interface RecipeWithStats extends Recipe {
  timesCooked?: number;
  lastCookedDate?: string | null;
  averageRating?: number | null;
  // Body of the most recent cook note, for the recipe page "LATEST" card.
  latestCookNote?: string | null;
}
