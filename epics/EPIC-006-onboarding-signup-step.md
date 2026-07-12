# EPIC-006: Sign-up Step in the Intro Wizard

**Status:** draft
**Created:** 2026-07-12
**Architecture baseline:** 6cd487b (dev)
**Source:** owner requirement during the Phase-1 device test: "that's fine as long as sign-up is asked during the intro wizard." Verified absent — the wizard (`(onboarding)/welcome → taste-profile → kitchen-setup`) never surfaces auth; the only entry is Settings → Account.

---

## 1. BDD — User Flows

```gherkin
Given a fresh install entering the intro wizard
When the user reaches the sign-up step
Then they can create an account (or sign in) for backup/restore
And they can skip it — an account is never required to use the app
And skipping leaves the Settings → Account path as the later entry point
```

```gherkin
Given a user who signed up mid-wizard with email confirmation pending
When they finish the wizard
Then the app continues normally, unauthenticated until they confirm + sign in
```

**Out of scope:** any change to auth itself — `AuthScreen`/`useAuthController`
ship as-is; this epic is wizard composition only.

---

## 5. Summary

### Architecture impact

- [x] Amends Description sections: §4 tree (one new onboarding route), when it ships.

### North star deviation

No — offline-first holds; the step is skippable and the app stays fully
functional without an account (Constitution §9).

### Open questions

| # | Question | Blocks |
|---|---|---|
| Q1 | Where in the wizard: before taste profile, or last (after kitchen setup)? | First slice |
| Q2 | Reuse `AuthScreen` as-is inside the wizard shell, or a slimmer embedded variant? | First slice |
