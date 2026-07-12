## Offline-First Principle

Sous Chef is a kitchen tool — it must work with one hand covered in flour and no signal. The offline-first rules are:

1. All pantry, meal plan, and chef profile data is stored locally in SQLite first.
2. LLM features degrade gracefully: if the API is unreachable, cached suggestions from the last successful session are surfaced instead of an error state.
3. Seasonal data is refreshed weekly and cached; the last successful fetch is always available.
4. Pricing data is refreshed weekly; recipe cost estimates show "~" prefix when using cached data.
5. Supabase sync (if enabled) is background-only and never blocks the UI.
