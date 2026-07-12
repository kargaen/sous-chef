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

**Out of scope:** the content of the taste-profile / kitchen-setup screens themselves
(they stay placeholders until their own epics); this epic is navigation + first-run
gating only.

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
| Q1 | What marks onboarding "completed" for the first-run gate — a ChefProfile existing, or a dedicated flag? | The index redirect logic |
| Q2 | Does sign-up reuse `AuthScreen` inside the wizard shell as-is, or need a slimmer embedded variant with an explicit Skip button? (EPIC-006 Q2, carried) | The sign-up step |
