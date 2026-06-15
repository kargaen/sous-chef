import { GEMINI_BASE_URL, getApiKey } from "../llm/google";

// Pinned image model, mirroring how the text model is pinned (DEFAULT_MODEL).
// Override per-environment via EXPO_PUBLIC_GEMINI_IMAGE_MODEL (see .env).
// Default is gemini-2.5-flash-image ("nano banana"), the free-tier image model;
// the 3.x flash/pro image models are paid and 429 instantly without quota. The
// live smoke test (google.smoke.test.ts) verifies the pinned model responds,
// since the mocked unit tests only check URL construction.
export const DEFAULT_IMAGE_MODEL = "gemini-2.5-flash-image";

const getImageModel = () =>
  process.env.EXPO_PUBLIC_GEMINI_IMAGE_MODEL?.trim() || DEFAULT_IMAGE_MODEL;

export interface ImageGenInput {
  /** Base64 of the source image (no data: prefix). */
  base64: string;
  /** Mime type of the source image, e.g. "image/jpeg". */
  mimeType: string;
  prompt: string;
}

export interface ImageGenResult {
  base64: string;
  mimeType: string;
}

interface InlineDataPart {
  inlineData?: { data?: string; mimeType?: string };
  inline_data?: { data?: string; mime_type?: string };
}

// Gemini returns image parts as camelCase `inlineData` in v1beta responses,
// but tolerate snake_case too.
const extractImagePart = (parts: InlineDataPart[]): ImageGenResult | null => {
  for (const part of parts) {
    const inline = part.inlineData ?? part.inline_data;
    const data = part.inlineData?.data ?? part.inline_data?.data;
    if (inline && data) {
      const mimeType =
        part.inlineData?.mimeType ?? part.inline_data?.mime_type ?? "image/png";
      return { base64: data, mimeType };
    }
  }
  return null;
};

export const generateImage = async (
  input: ImageGenInput,
): Promise<ImageGenResult> => {
  const apiKey = await getApiKey();
  const model = getImageModel();
  const url = `${GEMINI_BASE_URL}/${model}:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        parts: [
          { text: input.prompt },
          { inline_data: { mime_type: input.mimeType, data: input.base64 } },
        ],
      },
    ],
    // Image-generation models require BOTH modalities here; "IMAGE" alone is
    // rejected. The response still carries the image part, which we extract.
    generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    // Keep enough of the body to capture the quota metric + its limit on a 429
    // (e.g. "...-FreeTier ... limit 0"), which tells free-tier-zero apart from a
    // daily cap. The user never sees this — the controller speaks plainly.
    throw new Error(
      `Gemini image request failed (${response.status}): ${detail.slice(0, 800)}`,
    );
  }

  const data = await response.json();
  const parts: InlineDataPart[] = data?.candidates?.[0]?.content?.parts ?? [];
  const image = extractImagePart(parts);

  if (!image) {
    throw new Error("Gemini image response contained no image data.");
  }

  return image;
};
