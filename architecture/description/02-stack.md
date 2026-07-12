## Stack

| Concern     | Choice                              | Notes                                                                          |
| ----------- | ----------------------------------- | ------------------------------------------------------------------------------ |
| Framework   | Expo SDK (managed workflow)         | OTA updates, EAS Build for distribution                                        |
| Routing     | Expo Router (file-based)            | Route groups `(auth)`, `(tabs)` keep navigation paths clean                    |
| Language    | TypeScript (strict)                 | `strict: true` in tsconfig; no `any` in `models/` or `controllers/`            |
| State       | Zustand                             | Lightweight slices; persisted with `zustand/middleware/persist` + AsyncStorage |
| Local DB    | Expo SQLite                         | Pantry, meal plans, budget, and cook history stored offline-first              |
| Remote sync | Supabase (optional)                 | Durable recovery + cross-device sync; app is fully functional without it. `SupabaseService` is the sole `@supabase/supabase-js` import point (auth + snapshot blob upload/fetch); backup/restore ships before incremental sync |
| LLM         | Google Gemini API                   | Prompt assembly in `src/prompts/`; streaming via `LLMService`                  |
| Validation  | Zod                                 | Schemas in `src/models/schemas/`; single source of truth for data shapes       |
| Testing     | Jest + React Native Testing Library | Unit tests mirror the MVC split                                                |

---

