import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, spacing, typography } from "@/constants";
import { useCookbookController, useRecipeController } from "@/controllers";
import type { RecipeCookStats } from "@/models/repositories";
import type { Cookbook, Recipe } from "@/models/types";
import { CookbookShelf } from "@/views/components/cookbook/CookbookShelf.view";
import { RecipeScrapCard } from "@/views/components/recipe/RecipeScrapCard";
import { Button, TextField } from "@/views/components/ui";
import { cardStyles, screenStyles, textStyles } from "@/views/styles";

const getCookbookHref = (id: string) => {
  return {
    pathname: "/recipes/[id]" as const,
    params: { id },
  };
};

const getRecipeHref = (id: string) => {
  return {
    pathname: "/recipe/[id]" as const,
    params: { id },
  };
};

const getNewRecipeHref = (cookbookId: string | null) => {
  return cookbookId
    ? ({
        pathname: "/recipes/new" as const,
        params: { cookbookId },
      })
    : ({
        pathname: "/recipes/new" as const,
      });
};

const normalizeCategoryId = (
  categoryId: string | null | undefined,
): string | null => {
  return categoryId && categoryId.trim().length > 0 ? categoryId : null;
};

export default function CookbookScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const currentCookbookId =
    typeof params.id === "string" && params.id.length > 0 ? params.id : null;

  const {
    getAllCookbooks,
    createCookbook,
    updateCookbook,
    deleteCookbook,
    loading,
  } = useCookbookController();
  const { getSaved, getRecipeStats } = useRecipeController();
  const getSavedRef = useRef(getSaved);
  getSavedRef.current = getSaved;
  const getRecipeStatsRef = useRef(getRecipeStats);
  getRecipeStatsRef.current = getRecipeStats;
  const insets = useSafeAreaInsets();

  const [cookbooks, setCookbooks] = useState<Cookbook[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [recipeStats, setRecipeStats] = useState<Record<string, RecipeCookStats>>(
    {},
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddingCookbook, setIsAddingCookbook] = useState(false);
  const [newCookbookTitle, setNewCookbookTitle] = useState("");
  const [newCookbookDescription, setNewCookbookDescription] = useState("");
  const [isEditingCookbook, setIsEditingCookbook] = useState(false);
  const [editCookbookTitle, setEditCookbookTitle] = useState("");
  const [editCookbookDescription, setEditCookbookDescription] = useState("");
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const loadShelf = useCallback(async () => {
    setErrorText(null);

    try {
      const [loadedCookbooks, loadedRecipes] = await Promise.all([
        getAllCookbooks(),
        getSavedRef.current(),
      ]);

      setCookbooks(loadedCookbooks);
      setRecipes(loadedRecipes);

      const statsMap: Record<string, RecipeCookStats> = {};
      loadedRecipes.forEach((recipe) => {
        statsMap[recipe.id] = getRecipeStatsRef.current(recipe.id);
      });
      setRecipeStats(statsMap);
    } catch (error) {
      setErrorText(
        error instanceof Error
          ? error.message
          : "Unable to load recipes right now.",
      );
    }
  }, [getAllCookbooks]);

  // Reload on focus so newly saved recipes and fresh cook stats appear when
  // returning to the shelf (e.g. after reflecting on a cook).
  useFocusEffect(
    useCallback(() => {
      void loadShelf();
    }, [loadShelf]),
  );

  const currentCookbook = useMemo(() => {
    if (!currentCookbookId) {
      return null;
    }

    return (
      cookbooks.find((cookbook) => cookbook.id === currentCookbookId) ?? null
    );
  }, [cookbooks, currentCookbookId]);

  const parentCookbookId = normalizeCategoryId(currentCookbook?.parentId);
  const parentCookbook = useMemo(() => {
    if (!parentCookbookId) {
      return null;
    }

    return (
      cookbooks.find((cookbook) => cookbook.id === parentCookbookId) ?? null
    );
  }, [cookbooks, parentCookbookId]);
  const isNestedCookbook = currentCookbookId !== null;
  const activeCookbookId = currentCookbook?.id ?? null;

  useEffect(() => {
    setIsEditingCookbook(false);
    setIsConfirmingDelete(false);
    setEditCookbookTitle(currentCookbook?.title ?? "");
    setEditCookbookDescription(currentCookbook?.description ?? "");
  }, [
    currentCookbook?.description,
    currentCookbook?.id,
    currentCookbook?.title,
  ]);

  const visibleCookbooks = useMemo(() => {
    return cookbooks.filter(
      (cookbook) => normalizeCategoryId(cookbook.parentId) === activeCookbookId,
    );
  }, [activeCookbookId, cookbooks]);

  const visibleRecipes = useMemo(() => {
    const scopedRecipes = recipes.filter(
      (recipe) => normalizeCategoryId(recipe.categoryId) === activeCookbookId,
    );
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return scopedRecipes;
    }

    return scopedRecipes.filter((recipe) => {
      const titleMatch = recipe.title.toLowerCase().includes(query);
      const descriptionMatch = recipe.description.toLowerCase().includes(query);

      return titleMatch || descriptionMatch;
    });
  }, [activeCookbookId, recipes, searchQuery]);

  const closeAddCookbookForm = () => {
    setIsAddingCookbook(false);
    setNewCookbookTitle("");
    setNewCookbookDescription("");
  };

  const openEditCookbookForm = () => {
    if (!currentCookbook) {
      return;
    }

    setEditCookbookTitle(currentCookbook.title);
    setEditCookbookDescription(currentCookbook.description ?? "");
    setIsConfirmingDelete(false);
    setIsEditingCookbook(true);
  };

  const closeEditCookbookForm = () => {
    setIsEditingCookbook(false);
    setEditCookbookTitle(currentCookbook?.title ?? "");
    setEditCookbookDescription(currentCookbook?.description ?? "");
  };

  const handleSaveCookbookDraft = async () => {
    if (!currentCookbook) {
      return;
    }

    const title = editCookbookTitle.trim();

    if (!title) {
      setErrorText("Give the cookbook a title before saving.");
      return;
    }

    try {
      setErrorText(null);
      await updateCookbook(currentCookbook.id, {
        title,
        description: editCookbookDescription.trim() || undefined,
      });
      await loadShelf();
      setIsEditingCookbook(false);
    } catch (error) {
      setErrorText(
        error instanceof Error
          ? error.message
          : "Unable to update cookbook right now.",
      );
    }
  };

  const handleDeleteCookbookDraft = async () => {
    if (!currentCookbook) {
      return;
    }

    try {
      setErrorText(null);
      await deleteCookbook(currentCookbook.id);
      setIsConfirmingDelete(false);
      setIsEditingCookbook(false);

      if (parentCookbookId) {
        router.push(getCookbookHref(parentCookbookId));
        return;
      }

      router.push("/recipes");
    } catch (error) {
      setErrorText(
        error instanceof Error
          ? error.message
          : "Unable to delete cookbook right now.",
      );
    }
  };

  const handleAddCookbook = async () => {
    const title = newCookbookTitle.trim();

    if (!title) {
      setErrorText("Give the cookbook a title before adding it.");
      return;
    }

    setErrorText(null);

    try {
      await createCookbook({
        title,
        description: newCookbookDescription.trim() || undefined,
        parentId: currentCookbookId,
      });

      await loadShelf();
      closeAddCookbookForm();
    } catch (error) {
      setErrorText(
        error instanceof Error
          ? error.message
          : "Unable to create cookbook right now.",
      );
    }
  };

  return (
    <ScrollView
      style={screenStyles.screen}
      contentContainerStyle={[
        screenStyles.scrollContent,
        { paddingTop: insets.top + spacing.md },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={screenStyles.header}>
        <Text style={textStyles.eyebrow}>Sous Chef</Text>
        <Text style={textStyles.screenTitleCompact}>
          {currentCookbook?.title ?? "Recipes"}
        </Text>
        {currentCookbook ? (
          currentCookbook.description ? (
            <Text style={textStyles.description}>
              {currentCookbook.description}
            </Text>
          ) : null
        ) : (
          <Text style={textStyles.description}>
            Decide what&apos;s on the menu, revisit your most trusted dishes,
            and keep your best ideas ready for the stove.
          </Text>
        )}

        {currentCookbook ? (
          <View style={styles.manageActions}>
            <Pressable
              onPress={() => {
                if (isEditingCookbook) {
                  closeEditCookbookForm();
                  return;
                }

                openEditCookbookForm();
              }}
              style={({ pressed }) => [
                styles.manageActionButton,
                pressed ? styles.manageActionPressed : null,
              ]}
            >
              <Text style={styles.manageActionText}>
                {isEditingCookbook ? "Hide form" : "Edit details"}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setIsEditingCookbook(false);
                setIsConfirmingDelete((current) => !current);
              }}
              style={({ pressed }) => [
                styles.manageActionButton,
                styles.manageActionDanger,
                pressed ? styles.manageActionPressed : null,
              ]}
            >
              <Text style={styles.manageActionDangerText}>
                {isConfirmingDelete ? "Keep it" : "Delete"}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {errorText ? (
          <Text style={textStyles.errorText}>{errorText}</Text>
        ) : null}

        {currentCookbook && isEditingCookbook ? (
          <View style={styles.manageCard}>
            <View style={styles.manageCardHeader}>
              <Text style={styles.manageCardTitle}>Edit cookbook</Text>
            </View>

            <TextField
              label="Cookbook title"
              value={editCookbookTitle}
              onChangeText={setEditCookbookTitle}
              placeholder="Bread, Comfort Food, Parties..."
              autoCapitalize="words"
              autoCorrect={false}
            />

            <TextField
              label="Description"
              value={editCookbookDescription}
              onChangeText={setEditCookbookDescription}
              placeholder="Optional note about what lives in this book"
              autoCapitalize="sentences"
              autoCorrect
            />

            <View style={styles.manageCardActions}>
              <Button
                label="Save"
                size="sm"
                onPress={() => {
                  void handleSaveCookbookDraft();
                }}
                disabled={editCookbookTitle.trim().length === 0}
              />
              <Button
                label="Cancel"
                size="sm"
                variant="ghost"
                onPress={closeEditCookbookForm}
              />
            </View>
          </View>
        ) : null}

        {currentCookbook && isConfirmingDelete ? (
          <View style={styles.manageCard}>
            <View style={styles.manageCardHeader}>
              <Text style={styles.manageCardTitle}>Delete cookbook</Text>
              <Text style={styles.manageCardCopy}>
                {parentCookbook
                  ? `Any recipes in the cookbook will get transferred to the ${parentCookbook.title} cookbook.`
                  : "Any recipes will be saved in the Recipes home screen."}
              </Text>
            </View>

            <View style={styles.manageCardActions}>
              <Button
                label="Delete cookbook"
                size="sm"
                variant="ghost"
                onPress={() => {
                  void handleDeleteCookbookDraft();
                }}
              />
              <Button
                label="Keep it"
                size="sm"
                variant="secondary"
                onPress={() => {
                  setIsConfirmingDelete(false);
                }}
              />
            </View>
          </View>
        ) : null}

        <View style={screenStyles.actionsRowTight}>
          {isNestedCookbook ? (
            <Button
              label="Back"
              variant="secondary"
              onPress={() => {
                if (parentCookbookId) {
                  router.push(getCookbookHref(parentCookbookId));
                  return;
                }

                router.push("/recipes");
              }}
            />
          ) : null}
          <Button
            label={isAddingCookbook ? "Hide form" : "New book"}
            onPress={() => {
              if (isAddingCookbook) {
                closeAddCookbookForm();
                return;
              }

              setIsAddingCookbook(true);
            }}
          />
        </View>
      </View>

      <View style={styles.section}>
        {isAddingCookbook ? (
          <View style={styles.addBookCard}>
            <View style={styles.addBookHeader}>
              <Text style={styles.addBookTitle}>Add cookbook</Text>
              <Text style={styles.addBookCopy}>
                Start a new book on your shelf and gather related recipes in one
                place.
              </Text>
            </View>

            <TextField
              label="Cookbook title"
              value={newCookbookTitle}
              onChangeText={setNewCookbookTitle}
              placeholder="Bread, Comfort Food, Parties..."
              autoCapitalize="words"
              autoCorrect={false}
            />

            <TextField
              label="Description"
              value={newCookbookDescription}
              onChangeText={setNewCookbookDescription}
              placeholder="Optional note about what lives in this book"
              autoCapitalize="sentences"
              autoCorrect
            />

            <View style={styles.addBookActions}>
              <Button
                label="Add"
                onPress={() => {
                  void handleAddCookbook();
                }}
                loading={loading}
                disabled={newCookbookTitle.trim().length === 0}
              />
              <Button
                label="Cancel"
                size="sm"
                variant="ghost"
                onPress={closeAddCookbookForm}
              />
            </View>
          </View>
        ) : null}

        <CookbookShelf
          cookbooks={visibleCookbooks}
          onOpenCookbook={(id) => {
            router.push(getCookbookHref(id));
          }}
        />
      </View>

      <View style={styles.section}>
        <TextField
          label="Find recipes"
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search your shelf..."
        />
      </View>

      <View style={screenStyles.actionsRowTight}>
        <Button
          label="New recipe"
          onPress={() => {
            router.push(getNewRecipeHref(activeCookbookId));
          }}
        />
      </View>

      {visibleRecipes.length > 0 ? (
        <View style={styles.section}>
          <Text style={textStyles.sectionTitle}>Recipe Scraps</Text>

          {visibleRecipes.map((recipe, index) => (
            <RecipeScrapCard
              key={recipe.id}
              recipe={recipe}
              index={index}
              timesCooked={recipeStats[recipe.id]?.timesCooked}
              lastCookedDate={recipeStats[recipe.id]?.lastCookedDate}
              onPress={() => {
                router.push(getRecipeHref(recipe.id));
              }}
            />
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },

  addBookCard: {
    ...cardStyles.base,
    backgroundColor: colors.background.card,
  },

  addBookHeader: {
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },

  addBookTitle: {
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },

  addBookCopy: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text.secondary,
  },

  addBookActions: {
    marginTop: spacing.lg,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },

  manageActions: {
    marginTop: spacing.sm,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },

  manageActionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },

  manageActionDanger: {
    backgroundColor: "rgba(140, 78, 59, 0.08)",
    borderColor: "rgba(140, 78, 59, 0.18)",
  },

  manageActionPressed: {
    opacity: 0.8,
  },

  manageActionText: {
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
  },

  manageActionDangerText: {
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    fontWeight: typography.weight.semibold,
    color: "#8C4E3B",
  },

  manageCard: {
    ...cardStyles.base,
    backgroundColor: colors.background.card,
  },

  manageCardHeader: {
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },

  manageCardTitle: {
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },

  manageCardCopy: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.text.secondary,
  },

  manageCardActions: {
    marginTop: spacing.lg,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
});
