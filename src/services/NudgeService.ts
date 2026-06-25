import { ChefProfileRepository } from "../models/repositories/ChefProfileRepository";
import { PantryRepository } from "../models/repositories/PantryRepository";
import type { NudgeCard } from "../models/types";
import { HabitService } from "./HabitService";
import { LLMService } from "./LLMService";
import { SeasonalService } from "./SeasonalService";

const pantryRepo = new PantryRepository();
const chefProfileRepo = new ChefProfileRepository();

const SYSTEM_PROMPT = `
You are Sous Chef, a warm and encouraging kitchen companion.
Your job is to surface a single, timely nudge to help the cook
make the most of what they have. Be specific, friendly, and brief.
Never lecture. Respond only with a JSON object matching this shape:
{
  "id": string,
  "body": string,
  "contextType": "waste" | "seasonal" | "budget" | "habit",
  "actionLabel": string | null,
  "actionRoute": string | null
}
`.trim();

export const NudgeService = {
  generateNudge: async (): Promise<NudgeCard | null> => {
    try {
      const [expiringItems, chefProfile, habitSummary] = await Promise.all([
        pantryRepo.getExpiringSoon(3),
        chefProfileRepo.get(),
        Promise.resolve(HabitService.getSummary()),
      ]);

      const month = SeasonalService.getCurrentMonth();

      const context = JSON.stringify({
        expiringItems: expiringItems.map((i) => ({
          name: i.name,
          expiryDate: i.expiryDate,
        })),
        habitSummary,
        month,
        region: chefProfile?.region ?? null,
        chefProfile: chefProfile
          ? {
              skillLevel: chefProfile.skillLevel,
              cuisinePreferences: chefProfile.preferences.cuisinePreferences,
            }
          : null,
      });

      const response = await LLMService.send({
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: context }],
      }, "background");

      const nudge = JSON.parse(response.content) as NudgeCard;
      return nudge;
    } catch {
      return null;
    }
  },
};
