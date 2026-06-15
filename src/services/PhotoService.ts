import * as FileSystem from "expo-file-system/legacy";

import { generateImage } from "../models/api/image/googleImage";
import { PHOTO_CLEANUP_PROMPT } from "../prompts/photoCleanup";

// Recipe photos live in a dedicated, durable app directory so they survive
// cache clears (unlike the temp URIs the image picker returns).
const PHOTOS_DIR = `${FileSystem.documentDirectory}recipe-photos/`;

const createId = (): string =>
  `photo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const extFromMime = (mimeType: string): string => {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  return "jpg";
};

const mimeFromUri = (uri: string): string => {
  const ext = uri.split(".").pop()?.split("?")[0]?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
};

const ensureDir = async (): Promise<void> => {
  const info = await FileSystem.getInfoAsync(PHOTOS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(PHOTOS_DIR, { intermediates: true });
  }
};

export const PhotoService = {
  // Copy a picked image into the durable photos directory; returns the new URI.
  async persistPickedImage(sourceUri: string): Promise<string> {
    await ensureDir();
    const ext = sourceUri.split(".").pop()?.split("?")[0] || "jpg";
    const dest = `${PHOTOS_DIR}${createId()}.${ext}`;
    await FileSystem.copyAsync({ from: sourceUri, to: dest });
    return dest;
  },

  // Write generated base64 image data to a file; returns the new URI.
  async saveBase64Image(base64: string, mimeType: string): Promise<string> {
    await ensureDir();
    const dest = `${PHOTOS_DIR}${createId()}.${extFromMime(mimeType)}`;
    await FileSystem.writeAsStringAsync(dest, base64, { encoding: "base64" });
    return dest;
  },

  // Run a stored photo through the AI cleanup and save the result as a new
  // file. Returns the new URI; the caller decides whether to replace the old.
  async cleanupPhoto(uri: string): Promise<string> {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: "base64",
    });
    const result = await generateImage({
      base64,
      mimeType: mimeFromUri(uri),
      prompt: PHOTO_CLEANUP_PROMPT,
    });
    return this.saveBase64Image(result.base64, result.mimeType);
  },

  async deleteImage(uri: string): Promise<void> {
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch {
      // Best-effort cleanup; a leftover file is not worth failing over.
    }
  },
};
