import { useLocalSearchParams } from "expo-router";

import CookingScreen from "../../src/views/screens/CookingScreen";

export default function CookRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CookingScreen recipeId={id ?? ""} />;
}
