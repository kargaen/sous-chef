import type { WeekPlan } from "../types";
import { StorageService } from "@/services/StorageService";

export class MealPlanRepository {
  async getByWeek(weekStartDate: string): Promise<WeekPlan | null> {
    const row = StorageService.dbQueryFirst<{ data: string }>(
      "SELECT data FROM meal_plans WHERE week_start_date = ?",
      [weekStartDate],
    );
    return row ? (JSON.parse(row.data) as WeekPlan) : null;
  }

  async listAll(): Promise<WeekPlan[]> {
    const rows = StorageService.dbQuery<{ data: string }>(
      "SELECT data FROM meal_plans ORDER BY week_start_date DESC",
    );
    return rows.map((row) => JSON.parse(row.data) as WeekPlan);
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
