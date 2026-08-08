# EPIC-001: Remaining Tab Additions

**Status:** closed
**Created:** 2026-07-12
**Architecture baseline:** 6839154 (dev, pre-shard)
**Source:** evicted verbatim from `ARCHITECTURE.md` §5 "Upcoming Tab Additions" during the governance-bundle shard. Deferred-class content; the quoted text below is the original.

---

## 1. BDD — User Flows

```gherkin
Given the main tab bar
When the user looks for app preferences
Then a Settings tab is the last tab
And it reuses the existing settings surface (app/settings.tsx remains an alias)
```

**Verified current state (2026-07-12):** `app/(tabs)/recipes/` exists and is shipped —
that half of the original section is done. `app/(tabs)/` contains no `settings.tsx`
and no `discover.tsx`; the settings tab is the remaining work.

**Out of scope for this epic:**
- The Discover tab (`app/(tabs)/discover.tsx`) — referenced by the folder tree but
  never part of this section's plan.

---

## 5. Summary

### Architecture impact

- [x] Amends Description sections: §4 full tree (new route file), when it ships.

### North star deviation

No — a settings tab surfaces an existing surface; nothing about the warm,
LLM-as-collaborator mission is traded.

### Resolution

Closed as stale by owner decision on 2026-07-17. The current top-level `/settings` route and
front-page-only settings link are sufficient; do not add a Settings tab.

---

## Original text (evicted from ARCHITECTURE.md §5)

> The main tab bar will expand with two additional route-level surfaces:
>
> - `app/(tabs)/recipes.tsx` will sit between Home and Pantry and act as the stored-recipes home for cookbook groupings plus uncategorized recipes.
> - `app/(tabs)/settings.tsx` will be the last tab and will reuse the settings surface for app preferences and onboarding reset.
> - The existing top-level `app/settings.tsx` route remains as a direct entry-point alias to the same settings screen.
>
> Recipes and settings will be represented across MVC like this:
>
> - **Model**: add `Cookbook.types.ts` and `CookbookRepository.ts` for cookbook groupings and uncategorized saved-recipe retrieval. *(shipped)*
> - **Controller**: add `useRecipesController.ts` for the tab-level stored-recipes home, distinct from the existing `useRecipeController.ts` used for recipe search/detail behavior.
> - **View**: add `RecipesScreen.tsx` as the tab-level stored-recipes home, and keep `SettingsScreen.tsx` as the settings surface where onboarding reset will live.
>
> This keeps the naming boundary explicit:
>
> - `RecipesScreen` = stored recipes tab home
> - `RecipeScreen` = single recipe detail surface
