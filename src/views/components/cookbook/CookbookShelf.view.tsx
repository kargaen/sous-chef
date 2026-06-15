import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { radius, spacing, typography } from "@/constants";
import type { Cookbook } from "@/models/types";

type CookbookShelfProps = {
  cookbooks: Cookbook[];
  onOpenCookbook: (id: string) => void;
};

const COOKBOOK_SPINE_TONES = ["#6E7B4B", "#8C4E3B", "#55606A", "#A97B3C"];
const SHELF_COLOR = "#5D4037";
const SHELF_LEDGE_COLOR = "#4E342E";

export function CookbookShelf({
  cookbooks,
  onOpenCookbook,
}: CookbookShelfProps) {
  if (cookbooks.length === 0) {
    return null;
  }

  return (
    <View style={styles.bookshelfRoom}>
      <ScrollView
        horizontal
        style={styles.bookshelfScroll}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.bookshelf}
      >
        {cookbooks.map((book, index) => (
          <Pressable
            key={book.id}
            onPress={() => {
              onOpenCookbook(book.id);
            }}
            style={({ pressed }) => [
              styles.cookbook,
              {
                backgroundColor:
                  COOKBOOK_SPINE_TONES[index % COOKBOOK_SPINE_TONES.length],
                height: index % 3 === 0 ? 170 : index % 2 === 0 ? 190 : 180,
              },
              pressed ? styles.linkPressed : null,
            ]}
          >
            <View style={styles.bookSpineFrame}>
              <Text style={styles.bookTitle} numberOfLines={1}>
                {book.title}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.shelfLedge} />
    </View>
  );
}

const styles = StyleSheet.create({
  bookshelf: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    borderBottomWidth: 12,
    borderBottomColor: SHELF_COLOR,
    minHeight: 220,
  },

  bookshelfRoom: {
    minHeight: 244,
  },

  bookshelfScroll: {
    minHeight: 228,
  },

  cookbook: {
    width: 42,
    marginHorizontal: 1,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },

  linkPressed: {
    opacity: 0.9,
    transform: [{ translateY: -8 }],
  },

  bookSpineFrame: {
    width: "72%",
    height: "85%",
    justifyContent: "center",
    alignItems: "center",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },

  shelfLedge: {
    height: 8,
    marginHorizontal: spacing.md,
    marginTop: 4,
    backgroundColor: SHELF_LEDGE_COLOR,
    opacity: 0.35,
    borderBottomLeftRadius: radius.sm,
    borderBottomRightRadius: radius.sm,
  },

  bookTitle: {
    position: "absolute",
    width: 140,
    fontSize: 12,
    fontWeight: typography.weight.bold,
    color: "#F9F7F1",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 1,
    transform: [{ rotate: "-90deg" }],
  },
});
