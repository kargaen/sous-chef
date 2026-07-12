import { useEffect, useState } from "react";
import {
  PendingSignupRepository,
  type PendingSignup,
} from "../models/repositories/PendingSignupRepository";
import { SupabaseService } from "../services/SupabaseService";
import { useAuthStore } from "../store/authStore";

// Grace period between confirmation-mail sends (EPIC-006 flow 3). Supabase's
// own resend cooldown is ~60s; this sits safely above it so the button can
// never spam the system or the user.
export const RESEND_GRACE_MS = 5 * 60 * 1000;

const pendingRepo = new PendingSignupRepository();

export const useAuthController = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // With "Confirm email" enabled on the Supabase project, signUp succeeds but
  // returns no session until the user clicks the confirmation link. The
  // pending state is persisted (EPIC-006 flow 2) so a restart doesn't re-ask
  // an already-signed-up user to sign up again.
  const [pendingSignup, setPendingSignup] = useState<PendingSignup | null>(null);
  const { session, user, status, setSession, clearSession } = useAuthStore();

  useEffect(() => {
    let active = true;

    void pendingRepo.get().then((pending) => {
      if (active) {
        setPendingSignup(pending);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const clearPending = async (): Promise<void> => {
    await pendingRepo.clear();
    setPendingSignup(null);
  };

  const signUp = async (email: string, password: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const newSession = await SupabaseService.signUp(email, password);
      setSession(newSession);

      if (newSession) {
        await clearPending();
      } else {
        const pending: PendingSignup = {
          email,
          lastSentAt: new Date().toISOString(),
        };
        await pendingRepo.save(pending);
        setPendingSignup(pending);
      }
    } catch {
      setError("Could not create account.");
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const newSession = await SupabaseService.signIn(email, password);
      setSession(newSession);

      if (newSession) {
        await clearPending();
      }
    } catch {
      setError("Could not sign in.");
    } finally {
      setLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      await SupabaseService.signOut();
      clearSession();
    } catch {
      setError("Could not sign out.");
    } finally {
      setLoading(false);
    }
  };

  const resendConfirmation = async (): Promise<void> => {
    if (!pendingSignup) {
      return;
    }

    const elapsed = Date.now() - new Date(pendingSignup.lastSentAt).getTime();
    if (elapsed < RESEND_GRACE_MS) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await SupabaseService.resendSignUpConfirmation(pendingSignup.email);
      const updated: PendingSignup = {
        email: pendingSignup.email,
        lastSentAt: new Date().toISOString(),
      };
      await pendingRepo.save(updated);
      setPendingSignup(updated);
    } catch {
      setError("Could not resend the confirmation mail.");
    } finally {
      setLoading(false);
    }
  };

  return {
    session,
    user,
    status,
    pendingSignup,
    pendingConfirmation: pendingSignup !== null,
    signUp,
    signIn,
    signOut,
    resendConfirmation,
    loading,
    error,
  };
};
