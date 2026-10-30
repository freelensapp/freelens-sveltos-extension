import { Renderer } from "@freelensapp/extensions";
import styles from "./dashboard.module.scss";

const {
  Component: { Icon },
} = Renderer;

export type StatusTone = "ok" | "progress" | "warn" | "error" | "muted";

const toneStyles: Record<StatusTone, string> = {
  ok: styles.statusOk,
  progress: styles.statusProgress,
  warn: styles.statusWarn,
  error: styles.statusError,
  muted: styles.statusMuted,
};

const toneIcons: Record<StatusTone, string> = {
  ok: "check_circle",
  progress: "sync",
  warn: "hourglass_empty",
  error: "error",
  muted: "remove_circle_outline",
};

export function statusTone(status: string | undefined): StatusTone {
  switch (status) {
    case "Provisioned":
    case "Healthy":
    case "Managing":
    case "Ready":
    case "deployed":
      return "ok";
    case "Provisioning":
    case "pending-install":
    case "pending-upgrade":
    case "pending-rollback":
      return "progress";
    case "Pending":
    case "Blocked":
    case "Removing":
    case "AgentRemoving":
    case "Paused":
      return "warn";
    case "Failed":
    case "FailedNonRetriable":
    case "Conflict":
    case "Down":
    case "failed":
      return "error";
    default:
      return "muted";
  }
}

export interface StatusChipProps {
  status?: string;
  tooltip?: string;
}

export function StatusChip({ status, tooltip }: StatusChipProps) {
  const tone = statusTone(status);
  const icon = status === "Paused" ? "pause_circle_filled" : toneIcons[tone];

  return (
    <span className={`${styles.status} ${toneStyles[tone]}`} title={tooltip}>
      <Icon className={tone === "progress" ? styles.statusProgressIcon : undefined} material={icon} small />
      {status ?? "Unknown"}
    </span>
  );
}
