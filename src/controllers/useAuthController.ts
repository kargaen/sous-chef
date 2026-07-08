import { useState } from "react";
import { SupabaseService } from "../services/SupabaseService";
import { useAuthStore } from "../store/authStore";

export const useAuthController = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { session, user, status, setSession, clearSession } = useAuthStore();

  const signUp = async (email: string, password: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const newSession = await SupabaseService.signUp(email, password);
      setSession(newSession);
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

  return {
    session,
    user,
    status,
    signUp,
    signIn,
    signOut,
    loading,
    error,
  };
};
