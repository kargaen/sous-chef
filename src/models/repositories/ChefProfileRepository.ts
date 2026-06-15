import type { ChefProfile } from "../types";
import { StorageService } from "@/services/StorageService";

const PROFILE_KEY = "chef_profile";

export class ChefProfileRepository {
  async get(): Promise<ChefProfile | null> {
    const raw = await StorageService.storageGetItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  async save(profile: ChefProfile): Promise<void> {
    await StorageService.storageSetItem(PROFILE_KEY, JSON.stringify(profile));
  }

  async clear(): Promise<void> {
    await StorageService.storageRemoveItem(PROFILE_KEY);
  }
}
