// Returns a local YYYY-MM-DD string for today without UTC offset confusion.
export const todayKey = (): string => {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${m}-${d}`;
};

// Advances or rewinds a YYYY-MM-DD string by n days (n may be negative).
export const addDays = (date: string, n: number): string => {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + n);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
};

// Returns an ordered array of YYYY-MM-DD strings spanning a plan.
export const eachPlanDay = (startDate: string, dayCount: number): string[] =>
  Array.from({ length: dayCount }, (_, i) => addDays(startDate, i));

// Most recent occurrence of a weekday (0=Sun … 6=Sat) on or before today.
// Used to compute the default start date when creating a new plan.
export const planStart = (weekStartDay: 0 | 1 | 2 | 3 | 4 | 5 | 6): string => {
  const today = new Date();
  const daysBack = (today.getDay() - weekStartDay + 7) % 7;
  const start = new Date(today);
  start.setDate(today.getDate() - daysBack);
  const m = String(start.getMonth() + 1).padStart(2, "0");
  const day = String(start.getDate()).padStart(2, "0");
  return `${start.getFullYear()}-${m}-${day}`;
};

// Human-readable weekday + short date label ("Mon 16 Jun").
export const formatDayLabel = (date: string): string => {
  const d = new Date(`${date}T00:00:00`);
  const weekday = d.toLocaleDateString(undefined, { weekday: "short" });
  const day = d.getDate();
  const month = d.toLocaleDateString(undefined, { month: "short" });
  return `${weekday} ${day} ${month}`;
};
