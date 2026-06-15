import { create } from "zustand";

export interface RecipeDraftFields {
  title: string;
  ingredientsText: string;
  stepsText: string;
  notes: string;
  cookbookId: string | null;
  servings?: number;
  prepMinutes?: number;
  cookMinutes?: number;
  estimatedCost?: number;
}

interface RecipeDraftState {
  draft: RecipeDraftFields | null;
  setDraft: (draft: RecipeDraftFields) => void;
  updateDraft: (partial: Partial<RecipeDraftFields>) => void;
  clearDraft: () => void;
}

export const useRecipeDraftStore = create<RecipeDraftState>()((set) => ({
  draft: null,
  setDraft: (draft) => set({ draft }),
  updateDraft: (partial) =>
    set((state) =>
      state.draft ? { draft: { ...state.draft, ...partial } } : state,
    ),
  clearDraft: () => set({ draft: null }),
}));
