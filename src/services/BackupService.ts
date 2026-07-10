import { SnapshotService } from "./SnapshotService";
import { SupabaseService } from "./SupabaseService";

const wrapBackupError = (operation: string, error: unknown): Error => {
  const message = error instanceof Error ? error.message : String(error);
  return new Error(`BackupService ${operation} failed: ${message}`);
};

export const BackupService = {
  // Resolves the session itself rather than taking a userId — ties session +
  // snapshot + SupabaseService together so callers (useBackupController) just
  // invoke this and stamp the returned timestamp.
  async backupNow(): Promise<string> {
    try {
      const session = await SupabaseService.getSession();

      if (!session) {
        throw new Error("Sign in before backing up.");
      }

      const snapshot = await SnapshotService.build();
      await SupabaseService.uploadSnapshot(
        session.user.id,
        JSON.stringify(snapshot),
      );

      return snapshot.exportedAt;
    } catch (error) {
      throw wrapBackupError("backupNow", error);
    }
  },
};
