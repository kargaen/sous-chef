import type { RatingCategory } from "../models/types";

export interface RatingDimension {
  id: string;
  label: string;
  source: "fixed" | "generated";
}

// Always-present dimensions every recipe is rated on, regardless of dish.
// Ids are stable strings so Rating.categoryId references survive across cooks
// and never collide with generated (DB-row-id) categories.
export const FIXED_RATING_DIMENSIONS: RatingDimension[] = [
  { id: "fixed:taste", label: "Taste", source: "fixed" },
];

// Hard cap on generated dimensions so the reflection screen never crowds.
export const MAX_GENERATED_DIMENSIONS = 3;

export const RatingDimensionsService = {
  // The full dimension list for a recipe: fixed dimensions first, then the
  // recipe's generated ones. With no generated categories this returns just
  // the fixed set — the intended fallback when generation is absent or failed.
  resolve(generated: RatingCategory[]): RatingDimension[] {
    return [
      ...FIXED_RATING_DIMENSIONS,
      ...generated.map((category) => ({
        id: category.id,
        label: category.label,
        source: "generated" as const,
      })),
    ];
  },

  // Parse the LLM's generated-dimensions response into clean, capped labels.
  // Tolerant of fences/commentary; returns [] on anything unparseable so the
  // caller falls back to fixed dimensions only.
  parseGenerated(content: string): string[] {
    const start = content.indexOf("[");
    const end = content.lastIndexOf("]");
    if (start === -1 || end <= start) return [];

    try {
      const parsed: unknown = JSON.parse(content.slice(start, end + 1));
      if (!Array.isArray(parsed)) return [];

      return parsed
        .filter((item): item is string => typeof item === "string")
        .map((label) => label.trim())
        .filter((label) => label.length > 0 && label.length <= 40)
        .slice(0, MAX_GENERATED_DIMENSIONS);
    } catch {
      return [];
    }
  },
};
