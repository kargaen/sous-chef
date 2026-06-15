// Default assistant greeting for the no-context empty state. Time-of-day
// aware so even the default feels alive. Pure function — testable without UI.

type DayPart = "morning" | "midday" | "afternoon" | "evening" | "night";

const getDayPart = (hour: number): DayPart => {
  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 11 && hour < 14) return "midday";
  if (hour >= 14 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "night";
};

const GREETINGS: Record<DayPart, string[]> = {
  morning: [
    "How can I help you this fine morning?",
    "Shall we get started on that breakfast?",
  ],
  midday: [
    "How can I help you today?",
    "Shall we get started on that lunch?",
  ],
  afternoon: [
    "How can I help you this afternoon?",
    "Thinking about dinner already? I'm in.",
  ],
  evening: [
    "How can I help you tonight?",
    "Shall we get started on that dinner?",
  ],
  night: [
    "Late-night kitchen session? I'm here for it.",
    "How can I help you at this hour — midnight snack?",
  ],
};

export const getDefaultAssistantGreeting = (now: Date = new Date()): string => {
  const options = GREETINGS[getDayPart(now.getHours())];
  return options[Math.floor(Math.random() * options.length)];
};
