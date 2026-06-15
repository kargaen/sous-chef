import { Badge, type BadgeTone } from "../ui";

export type ExpiryStatus = "fresh" | "soon" | "expired" | "unknown";

interface ExpiryChipProps {
  status: ExpiryStatus;
  label?: string;
}

const defaultLabels: Record<ExpiryStatus, string> = {
  fresh: "Fresh",
  soon: "Use soon",
  expired: "Expired",
  unknown: "No date",
};

const toneByStatus: Record<ExpiryStatus, BadgeTone> = {
  fresh: "sage",
  soon: "warning",
  expired: "danger",
  unknown: "neutral",
};

export function ExpiryChip({ status, label }: ExpiryChipProps) {
  return (
    <Badge label={label ?? defaultLabels[status]} tone={toneByStatus[status]} />
  );
}
