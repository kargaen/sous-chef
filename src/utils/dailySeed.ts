// Daily freshness seed for the landing page. A single integer that is stable
// within a calendar day and changes at the user's local midnight, so the page
// feels new each morning but never reshuffles within a session.
//
// Used two ways:
//   - as the `seed` for `rankHomeCards` tie-breaking (LP.0a)
//   - by cards to pick *which* suggestion to show (e.g. which saved recipe),
//     via `seededPick`, so the choice is day-stable instead of random.

export const getDailySeed = (now: Date = new Date()): number =>
  now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();

// Deterministic index into a list of the given length for a seed. Returns -1
// for an empty list.
export const seededIndex = (length: number, seed: number): number => {
  if (length <= 0) return -1;
  const mixed = Math.abs(Math.imul(seed ^ 0x9e3779b9, 2654435761));
  return mixed % length;
};

// Deterministically pick one item from a list for a seed. `salt` lets two
// cards drawing from similar lists on the same day make different picks.
export const seededPick = <T>(
  items: T[],
  seed: number,
  salt = 0,
): T | null => {
  const index = seededIndex(items.length, seed + salt);
  return index >= 0 ? items[index] : null;
};
