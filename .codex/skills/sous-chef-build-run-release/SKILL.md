---
name: sous-chef-build-run-release
description: >
  Runbook for building, running, verifying, and releasing Sous Chef. Load this
  BEFORE: setting up a dev environment from scratch; running `npx expo start`,
  `npm test`, `npx tsc --noEmit`, or `npm run lint`; anything involving
  "build", "APK", "EAS", "RC", "release", "GitHub Actions", "workflow",
  "push to dev", "quota", "install on device", or "version bump"; explaining
  why a feature behaves differently in the compiled APK than in dev
  (`__DEV__` semantics); canceling or listing EAS builds; or preparing a
  master release. Contains THE CONSENT RULE: pushing to dev triggers a
  quota-consuming EAS build and requires explicit owner confirmation first.
---

# Sous Chef — Build, Run, Release

Sous Chef is a local-first React Native / Expo SDK 54 Android app, built in the
cloud by **EAS** (Expo Application Services — Expo's hosted build farm) and
distributed as an APK attached to a GitHub release. There is no app store, no
backend, no staging environment. One developer (GitHub: `kargaen`), two
branches that matter: `dev` (active) and `master` (dormant).

**Read section 7 (THE CONSENT RULE) before touching git push. It is the one
rule in this file whose violation costs real, non-refundable resources.**

---

## 1. Environment from scratch

| Requirement | Value | Notes |
| --- | --- | --- |
| Node | 20+ (CI pins Node 20) | No `.nvmrc` in repo. CI uses `actions/setup-node@v4` with `node-version: 20`. Match major 20 or newer. |
| Package manager | npm (lockfile: `package-lock.json`) | Do not introduce yarn/pnpm. |
| Install command | `npm ci` | Clean, lockfile-exact install. Use this, not `npm install`, unless you are intentionally changing dependencies (which requires owner approval per root CLAUDE.md). |

```bash
cd /path/to/sous-chef
npm ci
```

Known traps on a fresh clone:

- **`npm audit` noise is normal.** `npm ci` may report vulnerabilities. Do not
  "fix" them by bumping dependencies — Expo SDK 54 pins the React Native
  dependency graph tightly and unsolicited bumps break builds. Ignore unless
  the owner asks.
- **`npm run reset-project` is broken by design-drift.** `package.json`
  declares `"reset-project": "node ./scripts/reset-project.js"` but the
  `scripts/` directory does not exist (leftover from the Expo template).
  Never run it; never "helpfully" recreate it.
- **No `.env` in the repo.** `.env` is gitignored. For local dev, create one
  with `EXPO_PUBLIC_GEMINI_API_KEY=<your key>` (and optionally
  `EXPO_PUBLIC_GEMINI_MODEL=<model>`). Never commit it, never echo keys into
  logs or CI.

---

## 2. Dev loop

```bash
npx expo start
```

Then press `a` for Android emulator, or scan the QR with Expo Go / a dev
client on a physical device.

Dev-mode (`__DEV__ === true`) semantics you get for free in this loop:

- **Env API key fallback active** — `src/models/api/llm/google.ts` resolves
  the Gemini key as: AsyncStorage `app_settings.geminiApiKey` first, then
  `EXPO_PUBLIC_GEMINI_API_KEY` from `.env`. So the app works without entering
  a key in Settings.
- **Model override active** — Settings → Debug → "Model override" writes
  `app_settings.geminiModel`, which wins over `EXPO_PUBLIC_GEMINI_MODEL` and
  the pinned default `gemini-2.5-flash` (dev only).
- **Debug log level** — `src/utils/logger.ts` captures `debug` and above
  (compiled builds drop `debug`).
- **Safety-layer skip honored** — the Settings toggle `skipSafetyLayer1`
  actually skips input classification (dev only).

All four of these silently turn off in compiled builds — see section 4.

---

## 3. Verification loop

Run all three before declaring any change done. None of them consume quota or
touch the network (except jest's opt-in smoke tests, which stay skipped
without `RUN_LLM_SMOKE=1`).

| Check | Command | What it is |
| --- | --- | --- |
| Tests | `npm test` (or `npx jest <pattern>` for one file) | Jest, babel-jest transform, node env, `@/` → `src/`, setup in `jest.setup.ts`. 12 test files; coverage is thin (stores, utils, most services/controllers/repos untested) — green tests are necessary, not sufficient. |
| Types | `npx tsc --noEmit -p .` | TypeScript strict mode; catches what jest's thin coverage misses. |
| Lint | `npm run lint` | Runs `expo lint` (ESLint 9, `eslint-config-expo`). |

Trap: `jest.setup.ts` manually defines `__DEV__ = true` for the test
environment. This was missing until commit `fe95299`, which silently broke
every `google.ts` test (dev-only code paths never executed). If tests around
`__DEV__`-gated code behave strangely, check that setup file first.

Optional live smoke test (real network call, spends tokens — opt-in only):

```bash
RUN_LLM_SMOKE=1 EXPO_PUBLIC_GEMINI_API_KEY=<key> npx jest google.smoke
```

(The image-generation case inside it is `it.skip`'d — Gemini's free tier
removed image generation. Do not un-skip it.)

---

## 4. Compiled-build semantics (`__DEV__ === false`)

**Critical trap:** `__DEV__` is `false` in ALL EAS builds — including the
`preview` profile used for RC builds. "RC build" does not mean "dev build".
Consequences, verified in code:

| Behavior | Dev (`npx expo start`) | Any compiled APK (RC or release) | Where enforced |
| --- | --- | --- | --- |
| Gemini API key source | Settings key, else `.env` `EXPO_PUBLIC_GEMINI_API_KEY` | **Device Settings key ONLY.** Env fallback returns `""`. | `getEnvApiKey` in `src/models/api/llm/google.ts` |
| Model selection | Settings override → env `EXPO_PUBLIC_GEMINI_MODEL` → `gemini-2.5-flash` | Env var (baked at build time) → default. **Settings override ignored.** | `getModel` in `src/models/api/llm/google.ts` |
| Log capture | `debug` and above | **`info` and above** (debug dropped) | `DEFAULT_CONFIG` in `src/utils/logger.ts` |
| Skip safety Layer 1 toggle | Honored | **Hard-blocked** (Settings copy says so explicitly) | `__DEV__` gate in SafetyService path |

Practical implications:

- A fresh APK install has **no API key**. Every LLM feature fails until the
  user enters a key in Settings. "Works in expo start, dead in the APK" is
  almost always this.
- If you need a `debug`-level log line visible in a field APK, promote it to
  `info` before the build.
- Field debugging channel: Settings → Debug → "Diagnostic log" → **Share
  log**. Exports the in-memory ring buffer (last 500 entries, resets on app
  restart — capture soon after the incident). This is the ONLY way to get
  logs off a compiled build.

---

## 5. The two workflows, dissected

Both live in `.github/workflows/`. Both build the same EAS `preview` profile
(APK, per `eas.json`); they differ in trigger and release target.

### 5a. `rc-android.yml` — the live one

**Trigger: push to `dev` that touches at least one non-exempt file.** The
workflow has a `paths-ignore` filter (verified, lines 10–13) exempting
`.claude/**`, `**.md`, and `.github/**` — so a docs-only (`.md`), skills-only,
or CI-config-only push does **not** build. Workflow-file changes are themselves
ignored, so test a workflow edit by bundling it with a code change. Any push
that touches even one file outside those globs (i.e. real `src/` code) fires an
EAS build — this is why the consent rule (section 7) exists. Treat every
code-touching push to `dev` as requiring explicit owner confirmation first;
docs/skills-only pushes are exempt from the build but still follow normal
change discipline.

Step-by-step:

| Step | What | Why |
| --- | --- | --- |
| `concurrency` block | Group `rc-android-${{ github.ref }}`, `cancel-in-progress: true` | Rapid pushes cancel the older *workflow run*. |
| Checkout / Node 20 / `npm ci` | Standard setup | — |
| `expo/expo-github-action@v8` | Installs EAS CLI, authenticates via repo secret `EXPO_TOKEN` | — |
| **Cancel stale RC builds** | Loops statuses `new`, `in-queue`, `in-progress`; for each, `eas build:list --platform android --build-profile preview --status $STATUS --non-interactive --json --limit 10 \| jq -r '.[].id'`, then `eas build:cancel $ID` | **The reason this exists:** GitHub's concurrency cancellation stops the workflow run but CANNOT reach an EAS build already submitted to Expo's servers by an earlier run. Without this step, every rapid push leaves its predecessor's build queued/running on Expo, burning monthly quota. Added in commit `db46ed0` after the 2026-07-02 incident (4 stacked builds). |
| Build | `eas build --platform android --profile preview --non-interactive --json`, stderr redirected so `jq` sees clean JSON; extracts `.[0].artifacts.buildUrl` | Blocks until the cloud build finishes. |
| Download | `curl -fL <url> -o sous-chef.apk` | — |
| Resolve tag | `BASE=$(echo "$FULL" \| sed 's/-rc.*//')` on `package.json` version → tag `v{BASE}-rc` | With version `1.0.1-rc.5`, the tag is **`v1.0.1-rc`** — fixed per base version. |
| Release | `softprops/action-gh-release@v2`, `prerelease: true` | **Overwrites** the same prerelease tag every time. The RC release is always the latest dev build; history is not kept. |

### 5b. `release-android.yml` — the dormant one

**Trigger: push to `master`, any `v*` tag, or manual `workflow_dispatch`.**
Same build steps but: no stale-cancel step, tag is the full
`v{package.json version}` (would currently produce `v1.0.1-rc.5` — see
section 9), and `prerelease: false`.

**Currently dormant: `master` is ~74 commits behind `dev`** (verify:
`git rev-list --count master..dev`). Master's last commit predates
essentially all app development.

To do a real release (all steps need owner consent — this merges and pushes):

1. Owner decides `dev` is release-worthy.
2. Bump `package.json` `version` to a clean semver (e.g. `1.0.1`, dropping
   `-rc.N`) so the release tag isn't an rc-suffixed string. Reconcile
   `app.json` drift while at it (section 9).
3. Merge `dev` → `master` and push — this consumes one EAS build.
4. Workflow builds and publishes GitHub release `v<version>` with the APK.

Note the two workflows share the `preview` EAS profile, so a master release
is also an APK, not the `production` app-bundle profile defined in
`eas.json`. That is current intended behavior (sideload distribution, no
Play Store).

---

## 6. EAS economics

Free-tier facts (Expo pricing as of 2026-07 — re-verify at
https://expo.dev/pricing before relying on exact numbers):

| Fact | Value |
| --- | --- |
| Free Android builds | 15 per month (plus 15 iOS — unused; this is Android-only) |
| Reset | Calendar month, on the 1st |
| Builds that fail within ~3 minutes | Not counted against quota |
| Canceled builds | Free only if canceled **before processing started**; count once processing began |

So: every push to `dev` spends 1/15 of the month's budget. A day of normal
push-per-change iteration can exhaust it. This has happened — one prior month
was fully exhausted, blocking all builds for days.

Useful commands (need EAS auth: `EXPO_TOKEN` env var or `eas login`; read
operations are safe):

```bash
# What is queued/running/finished this month?
npx eas build:list --platform android --limit 15 --non-interactive --json

# Kill a stray build before it starts processing (free if caught early)
npx eas build:cancel <build-id> --non-interactive
```

---

## 7. THE CONSENT RULE

> **NEVER trigger an EAS build without explicit owner confirmation. Every
> push to `dev` auto-triggers the RC workflow, so a push to `dev` IS
> triggering a build. "Explicit" means the owner said yes to *this* push, in
> this conversation — not a standing assumption, not "the change is small",
> not "CI will cancel the stale one anyway."**

This is owner-canonized after a real incident: on 2026-07-02, stacked pushes
queued 4 concurrent EAS builds and burned monthly quota; a prior month's
quota exhaustion blocked all builds for days. The stale-cancel step
(`db46ed0`) reduces the damage of rapid pushes; it does not make pushes free.

How to prepare work **without** pushing:

1. Commit locally on `dev` (or a feature branch). Local commits trigger
   nothing.
2. Run the full verification loop (section 3).
3. Tell the owner: "Committed locally as `<sha>`, verified with
   test/tsc/lint. Pushing to dev will consume one EAS build — confirm and
   I'll push" — then **stop and wait**.

Batching discipline: prefer one push carrying several verified commits over
several pushes. Each push is a build; commits are free.

---

## 8. Installing the RC APK on a device

1. On the Android device, open the repo's GitHub **Releases** page and find
   the prerelease tagged `v{base}-rc` (currently `v1.0.1-rc`). It is
   overwritten on every dev build — it is always the latest.
2. Download the attached `sous-chef.apk`.
3. Open it. Android will prompt to allow installs from unknown sources
   (Settings → Apps → your browser → "Install unknown apps") — this is a
   sideload, there is no Play Store listing.
4. First run on a fresh install: enter a Gemini API key in **Settings**
   before exercising any LLM feature (section 4 — compiled builds never read
   env keys).
5. To identify which commit a device is running: the RC release title is
   `v{base}-rc — <short-sha>`; check the Releases page for the sha the user
   downloaded (but note it may have been overwritten since they installed —
   the release body's sha reflects the *current* APK, not necessarily theirs).

---

## 9. Versioning: two version fields, one drifting

| File | Field | Current value | Who reads it |
| --- | --- | --- | --- |
| `package.json` | `version` | `1.0.1-rc.5` | **Both workflows.** RC tag = `v` + base (strips `-rc.*`) + `-rc`; release tag = `v` + full string. This is the version that drives CI. |
| `app.json` | `expo.version` | `1.0.0` | Expo/Android build metadata — what the OS and the app's own runtime report as the app version. |

They have drifted: CI says `1.0.1-rc.5`, the installed app reports `1.0.0`.
Neither workflow reads `app.json`, so this drift is cosmetic until a real
release, at which point a version reported by a user's device won't match the
GitHub release tag. When bumping for a release, bump **both**, with owner
sign-off. (There is no `expo.android.versionCode` set in `app.json`; EAS
manages Android versionCode remotely by default — verify with
`npx eas build:version:get` if versionCode ever matters.)

---

## When NOT to use this

| If the task is… | Load instead |
| --- | --- |
| Deciding where code lives, layer/naming rules, doc-vs-code drift questions | `sous-chef-architecture-contract` |
| Planning any code edit, one-file/one-layer discipline, refactor passes, rabbit holes, whether an assumption is safe | `sous-chef-change-control` |
| Something is broken and you don't know why (429s, hangs, "works in dev not in APK" *triage*, log analysis) | `sous-chef-debugging-playbook` |
| "Has this happened before?" — history of past incidents and their fixes | `sous-chef-failure-archaeology` |
| Touching LLM code: providers, prompts, queue, safety, smoke-test internals | `sous-chef-llm-reference` |

This skill covers the *mechanics* of build/run/verify/release. The moment the
question becomes "why is the app misbehaving", switch to the debugging
playbook.

---

## Provenance and maintenance

Written 2026-07-02 from the repo at `dev` head. Re-verify volatile facts
before quoting them:

| Fact | Re-verify with |
| --- | --- |
| `package.json` version (`1.0.1-rc.5`) and broken `reset-project` script | `node -p "require('./package.json').version + ' ' + require('./package.json').scripts['reset-project']"` then `ls scripts/` |
| `app.json` version (`1.0.0`) | `node -p "require('./app.json').expo.version"` |
| RC workflow trigger, `paths-ignore` exemptions (`.claude/**`, `**.md`, `.github/**`), cancel-stale step, tag logic | `grep -n -A4 paths-ignore .github/workflows/rc-android.yml` && `cat .github/workflows/rc-android.yml` |
| Release workflow trigger and dormancy | `cat .github/workflows/release-android.yml` && `git rev-list --count master..dev` (74 at writing) |
| CI Node version (20) | `grep -A2 setup-node .github/workflows/*.yml` |
| EAS profiles (`preview` = APK, `production` = app-bundle) | `cat eas.json` |
| `__DEV__`-gated key/model resolution | `grep -n "__DEV__" src/models/api/llm/google.ts` |
| Default model `gemini-2.5-flash` | `grep -n DEFAULT_MODEL src/models/api/llm/google.ts` |
| Logger min level and 500-entry buffer | `grep -n "minLevel\|BUFFER_MAX" src/utils/logger.ts` |
| `__DEV__` shim in jest setup | `grep -n "__DEV__" jest.setup.ts` |
| Smoke test invocation | header comment of `src/models/api/llm/google.smoke.test.ts` |
| EAS free-tier numbers (15/mo, 1st-of-month reset, <3min-failure and pre-processing-cancel exemptions) | https://expo.dev/pricing — **external, changes without notice** |
| Verification commands | `node -p "require('./package.json').scripts"` |
