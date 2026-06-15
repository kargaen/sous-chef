// Deterministic, zero-token briefing line for the landing page. Sous Chef's
// presiding greeting, derived from the top-ranked card and the time of day.
// LLM enrichment (subtle hints) layers on top later and is non-blocking; this
// line always works offline.

export type HomeBriefingContext =
  | { kind: "empty" }
  | { kind: "create" }
  | { kind: "recipe" }
  | { kind: "seasonal-recipe" }
  | { kind: "in-season"; produce?: string | null };

const dayPartGreeting = (now: Date): string => {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 22) return "Good evening";
  return "Still up";
};

export const buildHomeBriefing = (
  context: HomeBriefingContext,
  name?: string | null,
  now: Date = new Date(),
): string => {
  const greeting = dayPartGreeting(now);
  const opener = name?.trim() ? `${greeting}, ${name.trim()}.` : `${greeting}.`;

  switch (context.kind) {
    case "seasonal-recipe":
      return `${opener} I found a recipe that makes the most of what's in season — want a look?`;
    case "recipe":
      return `${opener} I've pulled a recipe to get us going whenever you're ready.`;
    case "create":
      return `${opener} Your kitchen's a blank canvas — shall we add your first recipe?`;
    case "in-season":
      return context.produce
        ? `${opener} ${context.produce} is at its best right now — a good place to start.`
        : `${opener} There's lovely produce in season right now.`;
    case "empty":
    default:
      return `${opener} What shall we cook today?`;
  }
};
