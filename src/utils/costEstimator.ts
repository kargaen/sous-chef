export type CostUnit = "g" | "kg" | "ml" | "l" | "unit" | "piece" | "pcs";

export interface IngredientCostInput {
  name: string;
  quantity: number;
  unit: CostUnit;
  unitPrice: number;
  priceUnit: CostUnit;
}

export interface IngredientCostEstimate {
  name: string;
  quantity: number;
  unit: CostUnit;
  estimatedCost: number;
  estimated: boolean;
}

export interface RecipeCostEstimate {
  total: number;
  estimated: boolean;
  lines: IngredientCostEstimate[];
}

const MASS_FACTORS_TO_GRAMS: Partial<Record<CostUnit, number>> = {
  g: 1,
  kg: 1000,
};

const VOLUME_FACTORS_TO_MILLILITERS: Partial<Record<CostUnit, number>> = {
  ml: 1,
  l: 1000,
};

const UNIT_FACTORS_TO_EACH: Partial<Record<CostUnit, number>> = {
  unit: 1,
  piece: 1,
  pcs: 1,
};

const convertWithinGroup = (
  quantity: number,
  from: CostUnit,
  to: CostUnit,
  factors: Partial<Record<CostUnit, number>>,
): number | null => {
  const fromFactor = factors[from];
  const toFactor = factors[to];

  if (!fromFactor || !toFactor) return null;

  return (quantity * fromFactor) / toFactor;
};

export const convertCostQuantity = (
  quantity: number,
  from: CostUnit,
  to: CostUnit,
): number | null => {
  if (from === to) return quantity;

  return (
    convertWithinGroup(quantity, from, to, MASS_FACTORS_TO_GRAMS) ??
    convertWithinGroup(quantity, from, to, VOLUME_FACTORS_TO_MILLILITERS) ??
    convertWithinGroup(quantity, from, to, UNIT_FACTORS_TO_EACH)
  );
};

export const estimateIngredientCost = (
  ingredient: IngredientCostInput,
): IngredientCostEstimate => {
  const convertedQuantity = convertCostQuantity(
    ingredient.quantity,
    ingredient.unit,
    ingredient.priceUnit,
  );

  if (convertedQuantity === null) {
    return {
      name: ingredient.name,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
      estimatedCost: 0,
      estimated: true,
    };
  }

  return {
    name: ingredient.name,
    quantity: ingredient.quantity,
    unit: ingredient.unit,
    estimatedCost: convertedQuantity * ingredient.unitPrice,
    estimated: false,
  };
};

export const estimateRecipeCost = (
  ingredients: IngredientCostInput[],
): RecipeCostEstimate => {
  const lines = ingredients.map(estimateIngredientCost);

  const total = lines.reduce((sum, line) => sum + line.estimatedCost, 0);

  return {
    total,
    estimated: lines.some((line) => line.estimated),
    lines,
  };
};

export const roundCost = (value: number): number => {
  if (!Number.isFinite(value)) return 0;

  return Math.round(value * 100) / 100;
};
