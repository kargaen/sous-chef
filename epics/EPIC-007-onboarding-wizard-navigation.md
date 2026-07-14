# EPIC-007: Onboarding Wizard Navigation

**Status:** draft
**Created:** 2026-07-12
**Architecture baseline:** afeeee3 (epic/006-onboarding-signup)
**Source:** discovered while implementing EPIC-006 item 7 — the intro wizard has no working step-to-step navigation, so "sign-up first, skip continues the flow" had no flow to plug into.

---

## 1. BDD — User Flows

```gherkin
Given a fresh install
When the app launches for the first time (onboarding not completed)
Then the wizard runs: welcome → sign-up → taste-profile → kitchen-setup
And each step has a way forward (Continue) and, where optional, Skip
And completing the last step lands the user in the app (tabs)
```

**Verified current state (2026-07-12):**
- `app/index.tsx` redirects straight to `/(tabs)` — onboarding is never entered on launch.
- `welcome`, `taste-profile`, `kitchen-setup` are `PlaceholderScreen` stubs with no
  Continue buttons and no `router.push` between them.
- `app/(onboarding)/sign-up.tsx` exists (EPIC-006 item 7, standalone) re-exporting
  `AuthScreen`, but nothing routes to it as a wizard step.
- The only entry is Settings' "Run intro wizard again" → `/welcome`, which dead-ends.

### Flow 2: Onboarding shell excludes the chat launcher

```gherkin
Given the user is anywhere in the onboarding wizard
When any onboarding screen renders
Then the floating chatbot launcher is not shown
And it renders only on the standard/tabs shell
```

Verified (owner device test, 2026-07-12): the launcher currently appears on the
welcome screen. It is mounted by the app shell globally rather than by the
tabs-only layout — this epic moves it so onboarding gets a clean shell.

**Out of scope:** the content of the taste-profile / kitchen-setup screens themselves
(they stay placeholders until their own epics); this epic is navigation + first-run
gating + the onboarding shell only. The welcome screen's real copy is its own later
slice — this epic only needs a Continue/Next affordance to exist.

---

## 3. TDD — Testing Strategy

Most of this epic is routing + layout composition, which the repo verifies by tsc +
eslint + owner device test (no RNTL harness covers RootLayout with expo-router
segments). The one unit-testable piece is the completion flag.

| Flow | Check | Authority |
|---|---|---|
| 2 | launcher hidden when `segments[0] === "(onboarding)"` | tsc/eslint + owner device |
| gate | `onboardingCompleted` default false; set true on finish | AppSettings schema test pattern |
| 1 | welcome → sign-up → taste-profile → kitchen-setup routes resolve; finish → tabs | owner device |

---

## 4. Checklist

```md
[x] 1. Hide the chat launcher on onboarding — app/_layout.tsx renders <AssistantShell/> only when useSegments()[0] !== "(onboarding)". One file. done when tsc/eslint pass and the launcher is gone from the welcome screen on device. (Q1-independent — ship first.)
[x] 2. Add onboardingCompleted:boolean (default false) to AppSettings — Settings.types.ts, then SettingsSchema.ts, then default_settings.ts (config triad, additive). done when the schema test covers the new field and tsc passes.
[x] 3. First-run gate — app/index.tsx redirects to /(onboarding)/welcome when settings.onboardingCompleted is false, else /(tabs); reads settings already loaded at boot. done when tsc/eslint pass and a reset DB lands on welcome.
[x] 4. Welcome step gains a Continue affordance → router.push("/(onboarding)/sign-up"). One file (WelcomeScreen). done when tsc/eslint pass.
[x] 5. Sign-up step continues the wizard — a wizard footer (Skip / Continue) around AuthScreen → /(onboarding)/taste-profile, without awaiting confirmation. done when tsc/eslint pass.
[x] 6. taste-profile Continue → kitchen-setup. One file. done when tsc/eslint pass.
[ ] 7. kitchen-setup Finish sets onboardingCompleted=true (useSettingsController.updateField) and router.replace("/(tabs)"). One file. done when tsc/eslint pass and finishing lands in tabs and does not re-show onboarding on relaunch.
```

---

## 5. Summary

### Architecture impact

- [x] Amends Description sections: §4 tree / routing, when it ships.

### North star deviation

No — onboarding stays skippable where it already is; sign-up in particular is
never blocking (EPIC-006 flow 1).

### Open questions

| # | Question | Blocks |
|---|---|---|
| Q1 | Completion signal: **recommended** a dedicated `onboardingCompleted` flag on AppSettings (loads at boot, before the index redirect; the placeholder taste/kitchen steps don't create a ChefProfile yet, so "profile exists" is not a reliable signal). Confirm before items 2-3, since the gate changes first-launch behavior for every install. | Items 2, 3 |
| Q2 | **Resolved:** reuse `AuthScreen` with a thin wizard footer (Skip / Continue) rather than a separate variant — item 5. | — |
