# EPIC-005: LLM Provider Roles — Gemini vs. Anthropic

**Status:** draft
**Created:** 2026-07-12
**Architecture baseline:** 5739e7d (dev, post-shard)
**Source:** open question Q1 from the retired root `ARCHITECTURE_SHARDING_EPIC.md`, plus the product-frontier "provider failover / Claude standby" thread.

---

## 1. BDD — User Flows

```gherkin
Given the primary LLM provider is degraded or quota-exhausted
When an assistant-powered flow runs
Then the app either fails over to the standby provider or degrades gracefully
And which provider handles what is a documented, deliberate decision
```

**Verified current state:** `src/models/api/llm/google.ts` (Gemini) is the wired
primary; `src/models/api/llm/anthropic.ts` and `openai.ts` exist as adapters with
env-var keys but no documented role and no failover logic. `llmApi.ts` notes a
future `EXPO_PUBLIC_LLM_PROVIDER` env switch that does not exist yet.

---

## 5. Summary

### Architecture impact

- [x] Amends Description sections: §2 stack (provider roles), when the decision
  ships as code.

### North star deviation

No — reliability work in service of the LLM-as-collaborator mission.

### Open questions

| # | Question | Blocks |
|---|---|---|
| Q1 | Is Anthropic a live standby (failover target), a manual switch, or experimental only? | The whole epic — this is the decision it exists to force |
| Q2 | Owner-supplied Anthropic key UX: same Settings pattern as the Gemini key? | Implementation, not the decision |
