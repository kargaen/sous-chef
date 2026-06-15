# Landing × Discover Merge Epic

## Why

Landing and Discover answer the same question — _"what's worth my attention right now, and what else might I cook?"_ — from two tabs. The landing page is where the cook **lands, glances, and leaves** for what they came for; Discover is where they **stay and get fed ideas**. Discover already feeds the landing page. They are one surface pretending to be two.

This epic **merges them into the Home surface** and adds a user-driven way to keep pulling more inspiration.

## The navigation unlock

Merging is also the clean answer to the bottom-bar crowding the icon pass couldn't fix:

- **Home (`index`)** becomes the single landing + discovery surface. The **`discover` route is deleted**; its lane components render inside Home (no redirect).
- **Settings moves to a gear** high on Home; the **`settings` tab is removed** (the standalone `/settings` route stays for deep-links like `?focus=assistant`). The gear lives **only on Home** — settings is not a daily destination.
- Bottom bar → **4 destinations: Home · Recipes · Pantry · Plan.** Crowding dissolves as a side effect of better IA — nothing is buried in a "More" menu.
- **The chat launcher keeps its reserved slot + bottom clearance** — it still floats down there after the bar shrinks. Give the launcher icon a **soft drop shadow that falls into the bar**, so it pops off the surface a little.

## Anatomy of the merged surface (top → bottom)

Order follows "land, glance, then get fed" — and **LLM-light, data-first cards come before anything generative**:

1. **Briefing header** (existing `HomeBriefingHeader`) + **Settings gear** (top-right).
2. **Glance cards (LLM-light)** — ranked summary cards backed by real app data: Cook-or-Create, In Season, Use-It-Up (expiring pantry), Today's Menu (plan), Leftover loop (cooked yesterday → use it up). These load instantly, cost no tokens, and adapt to a full *or* empty app.
3. **Inspiration feed** — the Discover lanes (sparks, produce strip, themes, leftover, nudge).
4. **Generation zone** — the three "feed me more" controls.
5. **Generated cards stack at the bottom of the feed, just above the generation zone**, so the feed grows downward and the controls stay put.

## Cards that feel alive (deterministic context)

Cards must read well in an app **stock full of data** and one that is **completely empty**. Before any generation, a deterministic **context bundle** is assembled and handed to the LLM (and used by the light cards directly):

- **App-data state** — what's in the pantry, what was cooked recently, whether a plan exists, how stocked the cookbook is. This is what lets a card swing from "use the spinach before it turns" (full) to "let's create your first recipe" (empty).
- **Temporal metadata** —
  - _time of day_ → lunch vs. dinner framing;
  - _day of week_ → near week's end with no plan, nudge "plan next week"; on a Thursday, offer "a nice Friday/Saturday dinner";
  - _day of month_ → late in the month, lean toward saving.
- **Nudge-frequency setting** — bias cards toward savings / leftovers / waste-reduction in proportion to how much the user has asked to be nudged.

The bundle is built once, deterministically, and passed into generation — never re-derived per card, never an LLM call to assemble it.

## The generation zone (the heart of this epic)

Three **co-equal, all core to v1** ways to ask for more, each minting **3 cards** through the TTL inspiration store / `InspirationService`, seeded with the context bundle above:

- **Directed — 3 theme buttons.** Seasonal base + LLM gap-fill. Tap → 3 ideas on that theme.
- **Serendipity — pull to load random.** See the gesture spec below.
- **Bespoke — a free-text field.** The cook types whatever they feel like; the text seeds 3 ideas.

Each trigger mints 3 cards, inserts them **above** the generation zone, and the cook scrolls up to see them / back down to generate again.

### Pull-to-load gesture (core, not deferred)

Prefer a maintained RN gesture/scroll package if one cleanly supports bottom over-pull. Otherwise, the **fallback build**:

- Detect **over-scroll at the bottom** (the user swipes up so the scroll wants to continue past the end).
- Past a threshold, a **text + arrow** fade and grow in **from transparent and small**, scaling toward **full opacity and size** as the pull deepens — the affordance _earns_ its presence with the gesture.
- **Release past the threshold → mint** 3 random cards (with context); release short → springs back, no-op.

## Cards: uniform look, persistence, and dismissal

- **One card shape.** All cards — light and generated — share a single visual (a Facebook-feed feel), but they stay **discrete cards**, not an edge-to-edge doomscroll.
- **Persistence.** Generated inspiration mints into the TTL store and **lives at least a day** (dedupes across triggers, survives leaving and returning).
- **Dismissal.** A card can be removed with a **swipe or a corner (✕)** when it isn't relevant.
- **Light, settings-gated learning.** A dismissal teaches the generator what the cook *doesn't* want — **only if the user's settings permit personalization**. Keep it deliberately small: a few lightweight signals (e.g. recently-dismissed themes/keywords), **never a growing archive** that balloons the prompt into a monster.

## MVC mapping (reuse-first)

- **Model / Service:** `InspirationRepository` (TTL store, mint/dedupe/sweep) + `InspirationService` already exist. Add `generateMore({ mode: "theme" | "freeText" | "random", prompt?, context })` that mints 3 and returns them. Add a deterministic **context bundle** builder (reads pantry/cook-log/plan/profile/settings + clock) at the service/controller seam.
- **Controller:** extend `useDiscoverController` (already owns `loadFeed`/`loadDiscover`/`refreshSparks`/`consume`) with `generateMore(...)`, a session list of generated cards, and `dismissCard(id)`.
- **View:** Home composes briefing + gear + light cards + inspiration lanes + a new `GenerationZone`; the Discover lanes render under Home. Cards gain a uniform shell + swipe/✕ affordance.
- **Navigation:** tab layout drops `discover` + `settings`; Home header gains the gear; the launcher keeps its slot and gains a drop shadow.

## Build order (smallest safe slice first)

1. **M.1 — Compose Discover lanes into Home.** View composition only; both halves already exist. Discover tab still works. Lowest-risk, immediately visible.
2. **M.2 — Settings gear on Home.** Navigation only (gear → `/settings`).
3. **M.3 — Drop `discover` + `settings` tabs.** Bar → 4. Route cleanup; launcher keeps padding + gains the drop shadow.
4. **C.1 — Context bundle.** Deterministic builder (app-data state + temporal metadata + nudge setting). No UI; underpins "alive" cards.
5. **G.1 — Generation zone scaffold.** 3 theme buttons + "Surprise me" + text field → `generateMore(context)` mints 3, stacks above. Uniform card shell.
6. **G.2 — Pull-to-load gesture.** Package or the fallback build above.
7. **R.1 — Dismissal + persistence.** Swipe/✕ removal; confirm ≥1-day TTL on generated cards.
8. **R.2 — Settings-gated light learning.** Feed dismissals back as a tiny, capped signal — only when settings allow.
9. **Light cards (carried over).** Use-It-Up + Today's Menu with the urgency guardrails below.
10. **LLM-heavy tier (last).** Briefing/card enrichment + LLM-generated themes.

## Carried over from the Landing & Discover epics

The two source epics are being retired; these still-wanted, unshipped threads survive here so nothing is lost.

**Glance cards still to build (LLM-light, data-first):**

- **Use It Up** (was LP.3): most-urgent expiring pantry item(s) → "Review pantry". Stretch "Cook with this" is blocked on pantry→recipe matching.
- **Today's Menu** (was LP.4): today's plan slots resolved to titles; plan-present/empty variants; a "to buy" preview once shopping derivation is trustworthy.
- **Leftover loop** (was D.0c) shipped as a *producer*; keep surfacing it as a glance card on thin days.

**Guardrails — mandatory the moment an urgent card lands:**

- **Visual urgency, not just order.** Add a `tone` variant to the card shell (`urgent` warm accent + icon / `default` / `invite`) so urgency reads by more than position.
- **Reserve relevance bands.** Inspiration ≤ 0.6, soft urgency 0.65–0.79, hard urgency ≥ 0.8 — anything expiring must out-rank inspiration.

**LLM-heavy tier (on request / enrichment):**

- **Briefing/card enrichment** (was LP.0c): a single batched, non-blocking, failure-silent garnish call over the already-ranked signals; decide trigger/cadence against token cost. Never decides order or visibility.
- **LLM-generated themes** (was D.6): a gap-filler theme tier beyond the hardcoded seasonal set.

**Liveliness polish:**

- **Seed-rotating sparks** (was D.1 `[~]`): rotate spark order by the daily seed.
- **Retire the legacy "For tonight" `NudgeStrip`** (landing cosmetic debt) by folding it into the merged feed.

**Already resolved — do NOT carry:**

- Recipe-creator `seed` param — **done** (`NewRecipeScreen` accepts `seed`).
- Cross-recipe recent-cooks reader — **done** (`CookLogRepository.getRecentCooks`).
- Discover placeholder screen — **done** (now merging into Home).

## Note for later — ordered, no-jump loading

Observed on the first merged build: lanes/cards resolve at different times and the
page **reflows under the reader** (a lower card finishes first and shoves the
ones above it down once they arrive). The feed must never move content that is
already in or above the viewport.

Two fixes, preferred order:

1. **Skeleton placeholders that reserve space.** Each lane/card renders a
   fixed-height skeleton immediately; real content swaps in place. Fastest first
   paint, zero layout shift. Preferred.
2. **Ordered / progressive reveal.** Lane _N_ only appears once lanes _1…N-1_ have
   resolved, so the feed always grows downward in order. Simpler, but the first
   paint waits on each step.

Either way the rule is: **top-to-bottom, append-only growth** — nothing above the
reader's current position may shift. Applies to the auto-loaded lanes _and_ the
generation zone's newly-minted cards (which already append below, but must also
reserve their slot while generating so the controls don't jump).

## Flags / risks

- **Route ripple.** Deleting `/(tabs)/discover` and the `settings` tab means anything routing there must be repointed. The Discover seed flow already routes to `/recipes/new` (fine); verify `/settings?focus=...` deep-links still resolve to the standalone route.
- **Pull-to-load has no guaranteed native primitive** — G.2 may need the fallback gesture build; budget for it since it's core, not polish.
- **App gaps that still cap certain cards:** pantry→recipe matching doesn't exist (blocks "Cook with this"); shopping-list derivation is placeholder (caps Today's Menu "to buy"); meal-plan persistence is thin (Today's Menu often shows empty); spark pantry context is indirect (controller doesn't read pantry yet).
- **One slow lane never blocks the page** — keep each lane/card's loading state independent.
- **Keep learning small.** R.2 must stay a capped, low-cardinality signal; resist growing a per-user "learnings" corpus that bloats every generation prompt.
