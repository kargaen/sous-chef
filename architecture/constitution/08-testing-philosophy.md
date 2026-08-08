## Testing Philosophy

The MVC split makes each layer independently testable with small, focused mocks:

| Layer                   | What to test                                         | Mock boundary                       |
| ----------------------- | ---------------------------------------------------- | ----------------------------------- |
| `models/schemas`        | Zod parse success and failure cases                  | None needed                         |
| `models/repositories`   | Query logic and data transformations                 | Mock `StorageService`               |
| `controllers`           | State transitions, error handling, action sequencing | Mock repositories                   |
| `services/NudgeService` | Nudge ranking logic and suppression rules            | Mock HabitService + SeasonalService |
| `services/HabitService` | Accumulation of events into snapshots                | Mock StorageService                 |
| `services/LLMService`   | Prompt assembly, response parsing                    | Mock Anthropic API                  |
| `prompts`               | Snapshot tests on prompt string output               | None needed                         |
| `views`                 | Render + interaction via RNTL                        | Mock controller hooks               |

**Prompt snapshot tests** deserve special mention. Because prompt strings encode the app's personality and reasoning, regressions in them are product bugs, not just test failures. Snapshot tests make prompt changes a deliberate, reviewed act.

---

