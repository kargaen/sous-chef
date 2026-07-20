## Stack

| Concern     | Choice                              | Notes                                                                          |
| ----------- | ----------------------------------- | ------------------------------------------------------------------------------ |
| Framework   | Expo SDK (managed workflow)         | OTA updates, EAS Build for distribution                                        |
| Routing     | Expo Router (file-based)            | Route groups `(auth)`, `(tabs)` keep navigation paths clean                    |
| Language    | TypeScript (strict)                 | `strict: true` in tsconfig; no `any` in `models/` or `controllers/`            |
| State       | Zustand                             | Lightweight slices; persisted with `zustand/middleware/persist` + AsyncStorage |
| Local DB    | Expo SQLite                         | Pantry, meal plans, budget, and cook history stored offline-first              |
| Remote sync | Supabase (optional)                 | Shipped (PR #4): email/password auth + whole-snapshot backup/restore. `SupabaseService` is the sole `@supabase/supabase-js` import point; app is fully functional without it. Incremental sync is EPIC-002 |
| DB migrations | Supabase CLI via GitHub Actions   | `supabase/migrations/` applied by the `migrate-db` job in both release workflows before any build |
| LLM         | Google Gemini API                   | Prompt assembly in `src/prompts/`; streaming via `LLMService`. Anthropic/OpenAI adapters exist without a decided role — see EPIC-005 |
| Validation  | Zod                                 | Schemas in `src/models/schemas/`; single source of truth for data shapes       |
| Native date input | React Native DateTimePicker 8.4.4 | Expo-compatible platform date picker; registered as an Expo config plugin and first used by EPIC-013 |
| Testing     | Jest + React Native Testing Library | Unit tests mirror the MVC split                                                |

### Release process

Versioning is owner-dictated via `package.json` (EPIC-008):

- **RC channel** — `package.json` carries the next target as a pre-release, e.g.
  `1.0.2-rc.0`, set with `npm version prepatch|preminor|premajor --preid rc`.
  Pushes to `dev` (and manual `workflow_dispatch`) build `rc-android.yml`, which
  publishes the `v{base}-rc` pre-release (suffix stripped), fresh-dated each run.
  A guard fails the RC loudly, before spending an EAS build, if a stable
  `v{base}` release already exists — the signal to bump the version.
- **Stable release** — merging `dev` → `master` runs `release-android.yml`, which
  tags the `-rc`-stripped base `v{base}`, then deletes the superseded `v{base}-rc`.
- CI never rewrites `package.json`; the RC guard is the post-release reminder to bump.
- Both workflows apply Supabase migrations (`migrate-db`) before building.

---
