const COMMON_FRACTIONS: [number, string][] = [
  [0.125, "⅛"],
  [0.25, "¼"],
  [0.333, "⅓"],
  [0.5, "½"],
  [0.667, "⅔"],
  [0.75, "¾"],
];

interface FormatCurrencyOptions {
  currency?: string;
  locale?: string;
  approximate?: boolean;
  maximumFractionDigits?: number;
}

export const formatCurrency = (
  amount: number,
  {
    currency = "DKK",
    locale = "da-DK",
    approximate = false,
    maximumFractionDigits = 2,
  }: FormatCurrencyOptions = {},
): string => {
  if (!Number.isFinite(amount)) return approximate ? "~—" : "—";

  const formatted = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits,
  }).format(amount);

  return approximate ? `~${formatted}` : formatted;
};

export const formatRelativeDate = (
  dateInput: string | number | Date,
  nowInput: string | number | Date = new Date(),
): string => {
  const date = new Date(dateInput);
  const now = new Date(nowInput);

  if (Number.isNaN(date.getTime())) return "Unknown date";

  const dateOnly = new Date(date);
  const nowOnly = new Date(now);

  dateOnly.setHours(0, 0, 0, 0);
  nowOnly.setHours(0, 0, 0, 0);

  const diffMs = dateOnly.getTime() - nowOnly.getTime();
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays > 1) return `In ${diffDays} days`;

  return `${Math.abs(diffDays)} days ago`;
};

const findFraction = (value: number): string | null => {
  const rounded = Math.round(value * 1000) / 1000;

  for (const [fractionValue, symbol] of COMMON_FRACTIONS) {
    if (Math.abs(rounded - fractionValue) < 0.02) {
      return symbol;
    }
  }

  return null;
};

export const formatQuantityAmount = (amount: number): string => {
  if (!Number.isFinite(amount)) return "—";

  const whole = Math.floor(amount);
  const remainder = amount - whole;
  const fraction = findFraction(remainder);

  if (fraction && whole > 0) return `${whole} ${fraction}`;
  if (fraction) return fraction;
  if (Number.isInteger(amount)) return String(amount);

  return amount.toFixed(2).replace(/\.?0+$/, "");
};

export const formatQuantity = (
  amount: number,
  unit?: string | null,
): string => {
  const formattedAmount = formatQuantityAmount(amount);
  const trimmedUnit = unit?.trim();

  return trimmedUnit ? `${formattedAmount} ${trimmedUnit}` : formattedAmount;
};

export const formatPercent = (
  value: number,
  maximumFractionDigits = 0,
): string => {
  if (!Number.isFinite(value)) return "—";

  return new Intl.NumberFormat("en", {
    style: "percent",
    maximumFractionDigits,
  }).format(value);
};

export const capitalizeFirst = (value: string): string => {
  if (value.length === 0) return value;

  return value.charAt(0).toUpperCase() + value.slice(1);
};
