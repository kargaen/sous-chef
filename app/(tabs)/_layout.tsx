import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";

import { colors, typography } from "@/constants";

// Reserve room on the right of the bar for the floating chat launcher
// (AssistantShell) so it reads as a final nav slot without overlapping the last
// tab. Tune alongside the launcher's size/position.
const LAUNCHER_TAB_BAR_RESERVE = 72;

type FeatherName = ComponentProps<typeof Feather>["name"];

const tabIcon = (name: FeatherName) => {
  function TabBarIcon({ color, size }: { color: string; size: number }) {
    return <Feather name={name} size={size} color={color} />;
  }

  return TabBarIcon;
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand.terracotta,
        tabBarInactiveTintColor: colors.text.muted,
        tabBarLabelStyle: {
          fontSize: typography.size.xs,
          fontWeight: typography.weight.medium,
        },
        tabBarStyle: { paddingRight: LAUNCHER_TAB_BAR_RESERVE },
      }}
      backBehavior="history"
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Home", tabBarIcon: tabIcon("home") }}
      />
      <Tabs.Screen
        name="recipes"
        options={{ title: "Recipes", tabBarIcon: tabIcon("book-open") }}
      />
      <Tabs.Screen
        name="pantry"
        options={{ title: "Pantry", tabBarIcon: tabIcon("archive") }}
      />
      <Tabs.Screen
        name="plan"
        options={{ title: "Plan", tabBarIcon: tabIcon("calendar") }}
      />
    </Tabs>
  );
}
