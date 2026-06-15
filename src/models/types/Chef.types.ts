export type SkillLevel = "beginner" | "home cook" | "confident" | "advanced";

export interface Preference {
  dietary: string[];
  dislikedIngredients: string[];
  cuisinePreferences: string[];
}

export interface HabitSnapshot {
  id: string;
  chefId: string;
  event: string;
  recordedAt: string;
}

export interface ChefProfile {
  id: string;
  name: string;
  skillLevel: SkillLevel;
  preferences: Preference;
  region: string;
  currency: string;
  createdAt: string;
}
