import { View } from "react-native";

import { Skeleton } from "@/views/components/ui";

import { styles } from "./HomeCard.styles";

/**
 * A card-shaped placeholder for the landing feed (no-jump loading). Reuses the
 * HomeCard shell so it occupies the same footprint a real card will, letting
 * the feed swap content in place instead of reflowing as data arrives.
 */
export function HomeCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Skeleton width={64} height={10} />
        <Skeleton width="70%" height={20} />
      </View>
      <View style={styles.body}>
        <Skeleton width="100%" height={12} />
        <Skeleton width="85%" height={12} />
      </View>
    </View>
  );
}
