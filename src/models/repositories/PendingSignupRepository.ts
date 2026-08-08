import { StorageService } from "@/services/StorageService";

// Persists the "signed up, confirmation mail not yet clicked" state so it
// survives restarts (EPIC-006 flow 2). Transient controller state alone loses
// this on every launch, which would re-ask an already-signed-up user to sign
// up again. Cleared when a sign-in succeeds; replaced when the user signs up
// with a different email.

const PENDING_SIGNUP_KEY = "pending_signup";

export interface PendingSignup {
  email: string;
  // ISO timestamp of the most recent confirmation mail (initial sign-up or
  // resend) — drives the resend grace period.
  lastSentAt: string;
}

const isPendingSignup = (value: unknown): value is PendingSignup =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as Record<string, unknown>).email === "string" &&
  typeof (value as Record<string, unknown>).lastSentAt === "string";

export class PendingSignupRepository {
  async get(): Promise<PendingSignup | null> {
    const raw = await StorageService.storageGetItem(PENDING_SIGNUP_KEY);
    if (raw === null) return null;

    try {
      const parsed: unknown = JSON.parse(raw);
      return isPendingSignup(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  async save(pending: PendingSignup): Promise<void> {
    await StorageService.storageSetItem(
      PENDING_SIGNUP_KEY,
      JSON.stringify(pending),
    );
  }

  async clear(): Promise<void> {
    await StorageService.storageRemoveItem(PENDING_SIGNUP_KEY);
  }
}
