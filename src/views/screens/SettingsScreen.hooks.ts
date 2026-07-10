import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import type { LayoutChangeEvent, ScrollView } from "react-native";

import {
  useAuthController,
  useBackupController,
  useChefController,
  useSettingsController,
} from "@/controllers";
import type {
  AppSettings,
  ChefProfile,
  PantryNudgeFrequency,
  SkillLevel,
  SustainabilityNudgeLevel,
} from "@/models/types";

const SETTINGS_SECTION_IDS = {
  assistant: "assistant",
  chefProfile: "chef_profile",
  support: "support",
} as const;

const SUSTAINABILITY_OPTIONS: {
  value: SustainabilityNudgeLevel;
  label: string;
  description: string;
}[] = [
  { value: "off", label: "Off", description: "No sustainability nudges." },
  {
    value: "subtle",
    label: "Subtle",
    description: "Occasional gentle notes when it helps.",
  },
  {
    value: "default",
    label: "Default",
    description: "A balanced level of practical nudges.",
  },
  {
    value: "prominent",
    label: "Prominent",
    description: "More visible nudges across the app.",
  },
];

const LANGUAGE_OPTIONS = [
  { value: "imply", label: "Imply from conversation" },
  { value: "English", label: "English" },
  { value: "Danish", label: "Dansk" },
  { value: "German", label: "Deutsch" },
  { value: "French", label: "Français" },
  { value: "Spanish", label: "Español" },
] as const;

const DIET_OPTIONS = [
  { value: "omnivore", label: "Omnivore" },
  { value: "pescatarian", label: "Pescatarian" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "flexitarian", label: "Flexitarian" },
  { value: "gluten-free", label: "Gluten-free" },
] as const;

const NUDGE_FREQUENCY_OPTIONS: {
  value: PantryNudgeFrequency;
  label: string;
  description: string;
}[] = [
  { value: "daily", label: "Daily", description: "Suggest from your pantry every day." },
  { value: "weekly", label: "Weekly", description: "A fresh batch of ideas each week." },
  { value: "monthly", label: "Monthly", description: "Check in once a month on forgotten staples." },
  { value: "rarely", label: "Rarely", description: "Only surface suggestions every 3 months." },
];

const SKILL_OPTIONS: { value: SkillLevel; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "home cook", label: "Comfortable" },
  { value: "confident", label: "Experienced" },
  { value: "advanced", label: "Pro" },
];

const emptySettings: AppSettings = {
  geminiApiKey: "",
  keepScreenOn: true,
  sustainabilityNudges: "default",
  learnFromChats: true,
  skipSafetyLayer1: false,
};

interface ChefProfileDraft {
  name: string;
  region: string;
  dietary: string[];
  dislikedIngredientsText: string;
  skillLevel: SkillLevel;
}

const emptyChefProfileDraft: ChefProfileDraft = {
  name: "",
  region: "",
  dietary: [],
  dislikedIngredientsText: "",
  skillLevel: "home cook",
};

const settingsEqual = (a: AppSettings, b: AppSettings): boolean => {
  return JSON.stringify(a) === JSON.stringify(b);
};

const buildChefProfileDraft = (profile: ChefProfile): ChefProfileDraft => ({
  name: profile.name,
  region: profile.region,
  dietary: profile.preferences.dietary,
  dislikedIngredientsText: profile.preferences.dislikedIngredients.join(", "),
  skillLevel: profile.skillLevel,
});

const chefProfileDraftEqual = (
  a: ChefProfileDraft,
  b: ChefProfileDraft,
): boolean => {
  return JSON.stringify(a) === JSON.stringify(b);
};

const parseList = (value: string): string[] => {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
};

export const useSettingsScreenView = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ focus?: string }>();
  const scrollViewRef = useRef<ScrollView | null>(null);
  const handledFocusRef = useRef<string | null>(null);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hasLoadedProfile, setHasLoadedProfile] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const {
    settings,
    hasLoaded,
    loadSettings,
    saveSettings,
    resetSettings,
    loading,
    error,
  } = useSettingsController();
  const {
    profile,
    loadProfile,
    saveProfileDraft,
    loading: profileLoading,
    error: profileError,
  } = useChefController();
  const {
    status: authStatus,
    user: authUser,
    loading: authLoading,
    error: authError,
  } = useAuthController();
  const {
    lastBackupAt,
    backupNow,
    restoreNow,
    loading: backupLoading,
    error: backupError,
  } = useBackupController();
  const [draft, setDraft] = useState<AppSettings>(emptySettings);
  const [profileDraft, setProfileDraft] =
    useState<ChefProfileDraft>(emptyChefProfileDraft);
  const [highlightedSectionId, setHighlightedSectionId] = useState<
    string | null
  >(null);
  const [sectionOffsets, setSectionOffsets] = useState<Record<string, number>>(
    {},
  );

  useEffect(() => {
    if (!hasLoaded && !loading) {
      void loadSettings();
    }
  }, [hasLoaded, loadSettings, loading]);

  useEffect(() => {
    let isActive = true;

    const run = async () => {
      await loadProfile();
      if (isActive) {
        setHasLoadedProfile(true);
      }
    };

    void run();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (settings) {
      setDraft(settings);
    }
  }, [settings]);

  useEffect(() => {
    if (profile) {
      setProfileDraft(buildChefProfileDraft(profile));
    } else if (hasLoadedProfile) {
      setProfileDraft(emptyChefProfileDraft);
    }
  }, [hasLoadedProfile, profile]);

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const focusTarget = params.focus;
    const targetOffset = focusTarget ? sectionOffsets[focusTarget] : undefined;

    if (!focusTarget || targetOffset === undefined) {
      return;
    }

    if (handledFocusRef.current === focusTarget) {
      return;
    }

    handledFocusRef.current = focusTarget;

    const scrollTimeout = setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: Math.max(targetOffset - 24, 0),
        animated: true,
      });
      setHighlightedSectionId(focusTarget);

      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }

      highlightTimeoutRef.current = setTimeout(() => {
        setHighlightedSectionId(null);
      }, 1600);
    }, 180);

    return () => {
      clearTimeout(scrollTimeout);
    };
  }, [params.focus, sectionOffsets]);

  const updateDraft = (partial: Partial<AppSettings>) => {
    setDraft((currentDraft) => ({ ...currentDraft, ...partial }));
  };

  const updateProfileDraft = (partial: Partial<ChefProfileDraft>) => {
    setValidationError(null);
    setProfileDraft((currentDraft) => ({ ...currentDraft, ...partial }));
  };

  const handleSelectDiet = (diet: (typeof DIET_OPTIONS)[number]["value"]) => {
    updateProfileDraft({
      dietary: diet === "omnivore" ? [] : [diet],
    });
  };

  const baselineProfileDraft = profile
    ? buildChefProfileDraft(profile)
    : emptyChefProfileDraft;
  const hasSettingsChanges = settings ? !settingsEqual(settings, draft) : false;
  const hasProfileChanges = !chefProfileDraftEqual(
    baselineProfileDraft,
    profileDraft,
  );
  const hasChanges = hasSettingsChanges || hasProfileChanges;
  const selectedDiet = profileDraft.dietary[0] ?? "omnivore";

  const handleSave = async () => {
    const trimmedName = profileDraft.name.trim();
    const trimmedRegion = profileDraft.region.trim();
    const shouldSaveProfile = Boolean(profile) || hasProfileChanges;

    if (shouldSaveProfile && (!trimmedName || !trimmedRegion)) {
      setValidationError(
        "Tell Sous Chef your name and country before saving your profile.",
      );
      return;
    }

    setValidationError(null);

    await saveSettings(draft);
    if (shouldSaveProfile) {
      await saveProfileDraft({
        name: trimmedName,
        region: trimmedRegion,
        skillLevel: profileDraft.skillLevel,
        preferences: {
          dietary: profileDraft.dietary,
          dislikedIngredients: parseList(profileDraft.dislikedIngredientsText),
        },
      });
    }
  };

  const handleReset = async () => {
    await resetSettings();
  };

  const handleOpenIntroWizard = () => {
    router.push("/welcome");
  };

  const handleOpenAuth = () => {
    router.push("/auth");
  };

  const handleBackupNow = async () => {
    await backupNow();
  };

  const handleRestoreNow = () => {
    Alert.alert(
      "Restore from backup?",
      "This overwrites any local data that matches your last backup. Anything you've changed on this device since then won't be affected.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restore",
          style: "destructive",
          onPress: () => {
            void restoreNow();
          },
        },
      ],
    );
  };

  const handleSectionLayout =
    (sectionId: string) => (event: LayoutChangeEvent) => {
      const { y } = event.nativeEvent.layout;

      setSectionOffsets((currentOffsets) => ({
        ...currentOffsets,
        [sectionId]: y,
      }));
    };

  return useMemo(
    () => ({
      draft,
      dietOptions: DIET_OPTIONS,
      languageOptions: LANGUAGE_OPTIONS,
      error: validationError ?? error ?? profileError,
      authStatus,
      authUser,
      authLoading,
      authError,
      lastBackupAt,
      backupLoading,
      backupError,
      handleOpenAuth,
      handleBackupNow,
      handleRestoreNow,
      handleOpenIntroWizard,
      handleReset,
      handleSave,
      handleSectionLayout,
      handleSelectDiet,
      hasChanges,
      hasLoaded: hasLoaded && hasLoadedProfile,
      highlightedSectionId,
      loading: loading || profileLoading,
      nudgeFrequencyOptions: NUDGE_FREQUENCY_OPTIONS,
      nudgeFrequencyHelperText:
        NUDGE_FREQUENCY_OPTIONS.find(
          (option) => option.value === (draft.pantryNudgeFrequency ?? "monthly"),
        )?.description ?? "",
      profileDraft,
      scrollViewRef,
      sectionIds: SETTINGS_SECTION_IDS,
      selectedDiet,
      skillOptions: SKILL_OPTIONS,
      sustainabilityHelperText:
        SUSTAINABILITY_OPTIONS.find(
          (option) => option.value === draft.sustainabilityNudges,
        )?.description ?? "",
      sustainabilityOptions: SUSTAINABILITY_OPTIONS,
      updateDraft,
      updateProfileDraft,
    }),
    [
      draft,
      error,
      authStatus,
      authUser,
      authLoading,
      authError,
      lastBackupAt,
      backupLoading,
      backupError,
      handleOpenAuth,
      handleBackupNow,
      handleRestoreNow,
      handleOpenIntroWizard,
      handleReset,
      handleSave,
      handleSectionLayout,
      handleSelectDiet,
      hasChanges,
      hasLoaded,
      hasLoadedProfile,
      highlightedSectionId,
      loading,
      profileDraft,
      profileError,
      profileLoading,
      selectedDiet,
      validationError,
    ],
  );
};
