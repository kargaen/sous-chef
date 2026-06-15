import { StorageService } from "@/services/StorageService";

// Light "not for me" memory (epic R.2). When the cook dismisses an idea with the
// corner ✕, we remember its title so generation can avoid suggesting the same
// thing again. Deliberately tiny: a capped, most-recent-first ring of titles —
// not a learning archive. The gating on the `learnFromChats` setting lives in
// the layer that calls this; the store itself is dumb persistence.

const DISMISSAL_STORAGE_KEY = "discover_dismissal_signals";

// Keep the memory small so it can only ever be a gentle bias on generation.
const MAX_SIGNALS = 24;

interface DismissalSignal {
  title: string;
  at: string;
}

const isSignal = (value: unknown): value is DismissalSignal =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as Record<string, unknown>).title === "string" &&
  typeof (value as Record<string, unknown>).at === "string";

const parseSignals = (raw: string | null): DismissalSignal[] => {
  if (raw === null) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isSignal) : [];
  } catch {
    return [];
  }
};

export class DismissalRepository {
  // Record a dismissed idea by title. De-dupes case-insensitively (most recent
  // wins) and keeps only the newest MAX_SIGNALS so the memory can't grow.
  async record(title: string): Promise<void> {
    const trimmed = title.trim();
    if (trimmed.length === 0) return;

    const raw = await StorageService.storageGetItem(DISMISSAL_STORAGE_KEY);
    const existing = parseSignals(raw).filter(
      (signal) => signal.title.toLowerCase() !== trimmed.toLowerCase(),
    );

    const next = [{ title: trimmed, at: new Date().toISOString() }, ...existing]
      .slice(0, MAX_SIGNALS);

    await StorageService.storageSetItem(
      DISMISSAL_STORAGE_KEY,
      JSON.stringify(next),
    );
  }

  // Most-recently-dismissed titles first, capped by the caller's limit.
  async getRecentTitles(limit: number = MAX_SIGNALS): Promise<string[]> {
    const raw = await StorageService.storageGetItem(DISMISSAL_STORAGE_KEY);
    return parseSignals(raw)
      .slice(0, Math.max(0, limit))
      .map((signal) => signal.title);
  }

  // Forget everything — used when the cook turns learning off.
  async clear(): Promise<void> {
    await StorageService.storageRemoveItem(DISMISSAL_STORAGE_KEY);
  }
}
