export interface IngredientCandidate {
  id?: string;
  name: string;
  aliases?: string[];
}

export interface IngredientMatch {
  candidate: IngredientCandidate;
  score: number;
  matchedOn: string;
}

interface MatchIngredientOptions {
  minimumScore?: number;
}

const DEFAULT_ALIASES: Record<string, string> = {
  tomato: "tomatoes",
  tomatos: "tomatoes",
  potato: "potatoes",
  potatos: "potatoes",
  chilli: "chili",
  courgette: "zucchini",
  aubergine: "eggplant",
  coriander: "cilantro",
  scallion: "spring onion",
};

export const normalizeIngredientName = (value: string): string => {
  const lower = value.trim().toLowerCase();

  const withoutAccents = lower.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const withoutPunctuation = withoutAccents.replace(/[^a-z0-9\s]/g, " ");

  const collapsed = withoutPunctuation.replace(/\s+/g, " ").trim();

  return DEFAULT_ALIASES[collapsed] ?? collapsed;
};

export const tokenizeIngredientName = (value: string): string[] => {
  return normalizeIngredientName(value)
    .split(" ")
    .filter((token) => token.length > 0);
};

const levenshteinDistance = (left: string, right: string): number => {
  const matrix: number[][] = Array.from({ length: left.length + 1 }, () =>
    Array.from({ length: right.length + 1 }, () => 0),
  );

  for (let i = 0; i <= left.length; i += 1) {
    matrix[i][0] = i;
  }

  for (let j = 0; j <= right.length; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= left.length; i += 1) {
    for (let j = 1; j <= right.length; j += 1) {
      const substitutionCost = left[i - 1] === right[j - 1] ? 0 : 1;

      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + substitutionCost,
      );
    }
  }

  return matrix[left.length][right.length];
};

const stringSimilarity = (left: string, right: string): number => {
  if (left === right) return 1;
  if (left.length === 0 || right.length === 0) return 0;

  const distance = levenshteinDistance(left, right);
  const longestLength = Math.max(left.length, right.length);

  return 1 - distance / longestLength;
};

const tokenOverlapScore = (left: string[], right: string[]): number => {
  if (left.length === 0 || right.length === 0) return 0;

  const leftSet = new Set(left);
  const rightSet = new Set(right);

  const intersectionSize = [...leftSet].filter((token) =>
    rightSet.has(token),
  ).length;

  const unionSize = new Set([...leftSet, ...rightSet]).size;

  return intersectionSize / unionSize;
};

const scoreCandidateName = (input: string, candidateName: string): number => {
  const normalizedInput = normalizeIngredientName(input);
  const normalizedCandidate = normalizeIngredientName(candidateName);

  if (normalizedInput === normalizedCandidate) return 1;

  const inputTokens = tokenizeIngredientName(input);
  const candidateTokens = tokenizeIngredientName(candidateName);

  const directSimilarity = stringSimilarity(
    normalizedInput,
    normalizedCandidate,
  );

  const overlap = tokenOverlapScore(inputTokens, candidateTokens);

  return Math.max(directSimilarity, overlap);
};

const getCandidateNames = (candidate: IngredientCandidate): string[] => {
  return [candidate.name, ...(candidate.aliases ?? [])];
};

export const matchIngredient = (
  input: string,
  candidates: IngredientCandidate[],
  { minimumScore = 0.72 }: MatchIngredientOptions = {},
): IngredientMatch | null => {
  let bestMatch: IngredientMatch | null = null;

  for (const candidate of candidates) {
    for (const candidateName of getCandidateNames(candidate)) {
      const score = scoreCandidateName(input, candidateName);

      if (!bestMatch || score > bestMatch.score) {
        bestMatch = {
          candidate,
          score,
          matchedOn: candidateName,
        };
      }
    }
  }

  if (!bestMatch || bestMatch.score < minimumScore) {
    return null;
  }

  return bestMatch;
};

export const sortIngredientMatches = (
  input: string,
  candidates: IngredientCandidate[],
): IngredientMatch[] => {
  return candidates
    .flatMap((candidate) =>
      getCandidateNames(candidate).map((candidateName) => ({
        candidate,
        score: scoreCandidateName(input, candidateName),
        matchedOn: candidateName,
      })),
    )
    .sort((left, right) => right.score - left.score);
};
