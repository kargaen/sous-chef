import { Pressable, Text, View } from "react-native";

import { CornerCobweb } from "@/assets/svg/CornerCobweb";
import type { Recipe } from "@/models/types";

import { useRecipeScrapCardView } from "./RecipeScrapCard.hooks";
import { styles } from "./RecipeScrapCard.styles";

type RecipeScrapCardProps = {
  recipe: Recipe;
  index: number;
  onPress?: () => void;
  timesCooked?: number;
  lastCookedDate?: string | null;
};

function BinderHoles() {
  return (
    <View style={styles.binderColumn}>
      {[0, 1, 2, 3].map((holeIndex) => (
        <View key={holeIndex} style={styles.holeOuter}>
          <View style={styles.holeInner} />
        </View>
      ))}
    </View>
  );
}

function WashiTape() {
  return <View style={styles.tape} />;
}

export function RecipeScrapCard({
  recipe,
  index,
  onPress,
  timesCooked,
  lastCookedDate,
}: RecipeScrapCardProps) {
  const {
    cardRotation,
    footerText,
    isFavoriteRecipe,
    isForgottenRecipe,
    recipeMeta,
    stains,
  } = useRecipeScrapCardView({
    recipe,
    index,
    timesCooked,
    lastCookedDate,
  });

  return (
    <View style={styles.cardContainer}>
      <WashiTape />

      <Pressable
        onPress={onPress}
        disabled={!onPress}
        style={({ pressed }) => [
          styles.recipePaper,
          isFavoriteRecipe ? styles.recipePaperFavorite : null,
          { transform: [{ rotate: cardRotation }] },
          pressed && onPress ? styles.recipePaperPressed : null,
        ]}
      >
        <BinderHoles />

        {stains.map((stain, stainIndex) => (
          <View
            key={`${recipe.id}-stain-${stainIndex}`}
            style={[
              styles.stain,
              {
                top: stain.top,
                left: stain.left,
                width: stain.width,
                height: stain.height,
                opacity: stain.opacity,
                backgroundColor: stain.backgroundColor,
                borderTopLeftRadius: stain.borderTopLeftRadius,
                borderTopRightRadius: stain.borderTopRightRadius,
                borderBottomLeftRadius: stain.borderBottomLeftRadius,
                borderBottomRightRadius: stain.borderBottomRightRadius,
                transform: [
                  { translateX: stain.translateX },
                  { translateY: stain.translateY },
                  { rotate: stain.rotate },
                  { skewX: stain.skewX },
                  { skewY: stain.skewY },
                  { scaleX: stain.scaleX },
                  { scaleY: stain.scaleY },
                ],
              },
            ]}
          />
        ))}

        {isForgottenRecipe ? (
          <View style={styles.cobwebContainer}>
            <CornerCobweb />
          </View>
        ) : null}

        <View style={styles.contentPadding}>
          <View style={styles.recipePaperHeader}>
            <Text style={styles.recipePaperTitle}>{recipe.title}</Text>
            {isFavoriteRecipe ? (
              <Text style={styles.recipePaperStar}>{"\u2605"}</Text>
            ) : null}
          </View>

          <Text style={styles.recipePaperDescription}>{recipe.description}</Text>

          <View style={styles.recipeMetaRow}>
            {recipeMeta.map((meta) => (
              <View key={`${recipe.id}-${meta}`} style={styles.recipeMetaChip}>
                <Text style={styles.recipeMetaChipText}>{meta}</Text>
              </View>
            ))}
          </View>

          <View style={styles.recipePaperFooter}>
            <Text style={styles.recipePaperFooterText}>{footerText}</Text>
          </View>
        </View>
      </Pressable>
    </View>
  );
}
