import type { WeekPlan } from "../types";
import { StorageService } from "@/services/StorageService";

export class MealPlanRepository {
  async getByWeek(weekStartDate: string): Promise<WeekPlan | null> {
    const row = StorageService.dbQueryFirst<{ data: string }>(
      "SELECT data FROM meal_plans WHERE week_start_date = ?",
      [weekStartDate],
    );
    return row ? JSON.parse(row.data) : null;
  }

  async save(plan: WeekPlan): Promise<void> {
    StorageService.dbRun(
      "INSERT OR REPLACE INTO meal_plans (id, week_start_date, data) VALUES (?, ?, ?)",
      [plan.id, plan.weekStartDate, JSON.stringify(plan)],
    );
  }

  async delete(id: string): Promise<void> {
    StorageService.dbRun("DELETE FROM meal_plans WHERE id = ?", [id]);
  }
}
