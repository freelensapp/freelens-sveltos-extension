import { Renderer } from "@freelensapp/extensions";
import { type AnyCluster, getConnectionStatus, getPaused, getReady, getVersion } from "../api/clusters";
import styles from "./dashboard.module.scss";
import { LastUpdate } from "./last-update";
import { StatusChip } from "./status-chip";

const {
  Component: { Badge, Icon },
  Navigation: { showDetails },
} = Renderer;

export interface ClusterCardProps {
  cluster: AnyCluster;
  selected: boolean;
  addonCount: number;
  errorCount: number;
  profileCount: number;
  lastUpdate?: string;
  onSelect: () => void;
}

export function ClusterCard({
  cluster,
  selected,
  addonCount,
  errorCount,
  profileCount,
  lastUpdate,
  onSelect,
}: ClusterCardProps) {
  const ready = getReady(cluster);
  const connection = getConnectionStatus(cluster);
  const labels = Object.entries(cluster.metadata.labels ?? {});
  const tone =
    errorCount > 0 || !ready || connection === "Down"
      ? styles.cardError
      : getPaused(cluster)
        ? styles.cardWarn
        : styles.cardOk;

  return (
    <div
      role="button"
      tabIndex={0}
      className={`${styles.card} ${styles.cardClickable} ${tone} ${selected ? styles.cardSelected : ""}`}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onSelect();
      }}
    >
      <div className={styles.cardHeader}>
        <Icon
          className={styles.cardIcon}
          material={ready ? "cloud_done" : "cloud_off"}
          big
          tooltip={ready ? "Ready" : "Not ready"}
        />
        <div className={styles.cardHeading}>
          <span className={styles.cardName}>{cluster.getName()}</span>
          <span className={styles.cardSubtitle}>{cluster.getNs()}</span>
        </div>
        <div className={styles.spacer} />
        <Icon
          material="open_in_new"
          small
          interactive
          tooltip="Open details"
          onClick={(event: React.MouseEvent) => {
            event.stopPropagation();
            showDetails(cluster.selfLink);
          }}
        />
      </div>

      <div className={styles.chips}>
        <StatusChip status={connection ?? (ready ? "Ready" : undefined)} />
        <span className={styles.chip}>
          <span className={styles.chipLabel}>Kubernetes</span>
          {getVersion(cluster) ?? "N/A"}
        </span>
        {getPaused(cluster) ? (
          <span className={styles.chip}>
            <Icon material="pause_circle_filled" small />
            Paused
          </span>
        ) : null}
        {lastUpdate ? (
          <span className={styles.chip}>
            <span className={styles.chipLabel}>Updated</span>
            <LastUpdate timestamp={lastUpdate} />
          </span>
        ) : null}
      </div>

      {labels.length > 0 ? (
        <div className={styles.chips}>
          {labels.slice(0, 4).map(([key, value]) => (
            <Badge key={key} small label={`${key}=${value}`} />
          ))}
          {labels.length > 4 ? <Badge small label={`+${labels.length - 4}`} /> : null}
        </div>
      ) : null}

      <div className={styles.metrics}>
        <div className={styles.metric}>
          <span className={styles.metricValue}>{addonCount}</span>
          <span className={styles.metricLabel}>Add-ons</span>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricValue}>{profileCount}</span>
          <span className={styles.metricLabel}>Profiles</span>
        </div>
        <div className={styles.metric}>
          <span className={`${styles.metricValue} ${errorCount > 0 ? styles.metricValueError : styles.metricValueOk}`}>
            {errorCount}
          </span>
          <span className={styles.metricLabel}>Deploy errors</span>
        </div>
      </div>
    </div>
  );
}
