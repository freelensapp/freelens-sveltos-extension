import { Renderer } from "@freelensapp/extensions";
import styles from "./dashboard.module.scss";

import type { DeployError } from "../api/deploy-errors";

const {
  Component: { Icon },
} = Renderer;

export interface DeployErrorsViewProps {
  errors: DeployError[];
  subtitle?: string;
  compact?: boolean;
}

export function DeployErrorsView({ errors, subtitle, compact }: DeployErrorsViewProps) {
  if (errors.length === 0) {
    return compact ? null : (
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Deployment Errors</h3>
          {subtitle ? <span className={styles.sectionSubtitle}>{subtitle}</span> : null}
        </div>
        <div className={styles.empty}>No deployment errors reported.</div>
      </div>
    );
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Deployment Errors</h3>
        <span className={styles.sectionSubtitle}>
          {errors.length} error{errors.length === 1 ? "" : "s"}
          {subtitle ? ` · ${subtitle}` : ""}
        </span>
      </div>
      <div className={styles.errorList}>
        {errors.map((error) => (
          <div className={styles.errorCard} key={error.id}>
            <Icon className={styles.errorIcon} material="error" />
            <div className={styles.errorBody}>
              <div className={styles.chips}>
                <span className={styles.chip}>
                  <span className={styles.chipLabel}>Cluster</span>
                  {`${error.clusterNamespace}/${error.clusterName}`}
                </span>
                <span className={styles.chip}>
                  <span className={styles.chipLabel}>Feature</span>
                  {error.feature}
                </span>
                {error.resource ? (
                  <span className={styles.chip}>
                    <span className={styles.chipLabel}>Release</span>
                    {error.resource}
                  </span>
                ) : null}
                {error.profileName ? (
                  <span className={styles.chip}>
                    <span className={styles.chipLabel}>Profile</span>
                    {error.profileName}
                  </span>
                ) : null}
                {error.reason ? (
                  <span className={styles.chip}>
                    <span className={styles.chipLabel}>Reason</span>
                    {error.reason}
                  </span>
                ) : null}
              </div>
              <div className={styles.errorMessage}>{error.message}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
