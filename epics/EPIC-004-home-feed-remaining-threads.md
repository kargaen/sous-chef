# EPIC-004: Home Feed — Remaining Merge Threads

**Status:** superseded by existing Home implementation
**Created:** 2026-07-12
**Architecture baseline:** 5739e7d (dev, post-shard)
**Source:** carved out of the retired root `LANDING_DISCOVER_MERGE_EPIC.md` during governance cleanup. The merge itself is verified shipped (Discover lanes render in Home, tab bar is four destinations, GenerationZone + dismissal learning exist; the legacy `NudgeStrip` is already retired).

---

## 1. BDD — User Flows

### Flow 1: Urgency reads visually, not just by position

```gherkin
Given an expiring pantry item surfaces a card
When the feed renders
Then the card carries an urgent visual tone (warm accent + icon), not just a higher slot
And inspiration cards can never out-rank it
```

Verified absent: no `urgent`/tone variant on the card shell or Inspiration types.
The source epic's reserved relevance bands (inspiration ≤ 0.6, soft urgency
0.65–0.79, hard urgency ≥ 0.8) come with this flow.

### Flow 2: No-jump loading — residual gap

```gherkin
Given the Home feed is loading lanes at different speeds
When a lane below the viewport resolves first
Then nothing in or above the viewport shifts
```

Partially shipped: `Skeleton` is used on `HomeScreen` and `DiscoverFeed`. First
slice of this flow is an audit of what still reflows (the product-frontier skill
lists reflow as open), not new code.

### Flow 3: Seed-rotating sparks

```gherkin
Given the daily seed
When sparks render
Then their order rotates with the seed so the feed feels fresh day to day
```

Unverified either way — confirm against `useSeasonalController`/spark code before
implementing.

**Out of scope:** everything the source epic marked "Already resolved — do NOT
carry" (recipe-creator seed param, recent-cooks reader, Discover placeholder).

---

## 5. Summary

### Architecture impact

- [x] No change to ARCHITECTURE.md expected — visual tone + ordering changes
  inside existing components.

### North star deviation

No — urgency guardrails serve the nudge philosophy; nothing generic learns about
domain internals.

### Open questions

| # | Question | Blocks |
|---|---|---|
| Q1 | Which reflow gaps actually remain after the Skeleton work? | Flow 2 slice 1 answers it |
