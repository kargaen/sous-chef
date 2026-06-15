# Sous Chef — Architecture

### Expo · React Native · TypeScript · Zustand · SQLite · Anthropic API · MVC

---

## Mission

See [README.md](./README.md) for the full mission statement and product overview.

Every architectural decision should serve this mission. The app must feel warm and opinionated, not mechanical. The LLM is a collaborator embedded throughout — not a chatbot bolted on the side.

---

## Architecture Philosophy

Sous Chef uses a strict three-layer MVC split, adapted to the idioms of React Native and Expo:

| Layer          | Where it lives     | Responsibility                                                                                  |
| -------------- | ------------------ | ----------------------------------------------------------------------------------------------- |
| **Model**      | `src/models/`      | Shape of data — TypeScript interfaces, Zod schemas, API clients, repositories                   |
| **View**       | `src/views/`       | Pure presentation — React Native components that receive props and emit callbacks, nothing else |
| **Controller** | `src/controllers/` | Business logic — custom hooks that orchestrate models, drive view state, and call services      |

**Services** (`src/services/`) sit beneath the controller layer and handle all side effects: LLM API calls, SQLite reads/writes, AsyncStorage, device locale, and pricing lookups. Controllers call services; views never do.

**Prompts** (`src/prompts/`) are first-class citizens. LLM prompt templates encode Sous Chef's personality and reasoning patterns. They are versioned alongside business logic, not buried as strings inside a service.

**The nudge philosophy is architectural.** `HabitService` _observes_ cook behaviour silently. `NudgeService` _decides_ when and what to surface. `useConversationController` _delivers_ it. These three concerns are deliberately separated so that the "nudges rather than dictates" principle is enforced at the code boundary level, not just in product intent.

---

## Stack

| Concern     | Choice                              | Notes                                                                          |
| ----------- | ----------------------------------- | ------------------------------------------------------------------------------ |
| Framework   | Expo SDK (managed workflow)         | OTA updates, EAS Build for distribution                                        |
| Routing     | Expo Router (file-based)            | Route groups `(auth)`, `(tabs)` keep navigation paths clean                    |
| Language    | TypeScript (strict)                 | `strict: true` in tsconfig; no `any` in `models/` or `controllers/`            |
| State       | Zustand                             | Lightweight slices; persisted with `zustand/middleware/persist` + AsyncStorage |
| Local DB    | Expo SQLite                         | Pantry, meal plans, budget, and cook history stored offline-first              |
| Remote sync | Supabase (optional)                 | User accounts, cross-device sync; app is fully functional without it           |
| LLM         | Google Gemini API                   | Prompt assembly in `src/prompts/`; streaming via `LLMService`                  |
| Validation  | Zod                                 | Schemas in `src/models/schemas/`; single source of truth for data shapes       |
| Testing     | Jest + React Native Testing Library | Unit tests mirror the MVC split                                                |

---

## Data Flow

Strict one-directional flow. No layer may import from a layer above it.

```
Screen (View)
    ↓ calls
Controller Hook  (useXxxController)
    ↓ reads/writes
Repository  (data source abstraction)
    ↓ delegates to
Service  (LLMService / StorageService / SeasonalService …)
    ↓ side effects
SQLite / AsyncStorage / Anthropic API / Supabase

State updates flow back up via Zustand store:

Service / Repository
    ↓ writes
Zustand Store
    ↓ triggers re-render
View
```

**Hard rules:**

- Views never import from `services/`, `store/`, `repositories/`, or `prompts/`
- Controllers never import from `views/`
- Services never import from `controllers/`, `store/`, or `views/`
- Prompts never import from anything except `models/types/`

---

## Full Tree

```
sous-chef/
│
├── app/                                        # Expo Router — file-based route definitions only
│   ├── (onboarding)/                           # Route group: invisible to navigation path
│   │   ├── _layout.tsx                         # Onboarding shell layout
│   │   ├── welcome.tsx                         # Brand intro + value proposition
│   │   ├── taste-profile.tsx                   # Capture dietary needs, dislikes, skill level
│   │   └── kitchen-setup.tsx                   # Equipment inventory, fridge/pantry baseline
│   │
│   ├── (tabs)/                                 # Route group: main app tab bar
│   │   ├── _layout.tsx                         # Tab bar config, icons, labels
│   │   ├── index.tsx                           # "What shall we cook?" — personalised home
│   │   ├── recipes.tsx                         # Home of the cookbooks (recipe categories) and uncategorized recipes
│   │   ├── pantry.tsx                          # Pantry inventory + waste alerts
│   │   ├── plan.tsx                            # Weekly meal planner + shopping list
│   │   └── discover.tsx                        # Seasonal / local inspiration feed
│   │   └── settings.tsx                        # Allows the user to edit the app settings
│   │
│   ├── recipe/
│   │   ├── [id].tsx                            # Recipe detail with LLM adaptation panel
│   │   └── adapt.tsx                           # Full-screen recipe adaptation flow
│   │
│   ├── chat.tsx                                # Free-form sous chef conversation
│   ├── shopping-list.tsx                       # Generated list, shareable
│   ├── chef-profile.tsx                        # Habits, preferences, history
│   ├── settings.tsx
│   ├── _layout.tsx                             # Root layout — auth gate, theme provider
│   └── index.tsx                               # Redirect: onboarding or home
│
│
├── src/
│   │
│   ├── models/                                 # [MODEL] Data contracts and data access
│   │   │
│   │   ├── types/                              # TypeScript interfaces — no logic, shape only
│   │   │   ├── index.ts                        # Barrel export
│   │   │   ├── Cookbook.types.ts               # Cookbook
│   │   │   ├── Recipe.types.ts                 # Recipe, Ingredient, Step, Substitution, CookNote
│   │   │   ├── Pantry.types.ts                 # PantryItem, ExpiryStatus, WasteEntry, StorageZone
│   │   │   ├── MealPlan.types.ts               # MealSlot, WeekPlan, PlanPreference
│   │   │   ├── ShoppingList.types.ts           # ShoppingItem, ListGroup, StoreSection
│   │   │   ├── Budget.types.ts                 # BudgetPeriod, SpendEntry, CostEstimate
│   │   │   ├── Seasonal.types.ts               # SeasonalProduce, LocalSource, Region
│   │   │   ├── Chef.types.ts                   # ChefProfile, HabitSnapshot, Preference, SkillLevel
│   │   │   └── Conversation.types.ts           # Message, NudgeCard, SuggestionContext, LLMRole
│   │   │
│   │   ├── schemas/                            # Zod schemas — single source of truth for validation
│   │   │   ├── CookbookSchema.ts
│   │   │   ├── RecipeSchema.ts                 # Validates API recipe payloads on ingestion
│   │   │   ├── PantrySchema.ts                 # Validates barcode scan / manual entry
│   │   │   ├── MealPlanSchema.ts
│   │   │   ├── BudgetSchema.ts
│   │   │   └── ChefProfileSchema.ts            # Validates onboarding form + profile edits
│   │   │
│   │   ├── api/                                # Raw network clients — pure fetch wrappers, no business logic
│   │   │   ├── client.ts                       # Axios instance, base URL, auth header injection
│   │   │   ├── cookbookApi.ts                  # Cookbook fetch
│   │   │   ├── recipeApi.ts                    # Recipe search, fetch by ID, save to remote
│   │   │   ├── seasonalApi.ts                  # In-season produce by region + month
│   │   │   ├── ingredientApi.ts                # Ingredient pricing estimates, unit conversions
│   │   │   └── llmApi.ts                       # Anthropic messages endpoint wrapper; streaming support
│   │   │
│   │   └── repositories/                       # Data-source abstraction — controllers talk to repos, never to api/ directly
│   │       ├── CookbookRepository.ts
│   │       ├── RecipeRepository.ts             # Merges remote API + local saved recipes; cache strategy
│   │       ├── PantryRepository.ts             # SQLite pantry table; expiry queries
│   │       ├── MealPlanRepository.ts           # SQLite meal_plans table; weekly queries
│   │       ├── BudgetRepository.ts             # SQLite spend_entries; period aggregation
│   │       ├── ShoppingListRepository.ts       # Derived from meal plan + pantry diff
│   │       ├── SeasonalRepository.ts           # Remote fetch + local cache by region/month
│   │       └── ChefProfileRepository.ts        # AsyncStorage profile; habit snapshot writes
│   │
│   │
│   ├── controllers/                            # [CONTROLLER] Business logic as custom hooks
│   │   │                                       # Each hook owns loading/error state for its domain.
│   │   │                                       # Screens import one controller hook; nothing else.
│   │   │
│   │   ├── useChefController.ts                # Profile reads/writes, onboarding completion, skill tracking
│   │   ├── useRecipeController.ts              # Search, filter, personalise results against chef profile
│   │   ├── usePantryController.ts              # CRUD items, trigger expiry checks, log waste events
│   │   ├── useMealPlanController.ts            # Generate/edit plan, derive shopping list, export
│   │   ├── useBudgetController.ts              # Log spend, estimate recipe cost, budget period summary
│   │   ├── useSeasonalController.ts            # Resolve region + date → in-season list, surface nudges
│   │   ├── useSubstitutionController.ts        # "I don't have X" → LLM-powered swap suggestions
│   │   ├── useConversationController.ts        # Assemble LLM context, manage message history, deliver nudges
│   │   └── useDiscoverController.ts            # Combines seasonal, habit, and budget signals into feed
│   │
│   │
│   ├── views/                                  # [VIEW] Presentational layer — props in, callbacks out
│   │   │                                       # No API calls. No store imports. No controller imports.
│   │   │
│   │   ├── components/
│   │   │   │
│   │   │   ├── ui/                             # Design-system primitives — zero domain knowledge
│   │   │   │   ├── Button/
│   │   │   │   │   ├── Button.tsx
│   │   │   │   │   └── Button.styles.ts
│   │   │   │   ├── Input/
│   │   │   │   ├── Sheet/                      # Bottom sheet wrapper
│   │   │   │   ├── Badge/
│   │   │   │   ├── Spinner/
│   │   │   │   ├── Divider/
│   │   │   │   └── index.ts                    # Barrel export
│   │   │   │
│   │   │   ├── recipe/
│   │   │   │   ├── RecipeCard.view.tsx         # Tile for grids/lists; image, title, time, cost badge
│   │   │   │   ├── RecipeDetail.view.tsx       # Full recipe surface; scrollable steps
│   │   │   │   ├── StepCard.view.tsx           # Single cooking step; optional countdown timer
│   │   │   │   ├── IngredientRow.view.tsx      # Ingredient line with scaling and substitution tap
│   │   │   │   └── AdaptationPanel.view.tsx    # LLM suggestions overlay on a recipe
│   │   │   │
│   │   │   ├── pantry/
│   │   │   │   ├── PantryItem.view.tsx         # Row: name, quantity, expiry chip
│   │   │   │   ├── ExpiryChip.view.tsx         # Colour-coded freshness indicator
│   │   │   │   └── WasteAlert.view.tsx         # "Use this soon" dismissible banner
│   │   │   │
│   │   │   ├── meal-plan/
│   │   │   │   ├── MealSlot.view.tsx           # Single day/meal slot; drag target
│   │   │   │   ├── WeekGrid.view.tsx           # 7-day plan grid
│   │   │   │   └── ShoppingGroup.view.tsx      # Grouped shopping list section
│   │   │   │
│   │   │   ├── budget/
│   │   │   │   ├── BudgetMeter.view.tsx        # Visual spend-vs-budget bar
│   │   │   │   └── CostBadge.view.tsx          # Estimated cost chip on recipe cards
│   │   │   │
│   │   │   ├── seasonal/
│   │   │   │   ├── SeasonalBadge.view.tsx      # "In season near you" pill
│   │   │   │   └── ProduceCard.view.tsx        # Seasonal item with recipe count
│   │   │   │
│   │   │   ├── nudge/
│   │   │   │   ├── NudgeCard.view.tsx          # Gentle suggestion surface — the app's signature UI
│   │   │   │   └── NudgeStrip.view.tsx         # Horizontal scroll of nudge cards
│   │   │   │
│   │   │   └── conversation/
│   │   │       ├── MessageBubble.view.tsx      # Chat message; user or assistant variant
│   │   │       ├── SuggestionChip.view.tsx     # Tappable quick-reply / recipe suggestion
│   │   │       └── TypingIndicator.view.tsx    # LLM streaming animation
│   │   │
│   │   ├── screens/                            # Route-level screens — one controller hook each
│   │   │   ├── HomeScreen.tsx                  # Personalised "cook tonight?" surface; nudge strip
│   │   │   ├── Cookbook.tsx                    #
│   │   │   ├── PantryScreen.tsx                # Inventory list + add item flow
│   │   │   ├── MealPlanScreen.tsx              # Weekly grid + LLM plan generation
│   │   │   ├── DiscoverScreen.tsx              # Seasonal + local inspiration feed
│   │   │   ├── RecipeScreen.tsx                # Full recipe with adaptation panel
│   │   │   ├── ChatScreen.tsx                  # Free-form sous chef conversation
│   │   │   ├── ShoppingListScreen.tsx          # Derived list; check off + share
│   │   │   ├── ChefProfileScreen.tsx           # Habits, preferences, history timeline
│   │   │   ├── SettingsScreen.tsx
│   │   │   └── onboarding/
│   │   │       ├── WelcomeScreen.tsx
│   │   │       ├── TasteProfileScreen.tsx
│   │   │       └── KitchenSetupScreen.tsx
│   │   ├── styles/                             # Shared view styles — screen/card/text layout primitives
│   │   │   │                                   # Imports constants only; no domain knowledge or business logic
│   │   │   ├── screenStyles.ts                 # Common screen, scroll, header, action-row, and list layouts
│   │   │   ├── textStyles.ts                   # Common eyebrow, title, description, section, empty, and error text
│   │   │   ├── cardStyles.ts                   # Common card shells, borders, padding, and surface variants
│   │   │   └── index.ts                        # Barrel export
│   │
│   │
│   ├── services/                               # I/O boundary — called only by controllers and repositories
│   │   │
│   │   ├── LLMService.ts                       # Prompt assembly, Anthropic API calls, stream parsing
│   │   │                                       # Returns typed structured responses; never raw strings to controllers
│   │   │
│   │   ├── NudgeService.ts                     # Decides *when* and *what* to nudge
│   │   │                                       # Reads HabitService signals + seasonal + waste state
│   │   │                                       # Emits NudgeCard[] ranked by relevance
│   │   │
│   │   ├── HabitService.ts                     # Observes and records cook behaviour silently
│   │   │                                       # Tracks: recipe completions, substitutions accepted,
│   │   │                                       # ingredients avoided, cook times, budget adherence
│   │   │                                       # Writes HabitSnapshot to ChefProfileRepository on session end
│   │   │
│   │   ├── WasteService.ts                     # Monitors pantry expiry dates
│   │   │                                       # Logs waste events; informs future nudges and shopping
│   │   │
│   │   ├── SeasonalService.ts                  # Resolves device region + current date → in-season produce list
│   │   │
│   │   ├── PricingService.ts                   # Estimates recipe cost from ingredient quantities + regional prices
│   │   │                                       # Cached; refreshed weekly
│   │   │
│   │   └── StorageService.ts                   # Unified wrapper over SQLite (Expo SQLite) and AsyncStorage
│   │                                           # Handles migrations, serialisation, and error normalisation
│   │
│   │
│   ├── prompts/                                # LLM prompt templates — versioned business logic
│   │   │                                       # Pure functions: (context: PromptContext) => string
│   │   │                                       # No imports from services/, controllers/, or store/
│   │   │
│   │   ├── systemPrompt.ts                     # Core Sous Chef persona
│   │   │                                       # Warm, encouraging, curious — never prescriptive
│   │   │                                       # Includes chef profile context injection point
│   │   │
│   │   ├── recipeAdaptation.ts                 # "Adapt this recipe for what's in my pantry"
│   │   │                                       # Inputs: recipe + pantry delta + chef profile
│   │   │
│   │   ├── substitution.ts                     # "I'm missing X — what can I use instead?"
│   │   │                                       # Inputs: missing ingredient + recipe context + pantry
│   │   │
│   │   ├── mealPlanning.ts                     # Weekly plan generation
│   │   │                                       # Inputs: budget + pantry + seasonal + past meals
│   │   │
│   │   ├── wasteReduction.ts                   # "Use these before they spoil"
│   │   │                                       # Inputs: expiring pantry items + chef preferences
│   │   │
│   │   └── inspiration.ts                      # Unprompted "have you thought about…" nudges
│   │                                           # Inputs: seasonal produce + habit history + time of day
│   │
│   │
│   ├── store/                                  # Global client state — Zustand slices
│   │   │                                       # Controllers write to store; views read via hooks
│   │   │
│   │   ├── index.ts                            # Compose and export all slices
│   │   ├── cookbookStore.ts                    #
│   │   ├── pantryStore.ts                      # Live pantry state; persisted to AsyncStorage
│   │   ├── mealPlanStore.ts                    # Active week plan; derived shopping list
│   │   ├── budgetStore.ts                      # Current period spend + budget ceiling
│   │   ├── chefProfileStore.ts                 # Chef preferences + habit snapshots; persisted
│   │   ├── conversationStore.ts                # Active LLM chat history + sliding context window
│   │   │                                       # Context window managed here to avoid unbounded growth
│   │   └── uiStore.ts                          # Sheet open/close, active tab, theme preference
│   │
│   │
│   ├── hooks/                                  # Utility hooks — not controllers; no business logic
│   │   ├── useDebounce.ts
│   │   ├── useAppState.ts                      # Foreground/background lifecycle
│   │   ├── useRegion.ts                        # Device locale → region code for seasonal context
│   │   └── useTimerCountdown.ts                # Used by StepCard for cooking step timers
│   │
│   │
│   ├── constants/
│   │   ├── colors.ts                           # Warm kitchen palette — cream, terracotta, sage, copper
│   │   ├── spacing.ts                          # 4pt grid
│   │   ├── typography.ts                       # Type scale; warm serif for headings, clean sans for body
│   │   ├── skillLevels.ts                      # Novice / Home Cook / Confident / Chef; capability descriptors
│   │   └── config.ts                           # API base URLs, feature flags, LLM model string
│   │
│   │
│   ├── utils/                                  # Pure, stateless helper functions — no imports from src/
│   │   ├── formatters.ts                       # Quantities (½ cup → "½ cup"), currencies, relative dates
│   │   ├── ingredientMatcher.ts                # Fuzzy match user input "tomatos" → canonical "tomatoes"
│   │   ├── costEstimator.ts                    # Ingredient quantity × unit price → estimated total
│   │   ├── contextWindow.ts                    # Trims conversation history to fit LLM token budget
│   │   └── platform.ts                         # isIOS(), isAndroid(), isTablet()
│   └── assets/                                 # Pure, stateless helper functions — no imports from src/
│       ├── fonts/                              # Serif display font + UI sans; loaded via expo-font
│       ├── images/                             # Onboarding illustrations, placeholder food imagery
│       └── icons/                              # Cooking-specific icon set (SVG → expo-symbols or custom)
│
│
├── __tests__/
│   ├── models/
│   │   ├── schemas/                            # Zod schema validation tests
│   │   └── repositories/                       # Repository logic with mocked StorageService
│   │
│   ├── controllers/                            # Controller hooks with mocked repositories
│   │   ├── useChefController.test.ts
│   │   ├── usePantryController.test.ts
│   │   ├── useConversationController.test.ts   # LLM context assembly is a key test surface
│   │   └── useSubstitutionController.test.ts
│   │
│   ├── services/
│   │   ├── NudgeService.test.ts                # Core logic; nudge ranking is product-critical
│   │   ├── HabitService.test.ts                # Habit accumulation and snapshot writing
│   │   ├── WasteService.test.ts
│   │   └── LLMService.test.ts                  # Prompt assembly; mock Anthropic responses
│   │
│   ├── prompts/
│   │   └── *.snapshot.ts                       # Prompt output snapshots — catch regressions in persona
│   │
│   └── views/
│       └── components/                         # React Native Testing Library render tests
│
│
├── app.json                                    # Expo config — bundle ID, permissions, splash, icons
├── babel.config.js
├── tsconfig.json                               # strict: true; path aliases for src/
├── eas.json                                    # EAS Build profiles — development, preview, production
├── package.json
└── README.md
```

---

## Upcoming Tab Additions

The main tab bar will expand with two additional route-level surfaces:

- `app/(tabs)/recipes.tsx` will sit between Home and Pantry and act as the stored-recipes home for cookbook groupings plus uncategorized recipes.
- `app/(tabs)/settings.tsx` will be the last tab and will reuse the settings surface for app preferences and onboarding reset.
- The existing top-level `app/settings.tsx` route remains as a direct entry-point alias to the same settings screen.

Recipes and settings will be represented across MVC like this:

- **Model**: add `Cookbook.types.ts` and `CookbookRepository.ts` for cookbook groupings and uncategorized saved-recipe retrieval.
- **Controller**: add `useRecipesController.ts` for the tab-level stored-recipes home, distinct from the existing `useRecipeController.ts` used for recipe search/detail behavior.
- **View**: add `RecipesScreen.tsx` as the tab-level stored-recipes home, and keep `SettingsScreen.tsx` as the settings surface where onboarding reset will live.

This keeps the naming boundary explicit:

- `RecipesScreen` = stored recipes tab home
- `RecipeScreen` = single recipe detail surface

---

## Key Conventions

### File Naming

| Artefact        | Convention             | Example                  |
| --------------- | ---------------------- | ------------------------ |
| View component  | `Name.view.tsx`        | `RecipeCard.view.tsx`    |
| View list component | `NameList.view.tsx` | `PantryList.view.tsx`   |
| View component hook | `Name.hooks.ts`    | `RecipeCard.hooks.ts`   |
| Component styles | `Name.styles.ts`      | `RecipeCard.styles.ts`  |
| Screen          | `NameScreen.tsx`       | `PantryScreen.tsx`       |
| Controller hook | `useNameController.ts` | `usePantryController.ts` |
| Repository      | `NameRepository.ts`    | `PantryRepository.ts`    |
| Service         | `NameService.ts`       | `NudgeService.ts`        |
| API client      | `nameApi.ts`           | `recipeApi.ts`           |
| Store slice     | `nameStore.ts`         | `pantryStore.ts`         |
| Utility hook    | `useName.ts`           | `useRegion.ts`           |
| Prompt template | `camelCaseTopic.ts`    | `recipeAdaptation.ts`    |
| Type file       | `Name.types.ts`        | `Chef.types.ts`          |
| Zod schema      | `NameSchema.ts`        | `ChefProfileSchema.ts`   |

### Component Folder Structure

Each non-trivial view component lives in its own folder and is composed of up to four files, tied together by a barrel `index.ts`:

```
ComponentName/
├── index.ts                    # Barrel export only — no logic
├── ComponentName.view.tsx      # JSX only — receives props, emits callbacks, no logic
├── ComponentName.styles.ts     # StyleSheet.create({}) — imports constants/ only
└── ComponentName.hooks.ts      # Optional — view-local state, animation, display formatting
```

**`ComponentName.view.tsx`** is pure markup. It must not contain `useState`, `useEffect`, formatting logic, or conditional derivations. Everything it needs arrives as props or from its companion hook.

**`ComponentName.styles.ts`** contains only `StyleSheet.create({})`. It may import from `src/constants/` only.

**`ComponentName.hooks.ts`** is a view-layer hook. It accepts props and returns display-ready values — local UI state, animation values, and formatted strings derived from props. It must not import from `controllers/`, `store/`, `services/`, `repositories/`, or `prompts/`. If no local state or display transformation is needed, this file is omitted.

**`index.ts`** re-exports the component and nothing else:
```ts
export { ComponentName } from './ComponentName.view';
```

Simple, fully-dumb components (no local state, no display logic) do not need a hooks file. Use the full four-file structure only when the component genuinely needs it.

---

### Item and List Component Pairs

Any component that renders a collection sourced from model data must be split into two components:

- **Item component** (`Name.view.tsx`) — renders a single element; receives one typed item as a prop.
- **List component** (`NameList.view.tsx`) — maps the collection, renders Item components, and owns the empty state and separator. It does nothing else.

```
pantry/
├── PantryItem/
│   ├── index.ts
│   ├── PantryItem.view.tsx
│   └── PantryItem.styles.ts
└── PantryList/
    ├── index.ts
    ├── PantryList.view.tsx
    └── PantryList.styles.ts
```

The List component receives the full array and a callback; it never fetches, derives, or transforms data. All loading and error state lives in the controller and is passed down as props.

---

### Component Extraction Bias

Prefer extracting a component over keeping markup inline, even if that component is only used in one place today.

The bar for extraction is **reuse potential**, not **current reuse**. If a piece of UI has a distinct visual identity, represents a named concept from the domain, or could plausibly appear elsewhere in the app, it belongs in its own component.

**Extract when any of these are true:**

- The element maps to a named domain concept (`ExpiryChip`, `CostBadge`, `SeasonalBadge`)
- The element has its own visual state (pressed, disabled, loading, empty)
- The element would need to be changed independently of its parent
- The element appears more than once — even in the same file
- The parent view is growing beyond ~80 lines of JSX

**Do not leave inline:**

- Repeated JSX blocks that differ only by data
- Layout sections with enough visual weight to be named
- Any element that has its own style block with more than 3 properties

A screen that composes ten small named components is easier to read, test, and change than a screen with 200 lines of nested JSX. The cost of a small single-use component is low. The cost of unpicking a large monolithic view is high.

When in doubt, extract.

---

### Commenting Practice

Prefer self-explanatory code over explanatory comments. Add comments only where they provide context the code itself cannot express quickly, such as architectural intent, non-obvious constraints, workflow invariants, edge-case reasoning, or why a particular approach was chosen. Do not add comments that merely restate what the next line of code already says. A small number of high-value comments is preferred over pervasive low-signal commentary.

- Comment `why`, not `what`.
- Comment invariants, assumptions, and surprising behavior.
- Comment cross-layer or cross-domain decisions that would be hard to infer locally.
- Avoid line-by-line narration of obvious code.
- If a function needs many explanatory comments, prefer refactoring it into clearer names and smaller units first.

Comments should reduce future confusion, not decorate code.

### Dependency Rule

Each layer may only import from layers _below_ it. Violations are treated as bugs.

- View style files may import from `constants/` and `assets/` only.

```
┌─────────────────────────────────┐
│  View  (screens, components)    │  ← imports controller hooks only
├─────────────────────────────────┤
│  Controllers  (useXxxController)│  ← imports repositories, store, prompts
├─────────────────────────────────┤
│  Repositories                   │  ← imports services, models
├─────────────────────────────────┤
│  Services  + Prompts            │  ← imports models/types only
├─────────────────────────────────┤
│  Models  (types, schemas, api)  │  ← no internal imports
└─────────────────────────────────┘
```

### View Style Layer

`src/views/styles/` is a View-only style composition layer. It centralises repeated presentation patterns such as screen padding, header layout, action rows, section titles, empty states, error text, and generic card shells.

It is not a business-logic layer. Files in `views/styles/` may import from `src/constants/` only. They must not import from `controllers/`, `models/`, `repositories/`, `services/`, `store/`, or `prompts/`.

Use shared styles for repeated layout and typography patterns. Keep component-specific styling in each component's local `.styles.ts` file only when the style is tightly coupled to that component's structure and has no plausible use elsewhere.

Component-level `.hooks.ts` files follow the same import restriction as `.styles.ts` files with one addition: they may import from `src/utils/` for pure formatting helpers. They must not import from `controllers/`, `models/`, `repositories/`, `services/`, `store/`, or `prompts/`.

---

### Style Hierarchy

Styles are layered top-down. The higher the level, the broader the reach. A style rule must always live at the highest level where it makes sense — pulled down only when a specific context genuinely requires an override.

```
src/constants/                  ← Level 1: Design tokens — colors, spacing, typography scale
src/views/styles/               ← Level 2: Composed shared styles — headings, UI elements, layout primitives
src/views/components/ui/        ← Level 3: Design-system component defaults — Button, Input, Badge, etc.
src/views/screens/              ← Level 4: Screen-level overrides — only what is unique to this screen
src/views/components/<domain>/  ← Level 5: Component-level overrides — only what cannot live higher
```

**Level 1 — Design tokens (`src/constants/`)**
Raw values only: color palette, spacing scale, type scale. No composed styles. Every other level imports from here; nothing imports into here.

**Level 2 — Shared styles (`src/views/styles/`)**
Named, reusable style objects composed from tokens. This is where headline styles, body text styles, card shells, screen padding, section titles, and action row layouts are defined. If a style describes a concept that appears across more than one screen or domain, it belongs here.

**Level 3 — UI primitives (`src/views/components/ui/`)**
Base visual defaults for interactive elements: `Button`, `Input`, `Badge`, `Sheet`, `Spinner`. These components ship with their own `.styles.ts` that defines their default appearance. Consumers do not restyle them directly — they pass variant props instead.

**Level 4 — Screen styles**
A screen's `.styles.ts` may only define layout specific to that screen's unique structure. It must not redefine anything already expressed at Levels 1–3.

**Level 5 — Component styles**
A component's `.styles.ts` may only define what is structurally inseparable from that component. It must not duplicate or shadow a style that already exists higher up.

#### Before writing any style rule, ask:

1. **Does this already exist at a higher level?** If yes, import and use it — do not redefine it.
2. **Should this exist at a higher level?** If it describes a general concept (a heading, a card shell, a row layout), move it up rather than defining it locally.
3. **Is this override justified?** A style written at Level 4 or 5 must be explainable: what makes this screen or component different enough to warrant its own rule?

**If the right level is unclear, do not guess. Ask the user before writing the style.**

This hierarchy is how the app maintains a consistent visual identity. Styles defined once at the top propagate everywhere. Styles shoehorned into individual components diverge silently over time.

### Controller Hook Pattern

Controllers are the only layer screens interact with. They own loading and error state, call repositories, write to the store, and expose a clean action surface. They do not return JSX.

```ts
// src/controllers/usePantryController.ts
export const usePantryController = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const repo = new PantryRepository();

  const addItem = async (item: PantryItemInput) => {
    setLoading(true);
    try {
      const validated = PantrySchema.parse(item);
      await repo.insert(validated);
      HabitService.record("pantry_item_added");
    } catch (e) {
      setError("Could not add item.");
    } finally {
      setLoading(false);
    }
  };

  return { addItem, loading, error };
};
```

### Repository Pattern

Repositories abstract the data source. A controller calls `PantryRepository.getExpiringSoon()` and never needs to know whether that data came from SQLite, AsyncStorage, or a remote API. Swapping storage backends is a repository-only change.

```ts
// src/models/repositories/PantryRepository.ts
export class PantryRepository {
  async getExpiringSoon(withinDays = 3): Promise<PantryItem[]> {
    return StorageService.query(
      `SELECT * FROM pantry WHERE expiry_date <= date('now', '+${withinDays} days')`,
    );
  }
}
```

### Prompt Template Pattern

Prompt templates are pure functions that accept typed context objects and return strings. They must never call services or fetch data — context assembly is the controller's responsibility.

```ts
// src/prompts/wasteReduction.ts
import type { PantryItem, ChefProfile } from "../models/types";

interface WasteReductionContext {
  expiringItems: PantryItem[];
  chefProfile: ChefProfile;
}

export const buildWasteReductionPrompt = (
  ctx: WasteReductionContext,
): string => `
  The cook has these items expiring within 3 days: ${ctx.expiringItems.map((i) => i.name).join(", ")}.
  Their skill level is ${ctx.chefProfile.skillLevel} and they enjoy ${ctx.chefProfile.cuisinePreferences.join(", ")}.
  Suggest one or two recipe ideas that use these items. Be warm and encouraging, not alarming.
`;
```

### LLM Context Window Management

`conversationStore` owns the active message history. `contextWindow.ts` (util) trims old messages to stay within the token budget while always preserving the system prompt and the most recent exchange. This is called by `useConversationController` before every API call.

```
System prompt  (always included)
  +
Chef profile summary  (always included — ~200 tokens)
  +
Trimmed message history  (most recent N messages that fit budget)
  +
Current user message
```

### Nudge vs. Chat

These are distinct surfaces with distinct controllers, but they share `LLMService` and `conversationStore`:

- **Nudges** are proactive and ambient. `NudgeService` decides _when_ to surface them; `useDiscoverController` and `useHomeController` render them as `NudgeCard` components. The user did not ask.
- **Chat** is reactive and explicit. `useConversationController` manages the full chat session. The user initiated.

Nudge cards may _open_ the chat screen with a pre-populated context — but they are never rendered inside `ChatScreen`. The boundary is intentional.

### Sous Chef Companion

The floating Sous Chef companion is a top-level guidance surface rendered by the app shell, not an inline screen-specific workaround. Use it when the app should gently guide, reassure, or redirect the cook across routes in a warm, product-facing way.

- `happy` - use for friendly nudges, onboarding redirects, and guidance when the user has a clear next step.
- `exhausted` - use when the LLM or another assistant-powered flow is temporarily unavailable and the app should acknowledge the interruption in human language.

Controllers may trigger the companion through shared state, but the companion itself remains globally rendered and route-aware so one screen does not hard-code floating UX for the rest of the app.

### Load Masks

Use the shared `LoadMask` UI primitive for blocking, short-lived in-screen waits where the user should not keep tapping or editing while work is in progress.

- Prefer `LoadMask` over ad hoc absolute-position overlays inside individual screens.
- Keep the prop surface small: `visible`, optional `label`, and optional `tone`.
- Trigger it from controller-backed or screen-local view state such as `isImporting`, `isSaving`, or `isGenerating`, then pass that state down into the view.
- Mount it once near the screen root so it covers the current task surface cleanly instead of scattering partial overlays across child components.
- Use it for operations such as recipe import, draft generation, or other flows where the current screen is waiting on one focused task.
- Do not use it for global assistant availability or ambient guidance. Those belong to the floating Sous Chef companion instead.
- A good default looks like `visible={isImporting}`, `label="Sous Chef is reviewing that recipe..."`, and a warm tone only when the wording is intentionally product-facing.

### Settings Focus Links

When another surface needs to guide the user to a specific settings section, navigate with a search parameter such as `/settings?focus=chef_profile` rather than relying on hash fragments.

- The sending surface owns the route intent, for example `router.push("/settings?focus=chef_profile")`.
- The settings screen reads the `focus` search parameter with `useLocalSearchParams`.
- The target section measures its layout with `onLayout`.
- After layout is known, the screen scrolls gently with `ScrollView.scrollTo({ animated: true })` rather than jumping immediately on mount.
- Briefly highlight the target section after scrolling so the cook is not left guessing what needs attention.
- Focus scrolling should run once per navigation intent and should never keep re-triggering on normal re-renders.

This pattern should be used for guided redirects such as onboarding/profile follow-up, assistant setup, or future support flows.

## Testing Philosophy

The MVC split makes each layer independently testable with small, focused mocks:

| Layer                   | What to test                                         | Mock boundary                       |
| ----------------------- | ---------------------------------------------------- | ----------------------------------- |
| `models/schemas`        | Zod parse success and failure cases                  | None needed                         |
| `models/repositories`   | Query logic and data transformations                 | Mock `StorageService`               |
| `controllers`           | State transitions, error handling, action sequencing | Mock repositories                   |
| `services/NudgeService` | Nudge ranking logic and suppression rules            | Mock HabitService + SeasonalService |
| `services/HabitService` | Accumulation of events into snapshots                | Mock StorageService                 |
| `services/LLMService`   | Prompt assembly, response parsing                    | Mock Anthropic API                  |
| `prompts`               | Snapshot tests on prompt string output               | None needed                         |
| `views`                 | Render + interaction via RNTL                        | Mock controller hooks               |

**Prompt snapshot tests** deserve special mention. Because prompt strings encode the app's personality and reasoning, regressions in them are product bugs, not just test failures. Snapshot tests make prompt changes a deliberate, reviewed act.

---

## Offline-First Principle

Sous Chef is a kitchen tool — it must work with one hand covered in flour and no signal. The offline-first rules are:

1. All pantry, meal plan, and chef profile data is stored locally in SQLite first.
2. LLM features degrade gracefully: if the API is unreachable, cached suggestions from the last successful session are surfaced instead of an error state.
3. Seasonal data is refreshed weekly and cached; the last successful fetch is always available.
4. Pricing data is refreshed weekly; recipe cost estimates show "~" prefix when using cached data.
5. Supabase sync (if enabled) is background-only and never blocks the UI.
