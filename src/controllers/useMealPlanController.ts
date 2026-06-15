import { useState } from "react";
import { MealPlanRepository } from "../models/repositories/MealPlanRepository";
import { ShoppingListRepository } from "../models/repositories/ShoppingListRepository";
import type { WeekPlan } from "../models/types";
import { buildMealPlanningPrompt, buildSystemPrompt } from "../prompts";
import { HabitService } from "../services/HabitService";
import { LLMService } from "../services/LLMService";
import { SeasonalService } from "../services/SeasonalService";
import { useChefProfileStore } from "../store/chefProfileStore";
import { useMealPlanStore } from "../store/mealPlanStore";

const mealPlanRepo = new MealPlanRepository();
const shoppingRepo = new ShoppingListRepository();

export const useMealPlanController = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setActivePlan, setShoppingList } = useMealPlanStore();
  const profile = useChefProfileStore((s) => s.profile);

  const loadPlanForWeek = async (weekStartDate: string): Promise<void> => {
    setLoading(true);
    try {
      const plan = await mealPlanRepo.getByWeek(weekStartDate);
      if (plan) setActivePlan(plan);
    } catch {
      setError("Could not load meal plan.");
    } finally {
      setLoading(false);
    }
  };

  const generatePlan = async (
    pantryItems: { name: string; quantity: number; unit: string }[],
    expiringItems: { name: string; expiryDate?: string }[],
    budgetPeriod: any | null,
    preferences: {
      servingsPerMeal: number;
      maxCookMinutesPerDay: number;
      excludeTags: string[];
    },
  ): Promise<string> => {
    if (!profile) throw new Error("No chef profile loaded.");
    setLoading(true);
    try {
      const prompt = buildMealPlanningPrompt({
        pantryItems,
        expiringItems,
        budgetPeriod,
        month: SeasonalService.getCurrentMonth(),
        region: profile.region,
        ...preferences,
      });

      const response = await LLMService.send({
        system: buildSystemPrompt(profile),
        messages: [{ role: "user", content: prompt }],
      });

      HabitService.record("meal_plan_created");
      return response.content;
    } catch {
      setError("Could not generate meal plan.");
      return "";
    } finally {
      setLoading(false);
    }
  };

  const savePlan = async (plan: WeekPlan): Promise<void> => {
    try {
      await mealPlanRepo.save(plan);
      setActivePlan(plan);
    } catch {
      setError("Could not save meal plan.");
    }
  };

  const deriveShoppingList = async (weekStartDate: string): Promise<void> => {
    try {
      const list = await shoppingRepo.deriveForWeek(weekStartDate);
      setShoppingList(list);
      HabitService.record("shopping_list_viewed");
    } catch {
      setError("Could not derive shopping list.");
    }
  };

  return {
    loadPlanForWeek,
    generatePlan,
    savePlan,
    deriveShoppingList,
    loading,
    error,
  };
};
