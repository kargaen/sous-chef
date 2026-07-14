# EPIC-008: RC Versioning & Release Lifecycle

**Status:** draft
**Created:** 2026-07-13
**Architecture baseline:** 71ed373 (dev)
**Source:** owner review of the pre-release workflow. Decision: Option A (RCs target the next dictated version, fail loudly when the version wasn't bumped); no versionless fallback (it would silence the guard); manual version bumps.

---

## 1. BDD — User Flows

### Flow 1: RC targets the dictated next version

```gherkin
Given package.json version is a pre-release like 1.0.2-rc.0
When a code push lands on dev (or the RC workflow is dispatched)
Then the RC is published as v1.0.2-rc (the base version with -rc), fresh-dated
And its release names the target version and the built commit
```

### Flow 2: Loud guard when the version wasn't bumped

```gherkin
Given a stable release v1.0.2 already exists
And package.json still reads 1.0.2-rc.N (not bumped since that release)
When the RC workflow runs
Then it fails immediately with a clear ::error:: telling the owner to bump the version
And no EAS build is spent
```

### Flow 3: Stable release finalizes and cleans up its RC

```gherkin
Given package.json reads 1.0.2-rc.N and dev is merged to master to release
When the master release workflow runs
Then it publishes the stable release v1.0.2 (base version, no -rc)
And it deletes the matching v1.0.2-rc pre-release and tag
```

**The version lifecycle (manual bumps, no bot commits):**
1. Owner dictates the next version by bumping package.json with a pre-release id:
   - `npm version prepatch --preid rc` → `1.0.2-rc.0` (patch)
   - `npm version preminor --preid rc` → `1.1.0-rc.0` (minor)
   - `npm version premajor --preid rc` → `2.0.0-rc.0` (major)
2. Dev pushes build the `v{base}-rc` channel (suffix stripped), fresh-dated each run.
3. Release: merge dev → master. Master derives the stable version as the base of
   package.json (`1.0.2`), publishes `v1.0.2`, and deletes `v1.0.2-rc`.
4. package.json is deliberately NOT rewritten by CI. It still reads `1.0.2-rc.N`
   after release, so the next dev RC push hits Flow 2's guard — which is the
   owner's reminder to bump to the next target. The guard doubles as the
   post-release nudge; no bot commit to master is needed.

**Out of scope:** auto-incrementing the version (owner dictates it); a versionless
rolling RC (that is Option B, explicitly rejected as the default); changing the
master build's Android/EAS mechanics beyond the finalize + cleanup steps.

---

## 3. TDD — Testing Strategy

Workflow logic is shell in YAML; verification is a dry-run of each guard/derivation
snippet against sample versions, plus one real dispatched run per workflow after the
change. No unit-test harness covers CI YAML in this repo.

| Flow | Check | Authority |
|---|---|---|
| 1 | base-version strip: `1.0.2-rc.0` → `v1.0.2-rc` | `sed 's/-rc.*//'`, already in use |
| 2 | guard: stable `v{base}` exists → non-zero exit + `::error::` | `gh release view` exit code |
| 3 | finalize: stable tag = base; `gh release delete v{base}-rc --cleanup-tag` | dispatched master run |

---

## 4. Checklist

```md
[ ] 1. rc-android.yml: add a loud pre-build guard — if `gh release view v${BASE}` (stable) succeeds, emit ::error:: and exit 1 before the EAS build. One file — done when a dispatched run with a colliding stable version fails fast with the message, and a normal run still builds.
[ ] 2. release-android.yml: derive stable version as the -rc-stripped base, publish v${BASE}, then `gh release delete v${BASE}-rc --yes --cleanup-tag || true`. One file — done when a dispatched/master run publishes the stable release and the matching RC is gone.
[ ] 3. Document the version lifecycle + bump commands in architecture/description/02-stack.md (or a release-process description note) via epic-closeout — done when the Description records how RCs and stable releases are versioned.
```

---

## 5. Summary

### Architecture impact

- [x] Amends Description sections: §2 stack / release process (item 3), via
  epic-closeout when the workflow slices ship.

### North star deviation

No — this is release hygiene; it does not touch product behavior or the offline-first / MVC constitution.

### Open questions

| # | Question | Blocks |
|---|---|---|
| Q1 | Confirm the "package.json stays -rc after release; guard is the bump reminder" loop is acceptable, vs. having master auto-rewrite package.json to the next -rc (a bot commit to master). Default: no bot commit. | Item 2's exact behavior |
| Q2 | On first RC of a brand-new version where no stable exists, the guard passes silently — is that the intended pass case? (Assumed yes.) | Item 1 |
