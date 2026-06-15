// Fetches a recipe web page on-device and extracts readable text for the LLM
// importer. Prefers structured JSON-LD Recipe data (most recipe sites embed it),
// falling back to stripped page text. Runs on the device, so there is no CORS
// limitation on native (web builds are still subject to CORS — see Findings).

const FETCH_TIMEOUT_MS = 12000;
const MAX_TEXT_LENGTH = 12000;
const MIN_USEFUL_LENGTH = 40;

// A browser-ish UA — some sites refuse non-browser clients. Best-effort; the
// platform may override it.
const BROWSER_UA =
  "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36";

const normalizeUrl = (raw: string): string =>
  /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

const fetchHtml = async (url: string): Promise<string> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
};

// Walk a parsed JSON-LD value looking for a node typed as "Recipe" (handles
// arrays and the common "@graph" wrapper).
const findRecipeNode = (node: unknown): unknown | null => {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findRecipeNode(item);
      if (found) return found;
    }
    return null;
  }

  if (node && typeof node === "object") {
    const record = node as Record<string, unknown>;
    const type = record["@type"];
    const isRecipe =
      type === "Recipe" || (Array.isArray(type) && type.includes("Recipe"));
    if (isRecipe) return record;

    if (record["@graph"]) return findRecipeNode(record["@graph"]);
  }

  return null;
};

const extractJsonLdRecipe = (html: string): string | null => {
  const blocks = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );

  for (const block of blocks) {
    const raw = block[1]?.trim();
    if (!raw) continue;

    try {
      const recipe = findRecipeNode(JSON.parse(raw));
      if (recipe) return JSON.stringify(recipe);
    } catch {
      // Malformed JSON-LD block — skip and try the next one.
    }
  }

  return null;
};

const decodeEntities = (value: string): string =>
  value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"');

const htmlToText = (html: string): string =>
  decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();

export const RecipeImportService = {
  // Throws on network failure, non-OK status, timeout, or a page with no usable
  // content. The caller turns that into a friendly companion message.
  fetchReadableRecipeText: async (url: string): Promise<string> => {
    const html = await fetchHtml(normalizeUrl(url));
    const content = extractJsonLdRecipe(html) ?? htmlToText(html);
    const trimmed = content.slice(0, MAX_TEXT_LENGTH);

    if (trimmed.trim().length < MIN_USEFUL_LENGTH) {
      throw new Error("No readable recipe content found on the page");
    }

    return trimmed;
  },
};
