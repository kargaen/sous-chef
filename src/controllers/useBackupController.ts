import { useState } from "react";
import { BackupService } from "../services/BackupService";
import { useAuthStore } from "../store/authStore";

export const useBackupController = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { lastBackupAt, setLastBackupAt } = useAuthStore();

  const backupNow = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const exportedAt = await BackupService.backupNow();
      setLastBackupAt(exportedAt);
    } catch {
      setError("Could not back up right now.");
    } finally {
      setLoading(false);
    }
  };

  return {
    lastBackupAt,
    backupNow,
    loading,
    error,
  };
};
