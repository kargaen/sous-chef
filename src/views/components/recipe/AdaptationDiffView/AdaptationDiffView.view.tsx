import { Text, View } from "react-native";

import type { AdaptationResponse, Recipe } from "@/models/types";

import {
  buildIngredientDiffRows,
  buildStepDiffRows,
  type DiffRow,
} from "./AdaptationDiffView.hooks";
import { styles } from "./AdaptationDiffView.styles";

export interface AdaptationDiffViewProps {
  recipe: Recipe;
  response: AdaptationResponse;
}

const MARKERS: Record<DiffRow["kind"], string> = {
  added: "+",
  removed: "−",
  unchanged: " ",
};

function DiffSection({ label, rows }: { label: string; rows: DiffRow[] }) {
  if (rows.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {rows.map((row) => (
        <View
          key={row.id}
          style={[
            styles.row,
            row.kind === "added" ? styles.rowAdded : null,
            row.kind === "removed" ? styles.rowRemoved : null,
          ]}
        >
          <Text
            style={[
              styles.marker,
              row.kind === "added" ? styles.markerAdded : null,
              row.kind === "removed" ? styles.markerRemoved : null,
              row.kind === "unchanged" ? styles.markerUnchanged : null,
            ]}
          >
            {MARKERS[row.kind]}
          </Text>
          <Text
            style={[
              styles.rowText,
              row.kind === "added" ? styles.rowTextAdded : null,
              row.kind === "removed" ? styles.rowTextRemoved : null,
              row.kind === "unchanged" ? styles.rowTextUnchanged : null,
            ]}
          >
            {row.text}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function AdaptationDiffView({ recipe, response }: AdaptationDiffViewProps) {
  const ingredientRows = buildIngredientDiffRows(recipe, response);
  const stepRows = buildStepDiffRows(recipe, response);

  return (
    <View style={styles.container}>
      <DiffSection label="Ingredients" rows={ingredientRows} />
      <DiffSection label="Steps" rows={stepRows} />
    </View>
  );
}
