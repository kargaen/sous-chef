import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";

import { useRecipeController } from "@/controllers";
import type { Ingredient } from "@/models/types";
import { useSafeBack } from "@/views/hooks/useSafeBack";

// Inverse of the controller's parseIngredientLine: a bare "1 item" ingredient
// shows as just its name so the text stays clean and round-trips on save.
const formatIngredientLine = (ingredient: Ingredient): string =>
  ingredient.unit === "item" && ingredient.quantity === 1
    ? ingredient.name
    : `${ingredient.quantity} ${ingredient.unit} ${ingredient.name}`;

const numberToInput = (value: number | undefined): string =>
  typeof value === "number" && value > 0 ? String(value) : "";

const parsePositiveInt = (value: string, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
};

const parseNonNegativeInt = (value: string): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0;
};

export const useEditRecipeScreenView = () => {
  const params = useLocalSearchParams<{ id?: string }>();
  const recipeId = typeof params.id === "string" ? params.id : "";
  const { fetchById, activeRecipe, saveRecipeEdits, loading, error } =
    useRecipeController();
  const goBack = useSafeBack();

  const fetchByIdRef = useRef(fetchById);
  fetchByIdRef.current = fetchById;
  const loadedIdRef = useRef<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [servings, setServings] = useState("");
  const [prepMinutes, setPrepMinutes] = useState("");
  const [cookMinutes, setCookMinutes] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [ingredientsText, setIngredientsText] = useState("");
  const [stepsText, setStepsText] = useState("");
  const [chefsNotes, setChefsNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const original =
    recipeId && activeRecipe?.id === recipeId ? activeRecipe : null;

  useEffect(() => {
    if (recipeId) void fetchByIdRef.current(recipeId);
  }, [recipeId]);

  // Seed the form once, when the recipe first arrives.
  useEffect(() => {
    if (!original || loadedIdRef.current === original.id) return;
    loadedIdRef.current = original.id;
    setTitle(original.title);
    setDescription(original.description);
    setServings(numberToInput(original.servings));
    setPrepMinutes(numberToInput(original.prepMinutes));
    setCookMinutes(numberToInput(original.cookMinutes));
    setEstimatedCost(numberToInput(original.estimatedCost));
    setIngredientsText(
      original.ingredients.map(formatIngredientLine).join("\n"),
    );
    setStepsText(original.steps.map((step) => step.instruction).join("\n"));
    setChefsNotes(original.chefsNotes ?? "");
  }, [original]);

  const handleSave = async () => {
    if (!original) return;
    setSaving(true);
    const trimmedCost = estimatedCost.trim();
    const parsedCost = trimmedCost ? Number(trimmedCost) : undefined;
    const result = await saveRecipeEdits(original, {
      title,
      description,
      servings: parsePositiveInt(servings, 1),
      prepMinutes: parseNonNegativeInt(prepMinutes),
      cookMinutes: parseNonNegativeInt(cookMinutes),
      estimatedCost:
        parsedCost != null && Number.isFinite(parsedCost) && parsedCost >= 0
          ? parsedCost
          : undefined,
      ingredientsText,
      stepsText,
      chefsNotes,
    });
    setSaving(false);
    if (result) goBack();
  };

  return {
    ready: !!original,
    recipe: original,
    loading: loading && !original,
    notFound: !loading && recipeId !== "" && !original,
    title,
    setTitle,
    description,
    setDescription,
    servings,
    setServings,
    prepMinutes,
    setPrepMinutes,
    cookMinutes,
    setCookMinutes,
    estimatedCost,
    setEstimatedCost,
    ingredientsText,
    setIngredientsText,
    stepsText,
    setStepsText,
    chefsNotes,
    setChefsNotes,
    saving,
    error,
    handleSave,
    handleCancel: goBack,
  };
};
