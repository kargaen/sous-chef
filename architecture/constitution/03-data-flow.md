## Data Flow

Strict one-directional flow. No layer may import from a layer above it.

```
Screen (View)
    ↓ calls
Controller Hook  (useXxxController)
    ↓ reads/writes
Repository  (data source abstraction)
    ↓ delegates to
Service  (LLMService / StorageService / SeasonalService …)
    ↓ side effects
SQLite / AsyncStorage / Anthropic API / Supabase

State updates flow back up via Zustand store:

Service / Repository
    ↓ writes
Zustand Store
    ↓ triggers re-render
View
```

**Hard rules:**

- Views never import from `services/`, `store/`, `repositories/`, or `prompts/`
- Controllers never import from `views/`
- Services never import from `controllers/`, `store/`, or `views/`
- Prompts never import from anything except `models/types/`

---

