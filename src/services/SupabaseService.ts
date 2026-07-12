import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";

const SNAPSHOT_TABLE = "user_snapshots";

let cachedClient: SupabaseClient | null = null;

// Lazy singleton: the app must stay fully functional without Supabase
// configured (offline-first principle), so a missing/invalid env var must
// only fail the specific call that needs it, not crash on import.
const getClient = (): SupabaseClient => {
  if (cachedClient) {
    return cachedClient;
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "SupabaseService is not configured: set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  cachedClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

  return cachedClient;
};

const wrapSupabaseError = (operation: string, error: unknown): Error => {
  const message = error instanceof Error ? error.message : String(error);
  return new Error(`SupabaseService ${operation} failed: ${message}`);
};

export const SupabaseService = {
  signUp: async (email: string, password: string): Promise<Session | null> => {
    try {
      const { data, error } = await getClient().auth.signUp({ email, password });

      if (error) {
        throw error;
      }

      return data.session;
    } catch (error) {
      throw wrapSupabaseError("signUp", error);
    }
  },

  signIn: async (email: string, password: string): Promise<Session | null> => {
    try {
      const { data, error } = await getClient().auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      return data.session;
    } catch (error) {
      throw wrapSupabaseError("signIn", error);
    }
  },

  // Re-fires the sign-up confirmation mail for a pending account. The grace
  // period lives in the caller (useAuthController) — this is just the seam.
  resendSignUpConfirmation: async (email: string): Promise<void> => {
    try {
      const { error } = await getClient().auth.resend({
        type: "signup",
        email,
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      throw wrapSupabaseError("resendSignUpConfirmation", error);
    }
  },

  signOut: async (): Promise<void> => {
    try {
      const { error } = await getClient().auth.signOut();

      if (error) {
        throw error;
      }
    } catch (error) {
      throw wrapSupabaseError("signOut", error);
    }
  },

  getSession: async (): Promise<Session | null> => {
    try {
      const { data, error } = await getClient().auth.getSession();

      if (error) {
        throw error;
      }

      return data.session;
    } catch (error) {
      throw wrapSupabaseError("getSession", error);
    }
  },

  onAuthStateChange: (callback: (session: Session | null) => void) => {
    const {
      data: { subscription },
    } = getClient().auth.onAuthStateChange((_event, session) => {
      callback(session);
    });

    return subscription;
  },

  uploadSnapshot: async (userId: string, snapshotJson: string): Promise<void> => {
    try {
      const { error } = await getClient()
        .from(SNAPSHOT_TABLE)
        .upsert({
          user_id: userId,
          data: snapshotJson,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        throw error;
      }
    } catch (error) {
      throw wrapSupabaseError("uploadSnapshot", error);
    }
  },

  fetchSnapshot: async (userId: string): Promise<string | null> => {
    try {
      const { data, error } = await getClient()
        .from(SNAPSHOT_TABLE)
        .select("data")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return (data?.data as string | undefined) ?? null;
    } catch (error) {
      throw wrapSupabaseError("fetchSnapshot", error);
    }
  },
};
