# Cooking Stats & Recipe Rating Epic

## Purpose

Turn each cook into durable knowledge about a recipe: how it went, how often it's made, when it was last on the stove, and what to remember next time. The recipe page and the recipe list should reflect this lived history, and adaptations should accumulate the same data quietly until promoted.

## Product North Star

- After cooking, the app invites a fast debrief ("How did it go?") — an overall rating, optional fine-grained dimension scores, and a free-text breadcrumb. Skippable, never nagging.
- The recipe page shows the lived stats: times cooked, last cooked, average rating, latest note (matching the COOKED / AVERAGE / LATEST cards in the workspace header).
- The recipe list visually distinguishes a heavily-used staple from one that's been forgotten for a while.
- Variants gather the same data as any recipe but stay hidden from the list until promoted — intentional, consistent with the variants epic.
- Rating dimensions are mostly fixed and hardcoded; a small, capped set of recipe-specific dimensions is generated once at recipe creation, not on every rating.
- A recipe can carry a photo. If it has none, the app invites one, and offers an AI cleanup that turns a phone snap into a tidy, food-app-quality image.

## Guiding Principles

- Stats are derived from a durable cook log, not stored as mutable counters — `timesCooked` / `lastCooked` / `average` are computed from the underlying rows so they can never drift.
- Rating dimensions are decided at creation time and stored; rating a cook never calls the LLM.
- The reflection flow is always skippable; a cook with no rating is still a valid cook (it still increments the count and last-cooked).
- The recipe list visuals are driven by real usage data, replacing the current hardcoded `favorite` / `heavily-used` / `forgotten` tags.
- Photos are optional and additive; the AI cleanup is a convenience, never required to save a recipe.

---

## Theme 1: Cook-Log & Rating Data Model

The `Rating`, `CookLogEntry`, `RatingCategory`, `CookNote`, and `RecipeWithStats` types already exist in `Recipe.types.ts` but have **no persistence, no tables, and no repository**. This theme makes them real.

### Epic CS.1: Persistence foundation

#### Tasks

- [x] Add SQLite tables (`CREATE TABLE IF NOT EXISTS`, additive migration in `StorageService.initializeDatabase`): `cook_logs`, `ratings`, `rating_categories`, `cook_notes`.
- [x] Decide the overall-rating home: an `overallScore` column on `cook_logs` (separate from per-dimension `ratings`), matching the "Overall rating" vs "Dimension ratings" split in the reflection UI.
- [x] Build a `CookLogRepository` with: record a cook, save ratings + note for a cook, fetch logs/notes/categories for a recipe.
- [x] Add a stats deriver: `timesCooked` = count of cook logs, `lastCookedDate` = max `cookedAt`, `averageRating` = mean overall score, latest note = most recent `cook_notes.body`.
- [x] Wire `useRecipeController.markCooked` to actually persist a `CookLogEntry` (today it only records a habit). **Note: `markCooked` is not yet called by any UI — CS.3 must trigger it.**

## Theme 2: Rating Dimensions

### Epic CS.2: Fixed + generated dimensions

#### Tasks

- [x] Define the fixed, hardcoded dimensions (e.g. an always-present "Taste") that apply to every recipe. (`FIXED_RATING_DIMENSIONS` + `RatingDimensionsService.resolve` in `RatingDimensionsService.ts`.)
- [x] Generate a small, **capped** (2–3) set of recipe-specific dimensions at recipe creation/import time (e.g. "Salmon Sear", "Potato Crisp", "Vegetable Doneness"), persisted as `rating_categories` rows for that recipe. (`buildRatingDimensionsPrompt` + `parseGenerated`, fired background from `saveRecipe`.)
- [x] Ensure generation happens once at creation and is reused for every rating — no LLM call when rating. (Idempotent: `generateDimensionsIfMissing` skips when categories already exist.)
- [x] Define fallback when generation fails or returns nothing: the recipe still rates on the fixed dimensions. (`resolve` with no generated rows returns the fixed set.)
- [x] Carry generated dimensions onto variants (a variant inherits its parent's dimensions unless regenerated). (`onSaveVariant` copies the parent's categories to the variant.)

## Theme 3: Post-Cook Reflection Flow

### Epic CS.3: "How did it go?" screen

Matches the first screenshot: REFLECTION header, Overall rating (5 chef-hats), Dimension ratings (fixed + generated), Cook notes breadcrumb, Skip / Save.

#### Tasks

- [x] Build the reflection screen (model/controller/view) reading the recipe's dimensions and writing a cook log + ratings + note. (`ReflectionScreen` + `useReflectionController`.)
- [x] Trigger it at the end of the cooking flow ("Finish cooking" on `CookingScreen` → `/recipe/reflect?id=`). **Recipe-page "rate this cook" entry deferred to CS.4.**
- [x] Implement Skip (records the cook, no rating) and Save (records cook + ratings + note).
- [x] Use the chef-hat rating control consistent with the screenshots (5-hat scale). (`HatRating` UI component.)
- [x] Make every dimension optional ("Only score what feels useful"). (Default 0; only scores > 0 are submitted.)

## Theme 4: Recipe Page Stats Display

### Epic CS.4: COOKED / AVERAGE / LATEST cards

Matches the second screenshot's workspace header cards.

#### Tasks

- [x] Surface `timesCooked` (or "Not yet"), `averageRating` (or "Unrated"), and latest cook note (or "No cook notes yet") on the recipe page. (Cooked / Average / Latest strip via `getRecipeStats`.)
- [~] Show "Updated <date>" and keep the existing Share / Edit / Delete actions. (The current `RecipeScreen` design has no Share/Edit/Delete row — those are from a different recipe-page design in the screenshot. Stats strip added to the existing hero layout instead.)
- [x] Drive everything from the derived stats so it stays correct as cooks accrue. (Stats refetched on focus + active-recipe change.)
- [x] Recipe-page "rate this cook" entry (deferred from CS.3). ("Rate a cook" button under the stats strip → `/recipe/reflect`.)

## Theme 5: Recipe List Usage Sprinkles

### Epic CS.5: Real usage drives the visuals

`RecipeScrapCard` already renders coffee-stain texture for "heavily-used" and has a "forgotten" concept — but they key off hardcoded tags today.

#### Tasks

- [x] Compute "heavily used" from `timesCooked` (threshold) and "forgotten" from `lastCookedDate` (age threshold) instead of the `favorite` / `heavily-used` / `forgotten` tags. (`deriveRecipeUsage`; favorite stays a manual tag.)
- [x] Feed those derived flags into `RecipeScrapCard` (the visual layer already exists; only the data source changes). (Cookbook passes per-recipe stats; card derives stains/cobweb.)
- [x] Decide thresholds (e.g. heavily used ≥ N cooks; forgotten = not cooked in M weeks) and keep them in one place. (`HEAVILY_USED_MIN_COOKS = 5`, `FORGOTTEN_AFTER_DAYS = 60` in `recipeUsage.ts`.)
- [x] Keep variants out of the list (already enforced by `parentId` filtering); their stats live only inside the parent.

## Theme 6: Food Photos

### Epic CS.6: Capture and AI cleanup

#### Tasks

- [x] Add an image field to the `Recipe` model (a local file URI/path; do NOT store image bytes in SQLite). (`Recipe.imageUri` + schema.)
- [x] Invite a photo when a recipe has none (recipe page and/or after a cook). (Dashed "Add a photo" card on the recipe page with Choose/Take photo.)
- [x] Capture from camera or library (needs an Expo image/camera dependency — see Flags). (`usePhotoController` via `expo-image-picker`; persisted by `PhotoService` to a durable dir.)
- [x] Add an "AI cleanup" action that runs the photo through the fixed cleanup prompt (below) and replaces/saves the result. (`PhotoService.cleanupPhoto` → `generateImage` against `DEFAULT_IMAGE_MODEL` (`gemini-2.5-flash-image` / "nano banana", overridable via `EXPO_PUBLIC_GEMINI_IMAGE_MODEL`); controller exposes `cleanupPhoto`.)
- [x] Store and display the chosen image on the recipe page and (optionally) the list card. (Recipe page shows the photo with AI cleanup / Remove; list-card image is an optional later add.)

The fixed cleanup prompt (verbatim, do not paraphrase in the implementation):

> Transform this image into a professional food photograph suitable for an exclusive recipe app. Preserve the precise appearance, texture, and ingredients of the food without altering the dish itself. Remove all visual noise and clutter from the background and replace it with a simple, minimalist, and neutral surface, such as a light linen cloth, a rustic wooden board, or a clean marble countertop. Clean the edges of the serving dish, pan, or plate completely, so that all smudges, burnt-on residue, or spilled sauce are removed. Use soft, natural daylight lighting to create subtle shadows and highlights that make the dish look fresh and inviting. The focus must be sharp on the food, while the background should be kept calm and free of distractions.

---

## Suggested Delivery Order

Persist first, then capture, then display, then enrich.

1. **CS.1 Persistence foundation** — tables, repository, stats deriver, real `markCooked`.
2. **CS.2 Dimensions** — fixed set first; generated dimensions can follow.
3. **CS.3 Reflection flow** — the screen + triggers, writing real data.
4. **CS.4 Recipe page stats** — surface what's now being recorded.
5. **CS.5 List sprinkles** — flip the visuals to real usage data.
6. **CS.6 Photos** — capture first (works today), AI cleanup once image capability lands.

---

## Flags: where the app must be expanded first

### Hard gaps (a feature cannot ship until resolved)

1. **No image generation capability.** The LLM layer (`models/api`) is text-only — no image input/output, no vision, no `inlineData`. The photo "AI cleanup" needs a Gemini image-capable model (e.g. Gemini 2.5 Flash Image) wired into a new API path. Photo *capture/display* can ship without this; the *cleanup* cannot. This is its own integration task.
2. **Stats persistence is entirely greenfield.** No `cook_logs` / `ratings` / `rating_categories` / `cook_notes` tables exist; only the TS types do. CS.1 must create them (additive `CREATE TABLE IF NOT EXISTS` migration is safe) before anything else in this epic functions.

### Soft gaps

3. **No finish-cooking → reflection handoff.** `CookingScreen` ends without prompting a debrief. CS.3 must add that trigger; until then the reflection screen is only reachable manually from the recipe page.
4. **"LLM-based ratings before" no longer exist in code.** There is no current rating-category generation anywhere — treat CS.2 as new work, hooked into the recipe creation/import flow.

### Dependencies to add (per dependency rules — link docs, do not auto-install)

- An Expo camera/image-picker package for CS.6 capture (e.g. `expo-image-picker`). The user installs; the agent verifies after.
- `expo-file-system` (already present in Expo SDK) for storing the image file and path.
