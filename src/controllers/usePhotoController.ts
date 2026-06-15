import { useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";

import { RecipeRepository } from "@/models/repositories/RecipeRepository";
import type { Recipe } from "@/models/types";
import { PhotoService } from "@/services/PhotoService";
import { useSousChefCompanionStore } from "@/store";

const recipeRepository = new RecipeRepository();

// The image API throws a technical Error (status + body) for logs. The cook
// should never see that — translate it to a human line for the speech bubble.
const isQuotaError = (raw: string): boolean =>
  /\b429\b/.test(raw) || /quota/i.test(raw) || /RESOURCE_EXHAUSTED/i.test(raw);

export interface PhotoController {
  imageUri: string | null;
  enhanced: boolean;
  busy: boolean;
  cleaning: boolean;
  error: string | null;
  pickFromLibrary: () => Promise<void>;
  takePhoto: () => Promise<void>;
  cleanupPhoto: () => Promise<void>;
  removePhoto: () => Promise<void>;
}

export function usePhotoController(
  recipe: Recipe | null,
  onChange?: (imageUri: string | null) => void,
): PhotoController {
  const [imageUri, setImageUri] = useState<string | null>(
    recipe?.imageUri ?? null,
  );
  const [enhanced, setEnhanced] = useState<boolean>(
    recipe?.imageEnhanced ?? false,
  );
  const [busy, setBusy] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const showCompanion = useSousChefCompanionStore((state) => state.showCompanion);

  const recipeId = recipe?.id;
  // Keep local state in sync when the active recipe/variant changes.
  useEffect(() => {
    setImageUri(recipe?.imageUri ?? null);
    setEnhanced(recipe?.imageEnhanced ?? false);
  }, [recipeId, recipe?.imageUri, recipe?.imageEnhanced]);

  // `isEnhanced` is only meaningful when there's an image; a fresh pick resets
  // it to false, the AI cleanup sets it to true.
  const applyImage = async (
    nextUri: string | null,
    isEnhanced: boolean,
  ): Promise<void> => {
    if (!recipe) return;
    const nextEnhanced = nextUri ? isEnhanced : false;
    await recipeRepository.save({
      ...recipe,
      imageUri: nextUri ?? undefined,
      imageEnhanced: nextUri ? nextEnhanced : undefined,
    });
    setImageUri(nextUri);
    setEnhanced(nextEnhanced);
    onChange?.(nextUri);
  };

  const pickFromLibrary = async (): Promise<void> => {
    if (!recipe || busy) return;
    setError(null);
    setBusy(true);
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError("Photo library access is needed to add a photo.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const persisted = await PhotoService.persistPickedImage(
        result.assets[0].uri,
      );
      await applyImage(persisted, false);
    } catch {
      setError("Could not add the photo.");
    } finally {
      setBusy(false);
    }
  };

  const takePhoto = async (): Promise<void> => {
    if (!recipe || busy) return;
    setError(null);
    setBusy(true);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setError("Camera access is needed to take a photo.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const persisted = await PhotoService.persistPickedImage(
        result.assets[0].uri,
      );
      await applyImage(persisted, false);
    } catch {
      setError("Could not take the photo.");
    } finally {
      setBusy(false);
    }
  };

  const cleanupPhoto = async (): Promise<void> => {
    if (!imageUri || cleaning) return;
    setError(null);
    setCleaning(true);
    try {
      const previous = imageUri;
      const cleaned = await PhotoService.cleanupPhoto(previous);
      await applyImage(cleaned, true);
      void PhotoService.deleteImage(previous);
    } catch (caught) {
      // Keep the technical detail in the dev log, but speak to the cook through
      // the companion bubble in plain language — never the raw API JSON.
      const raw = caught instanceof Error ? caught.message : String(caught);
      console.warn("[enhance] photo cleanup failed:", raw);
      showCompanion(
        "exhausted",
        isQuotaError(raw)
          ? "Sous Chef has used up the image quota on your Gemini key for now. It resets on Google's schedule — or add a key with more headroom in Settings."
          : "Sous Chef couldn't enhance that photo right now. Give it a moment and try again.",
        { label: "Open settings", route: "/settings?focus=assistant" },
      );
    } finally {
      setCleaning(false);
    }
  };

  const removePhoto = async (): Promise<void> => {
    if (!imageUri || busy) return;
    setBusy(true);
    try {
      const previous = imageUri;
      await applyImage(null, false);
      void PhotoService.deleteImage(previous);
    } catch {
      setError("Could not remove the photo.");
    } finally {
      setBusy(false);
    }
  };

  return {
    imageUri,
    enhanced,
    busy,
    cleaning,
    error,
    pickFromLibrary,
    takePhoto,
    cleanupPhoto,
    removePhoto,
  };
}
