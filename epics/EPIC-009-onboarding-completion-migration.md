# EPIC-009: Onboarding Completion Migration

**Status:** closed
**Created:** 2026-07-13
**Architecture baseline:** 128cede (dev)
**Source:** flagged follow-up from EPIC-007 — the first-run gate defaults `onboardingCompleted` to false, so an existing install would be sent back through onboarding on the update that introduces the flag.

---

## 1. BDD — User Flows

### Flow 1: Existing install is treated as already onboarded

```gherkin
Given an install that has an app_settings blob saved before onboardingCompleted existed
When settings are loaded after updating to an EPIC-007 build
Then onboardingCompleted is migrated to true
And the user goes straight to the app, not the onboarding wizard
```

### Flow 2: Genuinely fresh install still onboards

```gherkin
Given a first-ever launch with no app_settings blob
When settings are loaded
Then onboardingCompleted is false
And the user enters the onboarding wizard
```

**The discriminator:** `SettingsRepository` persists an `app_settings` blob on first
`get()`. A pre-EPIC-007 install therefore has a blob that lacks the
`onboardingCompleted` key; a truly fresh install has no blob at all (raw === null →
`reset()`). "Blob exists but lacks the key" is the reliable "existing user" signal —
evaluated on the raw stored JSON, before the schema defaults it to false.

**Out of scope:** any change to the wizard itself or the gate (EPIC-007). This is a
one-time read-side migration in the settings repository only.

---

## 3. TDD — Testing Strategy

| Flow | Function under test | Authority |
|---|---|---|
| 1 | `SettingsRepository.get()` on a legacy blob → onboardingCompleted true, re-saved | mocked StorageService |
| 2 | `SettingsRepository.get()` with no blob → onboardingCompleted false | mocked StorageService |
| — | a blob that already has onboardingCompleted is left as-is (no false-positive migration) | mocked StorageService |

---

## 4. Checklist

```md
[x] 1. SettingsRepository.get(): when the stored blob exists but lacks the onboardingCompleted key, return settings with onboardingCompleted=true and persist. Failing test first in SettingsRepository.test.ts. One file (+ test). done when the three test cases pass and tsc/eslint are clean.
```

---

## 5. Summary

### Architecture impact

- [x] No change to ARCHITECTURE.md expected — read-side migration inside an existing repository, no new structure or contract.

### North star deviation

No — it preserves existing users' experience across an update; nothing about the product's behavior or offline-first model changes.

### Open questions

| # | Question | Blocks |
|---|---|---|
| Q1 | Migration keys off the settings blob's existence, not user data (recipes/profile). Acceptable? (A user who launched an old build even once has a blob, so this is correct; the only edge is someone who installed an old build and never opened it — no blob — who then correctly onboards.) | Nothing — assumed fine |
```
