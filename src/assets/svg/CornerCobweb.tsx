import { Image } from "expo-image";

export function CornerCobweb() {
  return (
    <Image
      source={require("./corner-cobweb.svg")}
      style={{ width: "100%", height: "100%" }}
      contentFit="contain"
    />
  );
}
