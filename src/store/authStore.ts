import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";

type AuthStatus = "idle" | "authenticated" | "unauthenticated";

interface AuthState {
  session: Session | null;
  user: User | null;
  status: AuthStatus;
  lastBackupAt: string | null;
  setSession: (session: Session | null) => void;
  setLastBackupAt: (timestamp: string) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  session: null,
  user: null,
  status: "idle",
  lastBackupAt: null,

  setSession: (session) =>
    set({
      session,
      user: session?.user ?? null,
      status: session ? "authenticated" : "unauthenticated",
    }),

  setLastBackupAt: (timestamp) => set({ lastBackupAt: timestamp }),

  clearSession: () => set({ session: null, user: null, status: "unauthenticated" }),
}));
