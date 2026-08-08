import { Pressable, Text, View } from "react-native";

import { Button } from "@/views/components/ui";

import { useRecipeActionsMenu } from "./RecipeActionsMenu.hooks";
import { styles } from "./RecipeActionsMenu.styles";
import type { RecipeActionsMenuItem } from "./RecipeActionsMenu.types";

interface RecipeActionsMenuProps {
  items: RecipeActionsMenuItem[];
}

// Trigger and menu are siblings rather than nested: the trigger sits in the
// hero action row, and the full-width menu wraps onto the line beneath it.
export function RecipeActionsMenu({ items }: RecipeActionsMenuProps) {
  const { open, select, toggle } = useRecipeActionsMenu(items);

  if (items.length === 0) return null;

  return (
    <>
      <Button
        label="⋮"
        variant="secondary"
        accessibilityLabel="More recipe actions"
        onPress={toggle}
        style={styles.trigger}
      />

      {open ? (
        <View style={styles.menu}>
          {items.map((item, index) => (
            <Pressable
              key={item.label}
              accessibilityRole="button"
              onPress={() => select(item)}
              style={({ pressed }) => [
                styles.item,
                index === items.length - 1 ? styles.itemLast : null,
                pressed ? styles.itemPressed : null,
              ]}
            >
              <Text
                style={[
                  styles.itemLabel,
                  item.destructive ? styles.itemLabelDestructive : null,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </>
  );
}
