import { useState } from "react";
import type { Ingredient, Recipe } from "../models/types";
import { buildSubstitutionPrompt, buildSystemPrompt } from "../prompts";
import { HabitService } from "../services/HabitService";
import { LLMService } from "../services/LLMService";
import { useChefProfileStore } from "../store/chefProfileStore";
import { usePantryStore } from "../store/pantryStore";

export const useSubstitutionController = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const profile = useChefProfileStore((s) => s.profile);
  const pantryItems = usePantryStore((s) => s.items);

  const getSuggestion = async (
    missingIngredient: Ingredient,
    recipe: Recipe,
  ): Promise<void> => {
    if (!profile) return;
    setLoading(true);
    setSuggestion(null);
    try {
      const prompt = buildSubstitutionPrompt({
        missingIngredient,
        recipe,
        availablePantryItems: pantryItems.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          unit: i.unit,
        })),
      });

      const response = await LLMService.send({
        system: buildSystemPrompt(profile),
        messages: [{ role: "user", content: prompt }],
      });

      setSuggestion(response.content);
      HabitService.record("recipe_saved");
    } catch {
      setError("Could not get substitution suggestion.");
    } finally {
      setLoading(false);
    }
  };

  return { getSuggestion, suggestion, loading, error };
};
