# EPIC-006: Sign-up Step in the Intro Wizard

**Status:** active
**Created:** 2026-07-12
**Updated:** 2026-07-12 — owner answered Q1 and expanded scope (persisted pending-confirmation state + resend with grace period)
**Architecture baseline:** a8275d0 (dev)
**Source:** owner requirement during the Phase-1 device test.

---

## 1. BDD — User Flows

### Flow 1: Ask first, never block

```gherkin
Given a fresh install entering the intro wizard
When the wizard starts
Then sign-up is the first ask (directly after the welcome/value screen)
And the user can sign up in place or skip with one tap
And either way the wizard continues immediately — confirmation is never awaited
```

### Flow 2: Pending confirmation survives restarts

```gherkin
Given a user who signed up and has not yet clicked the confirmation mail
When they open Settings → Account at any later time (including after an app restart)
Then the section shows "confirmation pending for <email>" instead of a fresh sign-up ask
And the user may confirm whenever they want, or never — their choice, nothing nags
```

### Flow 3: Resend with grace period

```gherkin
Given a pending confirmation
When the user taps "Resend confirmation mail"
Then the mail is resent and the button disables for the grace period
And tapping within the grace period does nothing (no spam to the system or the user)
```

### Flow 4: Confirmation completes the loop

```gherkin
Given a pending confirmation whose mail was eventually clicked
When the user signs in
Then the pending state clears everywhere and the Account section shows signed-in
```

**Decisions (owner, 2026-07-12):**
- Sign-up is the wizard's first ask but never interrupts the flow.
- Pending state is persisted on-device (AsyncStorage, via a repository — not
  transient controller state, which today is lost on restart).
- Resend grace period: one constant, default 5 minutes (Supabase's own resend
  cooldown is ~60s; ours sits safely above it).
- Signing up with a different email replaces the pending record.

**Out of scope:** changes to auth mechanics themselves; Resend SMTP configuration
(dashboard-side, owner).

---

## 3. TDD — Testing Strategy

| Flow | Function under test | Authority | Tolerance |
|---|---|---|---|
| 2 | `PendingSignupRepository` get/save/clear round-trip | This epic's flows (new contract) | exact |
| 2,4 | `useAuthController` pending hydrate/persist/clear | Flows 2 & 4, mocked repo + service | exact |
| 3 | `useAuthController.resendConfirmation` grace gate | Flow 3, fake timers | exact |

Deliberately not tested: the Supabase resend network call itself (mocked at the
`SupabaseService` seam, like every other provider call).

---

## 4. Checklist

```md
[x] 1. Add PendingSignupRepository ({email, lastSentAt} on AsyncStorage via StorageService) with failing test first in src/models/repositories/PendingSignupRepository.test.ts — done when the round-trip test passes
[ ] 2. Add SupabaseService.resendSignUpConfirmation(email) in src/services/SupabaseService.ts — done when tsc + eslint pass (network seam, covered via mocks in item 3)
[ ] 3. Extend useAuthController: hydrate pending on mount, persist on null-session signUp, clear on signed-in, resendConfirmation() gated by RESEND_GRACE_MS — done when its new test passes
[ ] 4. AuthScreen: pending card shows the email + "Resend confirmation mail" (disabled within grace) — done when tsc + eslint pass
[ ] 5. Settings Account section: pending-confirmation state (email + resend) replaces the sign-up CTA in SettingsScreen.hooks.ts — done when tsc + eslint pass
[ ] 6. Settings Account section view wiring in SettingsScreen.tsx — done when tsc + eslint pass
[ ] 7. New onboarding route app/(onboarding)/sign-up.tsx reusing AuthScreen with a skip affordance, ordered first after welcome — done when tsc + eslint pass
```

---

## 5. Summary

### Architecture impact

- [x] Amends Description sections: §4 tree (new repository, new onboarding route)
  — via epic-closeout when the slices ship.

### North star deviation

No — offline-first holds: account remains optional, nothing blocks, nothing nags
(Constitution §9; the "never nagging" nudge philosophy in §1 extends naturally here).

### Open questions

| # | Question | Blocks |
|---|---|---|
| Q2 | Reuse AuthScreen as-is in the wizard shell, or a slimmer embedded variant? Default: reuse with skip affordance (item 7); revisit only if it feels wrong on device | Nothing |
| Q3 | "First thing" is read as first ask after the welcome/value screen, not before it — flag if you meant literally screen one | Item 7 only |
