import { StorageService } from "@/services/StorageService";

import type { PlanPreset } from "../types";

const STORAGE_KEY = "plan-presets-v1";

export class PlanPresetRepository {
  private async readAll(): Promise<PlanPreset[]> {
    try {
      const raw = await StorageService.storageGetItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as PlanPreset[]) : [];
    } catch {
      return [];
    }
  }

  private async writeAll(presets: PlanPreset[]): Promise<void> {
    await StorageService.storageSetItem(STORAGE_KEY, JSON.stringify(presets));
  }

  async listAll(): Promise<PlanPreset[]> {
    return this.readAll();
  }

  async save(preset: PlanPreset): Promise<PlanPreset> {
    const all = await this.readAll();
    const idx = all.findIndex((p) => p.id === preset.id);
    if (idx >= 0) {
      all[idx] = preset;
    } else {
      all.push(preset);
    }
    await this.writeAll(all);
    return preset;
  }

  async delete(id: string): Promise<void> {
    const all = await this.readAll();
    await this.writeAll(all.filter((p) => p.id !== id));
  }
}
