import { Text, View } from "react-native";

import { buildHomeBriefing, type HomeBriefingContext } from "@/controllers";
import { useChefProfileStore } from "@/store/chefProfileStore";
import { SousChefMark } from "@/views/components/companion";

import { COOK_OR_CREATE_CARD_ID } from "../CookOrCreateCard";
import { IN_SEASON_CARD_ID } from "../InSeasonCard";
import type { HomeFeedViewModel } from "../useHomeFeed";
import { styles } from "./HomeBriefingHeader.styles";

const resolveContext = (feed: HomeFeedViewModel): HomeBriefingContext => {
  const top = feed.order[0] ?? null;

  if (top === COOK_OR_CREATE_CARD_ID) {
    if (!feed.cookOrCreate.recipe) return { kind: "create" };
    return {
      kind: feed.cookOrCreate.isSeasonal ? "seasonal-recipe" : "recipe",
    };
  }

  if (top === IN_SEASON_CARD_ID) {
    return { kind: "in-season", produce: feed.inSeason.produce[0]?.name ?? null };
  }

  return { kind: "empty" };
};

export interface HomeBriefingHeaderProps {
  feed: HomeFeedViewModel;
  onPressMark?: () => void;
}

export function HomeBriefingHeader({ feed, onPressMark }: HomeBriefingHeaderProps) {
  const name = useChefProfileStore((state) => state.profile?.name);
  const line = buildHomeBriefing(resolveContext(feed), name);

  return (
    <View style={styles.row}>
      <View style={styles.avatar}>
        <SousChefMark size={30} onPress={onPressMark} />
      </View>
      <Text style={styles.line}>{line}</Text>
    </View>
  );
}
