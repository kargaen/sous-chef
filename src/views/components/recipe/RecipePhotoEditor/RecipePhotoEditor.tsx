import { Image } from "expo-image";
import { Text, View } from "react-native";

import { usePhotoController } from "@/controllers";
import type { Recipe } from "@/models/types";
import { Button } from "@/views/components/ui";

import { styles } from "./RecipePhotoEditor.styles";

interface RecipePhotoEditorProps {
  recipe: Recipe | null;
  heading?: string;
  subheading?: string;
}

// Shared photo manager for the Edit form and the post-cook reflection screen:
// add / replace / remove a dish photo and run the AI cleanup. The "Enhance"
// action hides once the photo has already been enhanced. Rendered with
// expo-image, which handles freshly-written local file URIs reliably.
export function RecipePhotoEditor({
  recipe,
  heading = "Photo",
  subheading,
}: RecipePhotoEditorProps) {
  const photo = usePhotoController(recipe);

  if (!recipe) return null;

  return (
    <View style={styles.container}>
      {heading ? <Text style={styles.heading}>{heading}</Text> : null}
      {subheading ? <Text style={styles.subheading}>{subheading}</Text> : null}

      {photo.imageUri ? (
        <View style={styles.frame}>
          <Image
            source={{ uri: photo.imageUri }}
            style={styles.image}
            contentFit="cover"
          />
          {photo.cleaning ? (
            <View style={styles.overlay}>
              <Text style={styles.overlayText}>Enhancing…</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.buttonRow}>
        <Button
          label={photo.imageUri ? "Replace photo" : "Add photo"}
          variant="secondary"
          loading={photo.busy}
          onPress={() => {
            void photo.pickFromLibrary();
          }}
          style={styles.button}
        />
        <Button
          label="Take photo"
          variant="ghost"
          disabled={photo.busy}
          onPress={() => {
            void photo.takePhoto();
          }}
          style={styles.button}
        />
      </View>

      {photo.imageUri ? (
        <>
          <View style={styles.buttonRow}>
            {!photo.enhanced ? (
              <Button
                label="Enhance"
                variant="secondary"
                disabled
                onPress={() => {}}
                style={styles.button}
              />
            ) : null}
            <Button
              label="Remove"
              variant="ghost"
              disabled={photo.busy || photo.cleaning}
              onPress={() => {
                void photo.removePhoto();
              }}
              style={styles.button}
            />
          </View>
          {!photo.enhanced ? (
            <Text style={styles.subheading}>Photo enhancement is coming soon.</Text>
          ) : null}
        </>
      ) : null}

      {photo.error ? <Text style={styles.error}>{photo.error}</Text> : null}
    </View>
  );
}
