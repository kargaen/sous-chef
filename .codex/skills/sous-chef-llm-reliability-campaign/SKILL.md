---
name: sous-chef-llm-reliability-campaign
description: >
  EXECUTABLE, decision-gated campaign runbook for the OPEN adaptation
  parse bug and structured-LLM-output reliability in general. Load this
  when: "The adaptation came back in an unexpected format"; adaptation of
  a variant (variant-of-variant) fails; log entry "Adaptation response
  parse failed"; reason no_json_found / json_parse_error /
  schema_validation_failed; JSON parse failures on Gemini output;
  considering Gemini JSON mode (responseMimeType / responseSchema),
  maxOutputTokens, finishReason, prompt hardening, repair-and-retry, or
  zod schema loosening; or planning any fix to
  parseAdaptationResponse / extractJsonObject / AdaptationResponseSchema /
  buildAdaptationPrompt. Keywords: adaptation bug, parse failure,
  structured output, JSON mode, truncation, schema drift, responseSnippet,
  recipe_1783008233834, reliability campaign.
---

# LLM output reliability campaign (adaptation parse bug)

This is a CAMPAIGN runbook, not a reference. Execute the phases in order.
Each phase ends in a GATE: a decision point with expected observations and
explicit branches. Do not skip gates, and do not start Phase 3 (fixes)
before Phase 1 (evidence) has produced a `reason` value from the field.

## The bug being hunted (status: OPEN, cause UNCONFIRMED)

Recipe adaptation intermittently fails with the user-facing error
"The adaptation came back in an unexpected format. Try again."
On 2026-07-02: 3 consecutive failures adapting an already-adapted variant
(`recipe_1783008233834`) while the first adaptation of the base recipe
succeeded. Failing responses were large (5–6 KB) and HTTP-successful, so
the failure is post-transport, inside the parse pipeline. Diagnostic
logging shipped in commit `4c8f7e0`; a field log with the failure detail
has NOT yet been captured. Candidate causes (all unconfirmed): response
truncation, variant-recipe formatting in the prompt, model JSON drift.

## Jargon, defined once

| Term | Meaning here |
|---|---|
| Parse pipeline | `extractJsonObject` → `JSON.parse` → `AdaptationResponseSchema.safeParse` in `src/controllers/useAdaptationController.ts` |
| Variant | A saved adapted recipe. Built by `AdaptationService.buildVariantRecipe`; always attaches to the ROOT recipe (`parentId` flattening) |
| Variant-of-variant | Running the adaptation flow ON a variant. The failing case. Produces a sibling of the root, not a nested chain |
| JSON mode | Gemini `generationConfig.responseMimeType: "application/json"` (optionally + `responseSchema`) — makes the model emit machine-parseable JSON. NOT currently used by this app |
| Field log | The in-app ring-buffer log (500 entries, in-memory, lost on app restart) exported via Settings → Debug → "Share log". The ONLY debugging channel for compiled builds |
| Smoke test | An opt-in jest test that calls the real Gemini API. Gated on `RUN_LLM_SMOKE=1`; spends real quota |
| Gate | A stop point: compare what you observed to the expected observation, then take the matching branch. Never proceed on a mismatch you can't explain |

## Standing constraints (non-negotiable, from root CLAUDE.md)

| Rule | Consequence for this campaign |
|---|---|
| NEVER push to `dev` or trigger an EAS build without explicit owner confirmation | Every on-device validation step needs owner consent first. A push to dev auto-builds an RC APK and burns monthly EAS quota (15 Android builds/month) |
| One file per pass, one MVC layer at a time | Phase 2 and 3 changes are sequenced as separate consented passes; several options below are multi-file and say so |
| No new dependencies | No `jsonrepair`-style packages. Fixes use existing code + zod + prompt text |
| Iteration trap: 2 failed attempts in one direction = stop | Applies per solution option in Phase 3. Declare "rabbit hole" and return to the menu |
| Assumption policy: stop and ask over guessing | If the field log's `reason` doesn't match any branch in Gate 1, stop and report — do not pick a fix anyway |
| Evidence bar | No claim about the provider without a raw curl body; no root-cause claim without a reproducing fixture or a field log entry (see `sous-chef-investigation-methodology`) |

## Map of the parse pipeline (verified 2026-07-02)

```
useAdaptationController.runAdaptation (src/controllers/useAdaptationController.ts:167)
  └─ LLMService.send({system, messages})            // priority defaults to "user"
       └─ googleProvider.send (src/models/api/llm/google.ts)
            model gemini-2.5-flash, 45s timeout, NO generationConfig,
            returns ONLY candidates[0].content.parts[0].text  (line ~98)
            → finishReason, usage, safety data are DISCARDED here
  └─ parseAdaptationResponse(response.content)      // lines ~110–134
       ├─ extractJsonObject   (lines ~94–99): slice from FIRST "{" to LAST "}"
       ├─ JSON.parse
       └─ AdaptationResponseSchema.safeParse  (zod, src/models/schemas/ConversationSchema.ts:120)
  └─ on failure: log.warn("Adaptation response parse failed", {recipeId, reason, detail, responseSnippet})
       (lines ~193–198, shipped in 4c8f7e0)
```

Related files:

| File | Role |
|---|---|
| `src/prompts/recipeAdaptation.ts` | `buildAdaptationPrompt({recipe, reason, outputLanguage?})` — renders title + `- [<ingredient.id>] <qty> <unit> <name> (<notes>)` lines + `- [step-N]` lines + the JSON contract |
| `src/models/schemas/ConversationSchema.ts` | `AdaptationResponseSchema`: requires `summary`, `rationale` (min-1 strings), `considerations` (string[]), `ingredientChanges` / `stepChanges` (arrays of 3-way `z.union` discriminated by `changeType` add/remove/replace); `variantTitle`, `adaptedIngredients`, `adaptedSteps` optional |
| `src/services/AdaptationService.ts` | `buildVariantRecipe`: variant id `recipe_${Date.now()}`, new-ingredient ids `ing_${Date.now()}_${index}`, `parentId` flattened to root, unparseable quantity → 1 with `displayText` moved into `notes` |
| `src/utils/logger.ts` | Ring buffer 500 entries; compiled builds capture `info` and above (the parse-failure entry is `warn` → always captured); `exportLogs()` |

Behavior of `extractJsonObject` on malformed input (verified by running the
exact function on fixtures — these mappings matter for Gate 1):

| Model output | `reason` produced |
|---|---|
| Pure prose, no `{` at all | `no_json_found` |
| Response truncated BEFORE any `}` was emitted | `no_json_found` (not `json_parse_error` — cross-case trap) |
| Response truncated mid-object (some inner `}` present) | `json_parse_error`, detail like `Expected ',' or '}' after property value in JSON at position N` |
| Valid JSON followed by commentary that contains a `}` | `json_parse_error`, detail like `Unexpected non-whitespace character after JSON at position N` (the slice runs to the LAST `}`, swallowing the commentary) |
| ```json fenced block, otherwise valid | Parses fine — fences are already tolerated |
| Valid JSON, wrong shape | `schema_validation_failed`, detail = first 5 zod issues (unions report `code:"invalid_union"` with nested per-branch `errors`) |

---

## Phase 0 — Baseline: verify current state

Do this before anything else, in a fresh session. All read-only.

1. Read the pipeline source (confirm nothing shifted since this skill was written):

```bash
sed -n '92,135p' src/controllers/useAdaptationController.ts   # extractJsonObject + parseAdaptationResponse
sed -n '190,205p' src/controllers/useAdaptationController.ts  # failure log fields
sed -n '118,130p' src/models/schemas/ConversationSchema.ts    # AdaptationResponseSchema
git log --oneline -5 -- src/controllers/useAdaptationController.ts
```

2. Run the adaptation unit tests:

```bash
npx jest AdaptationService
```

**Expected**: 1 suite, **7 tests pass** (includes "flattens a
variant-of-a-variant into a sibling of the root"), under ~2 s.

3. Know the WHOLE-SUITE baseline so you don't misread pre-existing damage
as campaign fallout. As of 2026-07-02, `npx jest` gives:
**2 failed, 2 skipped, 8 passed suites; 1 failed, 3 skipped, 54 passed tests.**
The pre-existing failures (NOT yours to fix in this campaign — record as
findings, ask the owner):

| Pre-existing failure | Cause |
|---|---|
| `src/prompts/recipeAdaptation.test.ts` — 1 of 2 tests | Stale assertion: expects `"Write all user-facing text fields in Swedish."` but the prompt now appends `", even if the cook or the source material uses another language."` |
| `src/controllers/useRecipeController.test.tsx` — suite fails to load | `SyntaxError: Unexpected token 'export'` from `expo-sqlite` ESM: the controller imports `CookLogRepository` → `StorageService` → `expo-sqlite`, and that test mocks `RecipeRepository` but not `CookLogRepository`. Lesson reused in Phase 2: mock BOTH repositories |

Similarly, `npx tsc --noEmit -p .` is NOT clean at baseline (~11
pre-existing errors in `useMealPlanController`, `usePantryController`, and
view files — none in the parse pipeline). Your gate for later phases is
"no NEW tsc errors in files you touched", not "tsc exits 0".

**GATE 0** — proceed only when:

| Observation | Branch |
|---|---|
| 7/7 AdaptationService tests pass; parse fns match the map above | Proceed to Phase 1 |
| Jest dies with `__DEV__ is not defined` | `jest.setup.ts` lost its `__DEV__` shim (regression of `fe95299`). Fix that first — all google.ts tests are silently broken without it. See `sous-chef-failure-archaeology` |
| Parse functions/log fields differ from the map | This skill is stale. Re-derive the map from code, note the drift in "Provenance", then continue with the code's reality |
| AdaptationService tests fail | Someone changed variant semantics. STOP; read `git log -- src/services/AdaptationService.ts`; ask the owner before touching anything |

---

## Phase 1 — Evidence capture from the field

The failure has so far happened only on the owner's device. The enriched
log entry from `4c8f7e0` is the evidence. You cannot get it yourself;
give the owner these exact instructions.

### Owner instructions (copy-paste into your report)

1. Reproduce: open a recipe that is itself a saved variant (an adapted
   recipe), run an adaptation on it (any quick action, e.g. "Cheaper"),
   and confirm the "unexpected format" error appears.
2. **Do not restart the app** — the log buffer is in-memory and dies with
   the process (500-entry ring buffer; a long session can also scroll the
   entry out, so export promptly).
3. Optional but useful: on the Home screen, tap the sous-chef avatar
   6 times within ~1 s each. This flips the logger to `debug` level for
   the session (adds `LLM send` entries with prompt sizes). The
   parse-failure entry itself is `warn` and is captured even without this.
4. Go to **Settings → Debug section → Diagnostic log card → "Share log"**
   and send the export. (The Debug section is always visible since
   `7817213`.)

### Reading the export

The export is line-per-entry:
`[ISO timestamp]\t[module]\t[LEVEL]\tmessage\t{json details}`.

```bash
grep "Adaptation response parse failed" sous-chef-log.txt
grep "LLM response received" sous-chef-log.txt     # ms + responseLength for the same call
grep -c "Running adaptation" sous-chef-log.txt     # attempt count (denominator, Phase 4)
```

Fields in the failure entry (module `useAdaptationController`, level WARN):

| Field | Meaning |
|---|---|
| `recipeId` | Which recipe was being adapted — confirm it is a variant (`recipe_<epoch-ms>` id and/or `parentId` set) |
| `reason` | `no_json_found` \| `json_parse_error` \| `schema_validation_failed` |
| `detail` | `json_parse_error`: the `JSON.parse` error message with position. `schema_validation_failed`: JSON of the first 5 zod issues. Absent for `no_json_found` |
| `responseSnippet` | **First 500 chars** of the raw model response. NOTE THE LIMITATION: you see the head, not the tail — truncation evidence at the end of the response is invisible. Correlate with `responseLength` from the adjacent `LLM response received` entry |

Preserve the raw export verbatim (it is the incident's primary evidence;
later, append the outcome to `sous-chef-failure-archaeology`).

### GATE 1 — branch on `reason`

| `reason` | What it means | Expected supporting evidence | Branch |
|---|---|---|---|
| `no_json_found` | Model returned prose (or was truncated before ANY `}` — check `responseLength`: prose refusals are typically short, truncation-before-close needs a long response with no `}` in the snippet region) | Snippet reads as sentences/markdown, no `{` | Prompt-drift path: Phase 3 option 1 (JSON mode) with option 2 (prompt hardening) as the cheap first probe |
| `json_parse_error` | Malformed JSON: truncation mid-object OR trailing commentary containing `}` | `detail` says `Expected ',' or '}' ... at position N` (position near `responseLength` ⇒ truncation-shaped) or `Unexpected non-whitespace character after JSON` (⇒ trailing commentary) | Truncation-shaped: Phase 3 option 3 (finishReason/maxOutputTokens) first. Commentary-shaped: options 1/2 |
| `schema_validation_failed` | Valid JSON, wrong shape (missing `summary`/`rationale`, `changeType` outside add/remove/replace, snapshot missing `displayText`/`name`, empty strings hitting `.min(1)`, …) | `detail` zod issues name exact paths | Shape-drift path: options 1 and 2; option 5 (schema tolerance) only as last resort and only for fields the zod issues actually name |
| Entry missing entirely | Repro didn't fail, buffer scrolled/restarted, or the error came from the `catch` path (`Adaptation LLM call failed` = transport, different bug) | — | Missing entry: re-run owner loop. Transport error: this is NOT the parse bug — switch to `sous-chef-debugging-playbook` |

If the reason is ambiguous (e.g. `no_json_found` with a large
`responseLength`), a one-file, consented logging enrichment is the next
safest step: add the response TAIL (e.g. last 300 chars) and the total
length to the existing warn entry in `useAdaptationController.ts`.
Controller layer, additive, no behavior change — but still plan + consent.

---

## Phase 2 — Lab repro

Goal: reproduce the failure OFF the device, so fixes can be validated in
seconds instead of owner-repro cycles.

### 2.1 Test-enablement edit (one file, needs consent)

`parseAdaptationResponse` and `extractJsonObject` are **module-private**
— they cannot be imported by a test today. The minimal enabling edit is
adding the `export` keyword to both `const` declarations in
`src/controllers/useAdaptationController.ts`. Behavior-preserving, one
file, controller layer. Plan it, get consent, make only that change.

### 2.2 Fixture test through the REAL parse pipeline (one new file)

New file `src/controllers/useAdaptationController.test.ts`. Two traps,
both learned from the baseline suite:

- Importing the controller module executes `new RecipeRepository()` and
  `new CookLogRepository()` at module load → `expo-sqlite` ESM crash
  unless BOTH repositories are mocked (this exact miss is why
  `useRecipeController.test.tsx` fails today).
- `chefProfileStore` pulls AsyncStorage via zustand `persist` → mock
  AsyncStorage too.

Skeleton (verified against the real signatures; `jest.mock` calls are
hoisted above imports by babel-jest):

```ts
jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock("../models/repositories/RecipeRepository", () => ({
  RecipeRepository: jest.fn(() => ({})),
}));
jest.mock("../models/repositories/CookLogRepository", () => ({
  CookLogRepository: jest.fn(() => ({})),
}));
// Repo test idiom: stores are always mocked in controller tests
// (see useRecipeController.test.tsx) — keeps the import graph minimal.
jest.mock("../store/chefProfileStore", () => ({ useChefProfileStore: jest.fn() }));
jest.mock("../store/settingsStore", () => ({ useSettingsStore: jest.fn() }));

import { parseAdaptationResponse } from "./useAdaptationController";

const VALID_MINIMAL = JSON.stringify({
  summary: "Cheaper take.",
  rationale: "Swapped costly items.",
  considerations: [],
  ingredientChanges: [],
  stepChanges: [],
});

describe("parseAdaptationResponse", () => {
  it("accepts a minimal valid payload", () => {
    expect(parseAdaptationResponse(VALID_MINIMAL).data).not.toBeNull();
  });

  it("accepts a fenced payload", () => {
    const fenced = "```json\n" + VALID_MINIMAL + "\n```";
    expect(parseAdaptationResponse(fenced).data).not.toBeNull();
  });

  it("classifies prose as no_json_found", () => {
    const r = parseAdaptationResponse("Happy to help! Here is my plan.");
    expect(r.failureReason).toBe("no_json_found");
  });

  it("classifies truncation before ANY closing brace as no_json_found", () => {
    // Cross-case trap: no "}" survives, so extractJsonObject returns null.
    const r = parseAdaptationResponse(VALID_MINIMAL.slice(0, 40));
    expect(r.failureReason).toBe("no_json_found");
  });

  it("classifies mid-object truncation (some inner objects closed) as json_parse_error", () => {
    const truncated =
      '{"summary":"Cheaper take.","rationale":"Swapped costly items.","considerations":[],' +
      '"ingredientChanges":[{"id":"c1","changeType":"add","targetType":"ingredient",' +
      '"after":{"displayText":"1 lime","name":"lime"}},{"id":"c2","changeType":"remove","targe';
    const r = parseAdaptationResponse(truncated);
    expect(r.failureReason).toBe("json_parse_error");
  });

  it("classifies an unknown changeType as schema_validation_failed", () => {
    const bad = JSON.stringify({
      summary: "x", rationale: "y", considerations: [],
      ingredientChanges: [{
        id: "c1", changeType: "modify", targetType: "ingredient",
        after: { displayText: "1 lime", name: "lime" },
      }],
      stepChanges: [],
    });
    expect(parseAdaptationResponse(bad).failureReason)
      .toBe("schema_validation_failed");
  });

  // THE POINT OF THIS FILE: paste the captured field payload here.
  // responseSnippet is only 500 chars; if the full response is available
  // use it, otherwise assert on the reason the snippet reproduces.
  it.skip("reproduces the field failure of 2026-07-02", () => {
    const captured = `<paste responseSnippet / full response here>`;
    const r = parseAdaptationResponse(captured);
    expect(r.failureReason).toBe("<reason from the field log>");
  });
});
```

Run: `npx jest useAdaptationController` — expect all non-skipped tests
green before pasting the captured payload.

### 2.3 Live smoke repro: REAL model, REAL prompt, variant-shaped recipe (one new file)

This drives the actual failure path: `buildAdaptationPrompt` over a
recipe shaped exactly like `AdaptationService.buildVariantRecipe` output.
Modeled on `src/models/api/llm/google.smoke.test.ts` (calls
`googleProvider` directly, bypassing the LLMService queue). **Spends real
quota; run deliberately and sparingly.**

New file `src/controllers/useAdaptationController.smoke.test.ts`:

```ts
// Live smoke — opt-in, makes a real Gemini call and spends quota.
// Run: RUN_LLM_SMOKE=1 EXPO_PUBLIC_GEMINI_API_KEY=<key> npx jest useAdaptationController.smoke
jest.mock("expo/virtual/env", () => ({ env: process.env }));
jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: { getItem: jest.fn().mockResolvedValue(null) },
}));
jest.mock("../models/repositories/RecipeRepository", () => ({
  RecipeRepository: jest.fn(() => ({})),
}));
jest.mock("../models/repositories/CookLogRepository", () => ({
  CookLogRepository: jest.fn(() => ({})),
}));
jest.mock("../store/chefProfileStore", () => ({ useChefProfileStore: jest.fn() }));
jest.mock("../store/settingsStore", () => ({ useSettingsStore: jest.fn() }));

import { googleProvider } from "../models/api/llm/google";
import type { ChefProfile, Recipe } from "../models/types";
import { buildAdaptationPrompt, buildSystemPrompt } from "../prompts";
import { parseAdaptationResponse } from "./useAdaptationController";

const RUN = process.env.RUN_LLM_SMOKE === "1";
const describeSmoke = RUN ? describe : describe.skip;

const profile: ChefProfile = {
  id: "chef-smoke",
  name: "Smoke Tester",
  skillLevel: "home cook",
  preferences: { dietary: [], dislikedIngredients: [], cuisinePreferences: [] },
  region: "Denmark",
  currency: "DKK",
  createdAt: "2026-07-01T00:00:00.000Z",
};

// Shaped like AdaptationService.buildVariantRecipe output: recipe_<epoch> id,
// parentId set, MIXED ingredient ids (original + ing_<epoch>_<idx>), an
// empty unit, and notes carrying a displayText fallback — the exact shape
// of the 2026-07-02 failing case (adapting an already-adapted variant).
const variantRecipe: Recipe = {
  id: "recipe_1783008233834",
  parentId: "recipe_1782900000000",
  title: "Nourishing kale and quinoa version",
  description: "A lighter, greener take on the original.",
  categoryId: null,
  servings: 2,
  prepMinutes: 10,
  cookMinutes: 20,
  ingredients: [
    { id: "ing-1", name: "spaghetti", quantity: 200, unit: "g" },
    { id: "ing_1783008233834_1", name: "kale", quantity: 1, unit: "", notes: "a generous handful of kale" },
    { id: "ing_1783008233834_2", name: "quinoa", quantity: 0.5, unit: "cup" },
  ],
  steps: [
    { order: 1, instruction: "Boil the pasta until al dente." },
    { order: 2, instruction: "Fold in the kale and cooked quinoa." },
  ],
  tags: ["pasta"],
  createdDate: "2026-07-02T00:00:00.000Z",
  lastUpdatedDate: "2026-07-02T00:00:00.000Z",
};

describeSmoke("adaptation live smoke (variant-of-variant)", () => {
  it("returns JSON the real parse pipeline accepts", async () => {
    const response = await googleProvider.send({
      system: buildSystemPrompt(profile),
      messages: [{
        role: "user" as const,
        content: buildAdaptationPrompt({
          recipe: variantRecipe,
          reason: "Make this cheaper using more affordable ingredients.",
        }),
      }],
    });

    const parsed = parseAdaptationResponse(response.content);
    if (!parsed.data) {
      // Repro harness: dump full evidence before failing.
      console.error("PARSE FAILURE", {
        reason: parsed.failureReason,
        detail: parsed.failureDetail,
        length: response.content.length,
        head: response.content.slice(0, 500),
        tail: response.content.slice(-500),
      });
    }
    expect(parsed.data).not.toBeNull();
  }, 60000);
});
```

The bug is intermittent (3 failures after 1 success in the field), so one
green run proves little. Run it a handful of times
(`for i in 1 2 3 4 5; do RUN_LLM_SMOKE=1 EXPO_PUBLIC_GEMINI_API_KEY=<key> npx jest useAdaptationController.smoke; done`)
— mind free-tier RPM limits; a 429 here is rate limiting, not the bug.

### GATE 2

| Observation | Branch |
|---|---|
| Captured field payload reproduces in the fixture test | Root cause class CONFIRMED. Pick the matching Phase 3 option; the fixture becomes the regression test for the fix |
| Smoke reproduces the failure | Save head+tail+length output as evidence; you now have a fast repro loop. Proceed to Phase 3 |
| Smoke never fails across ~5+ runs and no captured payload exists yet | Do NOT declare it unreproducible. Return to Phase 1 (field capture). If field capture also stays silent, the diagnostic logging itself may be the next thing to strengthen (tail snippet enrichment, Phase 1 footnote) |
| Fixture behaves differently than the field log claims | Your fixture differs from the real payload (usually the missing tail beyond 500 chars). Get the full response via the smoke harness or enriched logging before concluding anything |

---

## Phase 3 — Solution menu, RANKED (pick with evidence, not preference)

Each option lists its obligations. An option applied without its
obligations is a regression waiting to happen. One option at a time; if
an option fails twice, invoke the iteration-trap rule and come back here.

| Rank | Option | Fixes which `reason` | Blast radius |
|---|---|---|---|
| 1 | Gemini native JSON mode | `no_json_found`, `json_parse_error` (commentary), most `schema_validation_failed` | Multi-file (llmApi.ts + google.ts + controller) |
| 2 | Prompt hardening for variants | Prompt-drift flavors of all three | One file (prompt layer) |
| 3 | Surface `finishReason` / set `maxOutputTokens` | Truncation-shaped `json_parse_error` / `no_json_found` | One file (google.ts) for logging; more for programmatic use |
| 4 | Repair-and-retry loop (cap 1) | Symptom mitigation for all three | One file (controller) |
| 5 | Schema loosening (zod) | Only `schema_validation_failed`, only named fields | One file (schema) — but downstream consumers must be audited |

### Option 1 — Gemini native JSON mode (strongest structural fix)

Add `generationConfig: { responseMimeType: "application/json" }`
(optionally + `responseSchema`) to the adaptation request. Precedent for
`generationConfig` in the request body already exists in this repo:
`src/models/api/image/googleImage.ts` sends
`generationConfig: { responseModalities: ["TEXT", "IMAGE"] }`.

**Obligations, in order:**

1. **Curl-verify the API shape FIRST** (no provider claims without a raw
   body — house rule). Never paste a real key into a file:

```bash
curl -sS "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$GEMINI_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "contents": [{"role":"user","parts":[{"text":"Give me two colors as a JSON array of strings."}]}],
    "generationConfig": {"responseMimeType": "application/json"}
  }'
```

   Expected: HTTP 200, `candidates[0].content.parts[0].text` is bare JSON
   (no fences), and the response carries `finishReason`. Then probe
   `responseSchema` separately: `AdaptationResponseSchema` uses 3-way
   unions discriminated by `changeType` — verify empirically whether the
   API's schema dialect can express that (union/`anyOf` support varies by
   model/API version). If it can't, ship `responseMimeType` WITHOUT
   `responseSchema` — that alone eliminates prose and fences; zod remains
   the shape gate.
2. **It must be request-scoped, not global.** The same `send()` serves
   the adaptation PLAN call (`requestPlan` in the controller) and
   conversation — those expect prose. Forcing JSON mode inside
   `toGeminiMessages` or unconditionally in `send()` breaks them. The
   architecture-correct path is an optional field on `LLMRequest` (e.g.
   `responseFormat?: "json"`) in `src/models/api/llmApi.ts`, honored by
   `google.ts` `send()`, set only by the adaptation call. That is a
   **three-file change → three consented passes** (model contract →
   provider → controller), app allowed to be broken between passes per
   the refactor-pass policy. Note: `anthropic.ts` also implements
   `LLMProvider`; an optional field it ignores is safe.
3. **Confirm the streaming path is untouched**: `google.ts` `stream()`
   shares `toGeminiMessages` — verify your change adds `generationConfig`
   in the `send()` body only. Conversation streaming must keep working.
4. **Feature-gate the rollout**: the minimal flag is per-callsite
   adoption — adaptation first, nothing else. A settings-based flag is a
   cross-layer settings change (see `sous-chef-config-and-settings`);
   don't build it unless the owner asks.
5. **Measure before/after** with the Phase 4 metric. Keep the diagnostic
   warn logging in place — it is the instrument.

### Option 2 — Prompt hardening for variants (cheapest probe)

The failing case is a variant: its prompt differs from a base recipe's —
ids like `ing_1783008233834_2` instead of `ing-1`, possibly empty `unit`
(renders as `- [ing_…] 1 kale`), and `notes` that carry a whole
`displayText` fallback. None of this is degenerate on code inspection,
so **inspect before fixing**: extend `src/prompts/recipeAdaptation.test.ts`
with a variant-shaped recipe (reuse the fixture from 2.3) and eyeball the
rendered prompt (`console.log` locally / snapshot assertion in the test).
If a formatting defect appears, fix `formatIngredientLine`/`formatStepLine`
in `src/prompts/recipeAdaptation.ts`. Candidate (unproven) hardening if no
defect is visible: restate the JSON-only instruction at the END of the
prompt (recency position). Obligations: one file per pass (test pass,
then prompt pass); keep both existing prompt tests' intent intact
(one is already stale at baseline — see Phase 0); prompt changes affect
EVERY adaptation, so re-run the 2.3 smoke after.

### Option 3 — Truncation detection: `finishReason` + `maxOutputTokens`

`google.ts` line ~98 keeps only the text and **discards
`candidates[0].finishReason`** — the one field that says definitively
whether Gemini stopped early (`MAX_TOKENS`) or finished (`STOP`).

- **Step 1 (one file, low risk, do this if Gate 1 said truncation-shaped):**
  in `google.ts` `send()`, log a `warn` when `finishReason` exists and is
  not `"STOP"`. Logging only; no interface change; compiled builds capture
  it. This converts "candidate cause" into evidence.
- **Step 2 (only with Step-1 evidence):** setting
  `generationConfig.maxOutputTokens` does NOT fix truncation — it moves
  it. The failing responses were 5–6 KB (roughly 1.5–2K tokens), far
  below the model's output ceiling, so plain output-cap truncation is
  UNLIKELY; note (unverified) that gemini-2.5-flash "thinking" tokens can
  consume output budget. Programmatic handling (surfacing `finishReason`
  through `LLMResponse`) is a multi-file contract change — same
  consent/passes shape as option 1 obligation 2.

### Option 4 — Repair-and-retry loop (mitigation, not a fix)

On parse failure in `runAdaptation`, send ONE follow-up message: the
previous response + the parse error (`reason`/`detail`) + "return only
the corrected JSON object". One file (controller).

**Obligations:** hard cap at exactly 1 repair attempt; user-priority only
(the adaptation call already defaults to `"user"`); log the repair
attempt (it must show in the Phase 4 metric as a failure-then-repair, not
be silently absorbed); **do not ship this before Phase 1/2 evidence is
captured** — it masks the signal the campaign depends on. Cost: one extra
quota-burning call per failure — remember `377e3a4` (blind 429 retries
tripled quota burn); this is acceptable only because it is capped,
logged, and error-conditioned.

### Option 5 — Schema loosening (LAST resort)

Precision matters here: zod objects (v4.4.3 in this repo) already
**strip unknown keys without failing**, so extra fields from the model
are NOT a failure cause, and `.passthrough()`/`z.looseObject()` would fix
nothing. Loosening that could matter: making a required field
`.optional()`, adding `.catch()` defaults, or relaxing `.min(1)` — and
each of those weakens data that `AdaptationService.buildVariantRecipe`
consumes directly (`summary` → variant description, `considerations` →
chefsNotes, the change unions drive ingredient/step rewriting, where
`before`/`after` presence is assumed per `changeType`).

**Obligations:** only loosen fields that the captured zod issues actually
name; document every loosened field and why next to the schema; verify
`AdaptationService.test.ts` still passes and add a case for the loosened
shape; never loosen the discriminated unions themselves.

### Wrong paths — FENCED OFF

| Do not | Why |
|---|---|
| Switch models as a first response | The `8bc7dc4` goose-chase: a model swap "fixed" a quota-zeroed model by accident of symptoms; the real fix (`ecebc53`) came from a curl matrix. Here the responses are HTTP-successful — model availability is not the failure |
| Switch provider to Anthropic | `anthropic.ts` exists but is not wired, and the account is unfunded (no free tier). A provider swap is a campaign of its own, not a parse fix |
| Blind-retry on parse failure | `377e3a4` lesson. Retries without a cap, a log, and a changed request just burn quota and hide the bug |
| Silently truncate or trim recipe context in the prompt | Destroys adaptation quality to chase an unconfirmed truncation theory; the longest field response SUCCEEDED |
| Add a JSON-repair dependency | Dependency rule: no new packages. The repair loop (option 4) covers the same ground with a model round-trip |
| Apply JSON mode globally in `toGeminiMessages` | Breaks plan/conversation prose paths — see option 1 obligation 2 |

---

## Phase 4 — Validation and promotion

### The metric

**Parse failures per adaptation attempt**, from exported field logs
(both lines are `info`+ → captured in compiled builds):

```bash
ATTEMPTS=$(grep -c "Running adaptation" sous-chef-log.txt)
FAILURES=$(grep -c "Adaptation response parse failed" sous-chef-log.txt)
echo "$FAILURES / $ATTEMPTS"
```

Record the pre-fix rate from the Phase 1 export before shipping anything.
Ring-buffer caveat: 500 entries per app session — the owner should export
after each test session, not at the end of the week.

### Acceptance

- All Phase 2 fixture tests pass, including the pasted captured payload.
- `npx jest AdaptationService` still 7/7; no NEW failures vs the Phase 0
  suite baseline; no NEW tsc errors in touched files.
- 2–3 consecutive green runs of the 2.3 live smoke.
- **0 parse failures across N = 10 owner-run adaptations on device, of
  which at least 3 are variant-of-variant** (the failing shape). Honesty
  note: with an intermittent bug, 0/10 is a pragmatic bar, not proof —
  which is why the diagnostic warn logging stays in the code permanently.

### Promotion (change control — no shortcuts)

1. Every code change: plan → owner consent → one file per pass →
   post-change report in the standard response shape.
2. Getting the fix onto the owner's device requires a push to `dev`,
   which auto-triggers a quota-consuming EAS RC build. **Explicit owner
   confirmation BEFORE the push, every time.** (Pushes touching only
   docs/skills/CI config are exempt per `6928c9f` — a code fix is not.)
3. After acceptance: extend the open-bug entry in
   `sous-chef-failure-archaeology` with root cause, evidence, fix SHA,
   and the before/after metric; flag any ARCHITECTURE.md impact to the
   owner (never edit that doc silently).
4. If two shipped attempts fail acceptance: iteration trap. Declare the
   rabbit hole, roll back, and re-open the solution menu with the new
   evidence.

---

## When NOT to use this

| Situation | Use instead |
|---|---|
| Error is transport-shaped: 429/400/403/503, hangs, "Could not run the adaptation" / "Could not reach the sous chef" (the `catch` path, not the parse path) | `sous-chef-debugging-playbook`, then `sous-chef-failure-archaeology` |
| You need the Gemini probe scripts, log-format reference, or EAS build inspection | `sous-chef-diagnostics-and-tooling` |
| You're forming/testing a theory and need the evidence discipline itself | `sous-chef-investigation-methodology` |
| General LLM-layer knowledge (queue, priorities, providers, prompts) or building a NEW LLM feature | `sous-chef-llm-reference` |
| Deciding what counts as "verified", or writing tests outside this campaign | `sous-chef-validation-and-qa` |
| Any question about edit discipline, branches, consent, pushes | `sous-chef-change-control` |
| Where a new file/function belongs; doc-vs-code drift | `sous-chef-architecture-contract` |

## Provenance and maintenance

Written 2026-07-02 against `dev` at `de579d6` (facts re-verified against
the working tree on 2026-07-03). The bug is OPEN; Phase 0/baseline facts
are the most volatile. Re-verify before trusting:

| Fact | Re-verify with |
|---|---|
| Parse fns private, at lines ~94–134; warn fields at ~193–198 | `grep -n "extractJsonObject\|parseAdaptationResponse\|responseSnippet" src/controllers/useAdaptationController.ts` |
| Schema location + required fields | `grep -n "AdaptationResponseSchema" -A 10 src/models/schemas/ConversationSchema.ts` |
| AdaptationService 7/7 pass | `npx jest AdaptationService` |
| Whole-suite baseline (2 failed / 2 skipped / 8 passed suites) | `npx jest 2>&1 \| tail -5` |
| tsc NOT clean at baseline (~11 pre-existing errors, none in pipeline files) | `npx tsc --noEmit -p . 2>&1 \| head -20` |
| No JSON mode / maxOutputTokens / finishReason handling in text path | `grep -rn "generationConfig\|responseMimeType\|maxOutputTokens\|finishReason" src/models/api/` (expect one hit: googleImage.ts responseModalities) |
| Model + provider wiring | `grep -n "DEFAULT_MODEL" src/models/api/llm/google.ts; grep -n "activeProvider" src/models/api/llmApi.ts` |
| Bug still open / logging unchanged | `git log --oneline -5 -- src/controllers/useAdaptationController.ts` (top commit still `4c8f7e0` ⇒ nothing shipped since) |
| zod version + API surface (`.passthrough`, `looseObject`, `.catch` all present in 4.4.3) | `node -e 'const z=require("zod");const s=z.object({});console.log(require("zod/package.json").version, typeof s.passthrough, typeof z.looseObject, typeof s.catch)'` |
| Debug unlock + log export UI | `grep -n "Share log" src/views/screens/SettingsScreen.tsx; grep -n "markTapCount" src/views/screens/HomeScreen.tsx` |
| Gemini JSON-mode API shape (STATED FROM GENERAL KNOWLEDGE, not verified live here) | The option-1 curl, with a real key, before any implementation |
| Smoke-test gating pattern | `sed -n '1,20p' src/models/api/llm/google.smoke.test.ts` |

If any of these disagree with this file, the CODE WINS — update this
skill in the same pass you discover the drift, and say so in your report.
