## Architecture Philosophy

Sous Chef uses a strict three-layer MVC split, adapted to the idioms of React Native and Expo:

| Layer          | Where it lives     | Responsibility                                                                                  |
| -------------- | ------------------ | ----------------------------------------------------------------------------------------------- |
| **Model**      | `src/models/`      | Shape of data — TypeScript interfaces, Zod schemas, API clients, repositories                   |
| **View**       | `src/views/`       | Pure presentation — React Native components that receive props and emit callbacks, nothing else |
| **Controller** | `src/controllers/` | Business logic — custom hooks that orchestrate models, drive view state, and call services      |

**Services** (`src/services/`) sit beneath the controller layer and handle all side effects: LLM API calls, SQLite reads/writes, AsyncStorage, device locale, and pricing lookups. Controllers call services; views never do.

**Prompts** (`src/prompts/`) are first-class citizens. LLM prompt templates encode Sous Chef's personality and reasoning patterns. They are versioned alongside business logic, not buried as strings inside a service.

**The nudge philosophy is architectural.** `HabitService` _observes_ cook behaviour silently. `NudgeService` _decides_ when and what to surface. `useConversationController` _delivers_ it. These three concerns are deliberately separated so that the "nudges rather than dictates" principle is enforced at the code boundary level, not just in product intent.

---

