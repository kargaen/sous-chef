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

