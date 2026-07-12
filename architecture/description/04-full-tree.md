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
│   ├── auth.tsx                                # Email/password sign-in for backup/restore (re-exports AuthScreen)
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
│   │   ├── useAuthController.ts                # Supabase sign in/up/out; writes authStore
│   │   ├── useBackupController.ts              # backupNow/restoreNow; stamps lastBackupAt
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
│   │   │   ├── AuthScreen.tsx                  # Email/password sign-in/up; signed-in state + sign out
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
│   │   ├── SnapshotService.ts                  # Assembles the versioned AppSnapshot from repository reads;
│   │   │                                       # geminiApiKey redacted by explicit allowlist
│   │   │
│   │   ├── BackupService.ts                    # backupNow / restoreFromRemote — ties session + snapshot +
│   │   │                                       # SupabaseService; restore is an id-preserving merge, never a wipe
│   │   │
│   │   ├── StorageService.ts                   # Unified wrapper over SQLite (Expo SQLite) and AsyncStorage
│   │   │                                       # Handles migrations, serialisation, and error normalisation
│   │   │
│   │   └── SupabaseService.ts                  # Sole @supabase/supabase-js import point (mirrors StorageService's role)
│   │                                           # Auth (sign up/in/out, session, auth-state changes) + snapshot blob
│   │                                           # upload/fetch; lazy client construction so a missing config only
│   │                                           # fails the calling operation, never app boot
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
│   │   ├── authStore.ts                        # Supabase session/user/status + lastBackupAt; in-memory only
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
├── supabase/                                   # Supabase CLI project marker + tracked SQL migrations
│   ├── config.toml                             # Minimal marker so `supabase link` works in CI
│   └── migrations/                             # Applied by the workflows' migrate-db job before any build
├── eas.json                                    # EAS Build profiles — development, preview, production; carries EXPO_PUBLIC_SUPABASE_* for compiled builds
├── package.json
└── README.md
```

---

