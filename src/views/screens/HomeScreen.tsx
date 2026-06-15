import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { type ReactNode, useRef } from "react";
import {
  Animated,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, spacing } from "@/constants";
import { DiscoverFeed } from "@/views/components/discover";
import type { DiscoverFeedHandle } from "@/views/components/discover";
import {
  COOK_OR_CREATE_CARD_ID,
  CookOrCreateCard,
  HomeBriefingHeader,
  HomeCardSkeleton,
  IN_SEASON_CARD_ID,
  InSeasonCard,
  TODAYS_MENU_CARD_ID,
  TodaysMenuCard,
  USE_IT_UP_CARD_ID,
  UseItUpCard,
  useHomeFeed,
} from "@/views/components/home";
import { screenStyles, textStyles } from "@/views/styles";

import { styles } from "./HomeScreen.styles";

// How far past the bottom the cook must pull before releasing conjures fresh
// ideas. Tuned by feel — refine on device (G.2).
const PULL_THRESHOLD = 88;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const feed = useHomeFeed();

  // Pull-to-load (G.2): the gesture lives here on the scroller; the action lives
  // in DiscoverFeed's controller, reached through its imperative handle.
  const discoverRef = useRef<DiscoverFeedHandle>(null);
  const overshoot = useRef(new Animated.Value(0)).current;
  const armed = useRef(false);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const pulled = Math.max(
      0,
      contentOffset.y + layoutMeasurement.height - contentSize.height,
    );
    overshoot.setValue(pulled);
    armed.current = pulled >= PULL_THRESHOLD;
  };

  const onScrollEndDrag = () => {
    if (!armed.current) return;
    armed.current = false;
    discoverRef.current?.generateRandom();
  };

  const pullStyle = {
    opacity: overshoot.interpolate({
      inputRange: [0, PULL_THRESHOLD],
      outputRange: [0, 1],
      extrapolate: "clamp" as const,
    }),
    transform: [
      {
        scale: overshoot.interpolate({
          inputRange: [0, PULL_THRESHOLD],
          outputRange: [0.7, 1],
          extrapolate: "clamp" as const,
        }),
      },
    ],
  };

  const cardById: Record<string, ReactNode> = {
    [COOK_OR_CREATE_CARD_ID]: (
      <CookOrCreateCard vm={feed.cookOrCreate} hint={feed.hints[COOK_OR_CREATE_CARD_ID]} />
    ),
    [IN_SEASON_CARD_ID]: (
      <InSeasonCard vm={feed.inSeason} hint={feed.hints[IN_SEASON_CARD_ID]} />
    ),
    [USE_IT_UP_CARD_ID]: (
      <UseItUpCard vm={feed.useItUp} hint={feed.hints[USE_IT_UP_CARD_ID]} />
    ),
    [TODAYS_MENU_CARD_ID]: (
      <TodaysMenuCard vm={feed.todaysMenu} hint={feed.hints[TODAYS_MENU_CARD_ID]} />
    ),
  };

  return (
    <ScrollView
      style={screenStyles.screen}
      contentContainerStyle={[
        screenStyles.scrollContent,
        { paddingTop: insets.top + spacing.md },
      ]}
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
      onScroll={onScroll}
      onScrollEndDrag={onScrollEndDrag}
    >
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={textStyles.eyebrow}>Sous Chef</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open settings"
            onPress={() => router.push("/settings")}
            hitSlop={8}
            style={styles.gearButton}
          >
            <Feather name="settings" size={22} color={colors.text.secondary} />
          </Pressable>
        </View>

        <HomeBriefingHeader feed={feed} />
      </View>

      {feed.loading
        ? [0, 1, 2].map((index) => <HomeCardSkeleton key={`skeleton-${index}`} />)
        : feed.order.map((id) => <View key={id}>{cardById[id]}</View>)}

      <DiscoverFeed ref={discoverRef} />

      <Animated.View style={[styles.pullIndicator, pullStyle]}>
        <Feather name="arrow-up" size={20} color={colors.text.muted} />
        <Text style={styles.pullText}>Release to conjure something new</Text>
      </Animated.View>
    </ScrollView>
  );
}
