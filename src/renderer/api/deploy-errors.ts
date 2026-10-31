import { ClusterSummary } from "./config/cluster-summary-v1beta1";

import type { Addon } from "./addons";
import type { ProfileStatus } from "./types";

export interface DeployError {
  id: string;
  clusterNamespace: string;
  clusterName: string;
  /** `Sveltos` or `Capi`, unknown for failures a profile reports before any ClusterSummary exists. */
  clusterType?: string;
  profileKind?: string;
  profileName?: string;
  feature: string;
  resource?: string;
  reason?: string;
  message: string;
}

const failedStatuses = ["Failed", "FailedNonRetriable"];

/** Collects every deployment failure Sveltos reports on a ClusterSummary. */
export function getDeployErrors(summaries: ClusterSummary[]): DeployError[] {
  return summaries.flatMap((summary) => {
    const profile = ClusterSummary.getProfileRef(summary);
    const base = {
      clusterNamespace: summary.spec?.clusterNamespace ?? summary.metadata.namespace ?? "",
      clusterName: summary.spec?.clusterName ?? "",
      clusterType: summary.spec?.clusterType,
      profileKind: profile?.kind,
      profileName: profile?.name,
    };
    const key = `${summary.metadata.namespace ?? ""}/${summary.metadata.name}`;
    const errors: DeployError[] = [];

    if (summary.status?.failureMessage) {
      errors.push({ ...base, id: `${key}-profile`, feature: "Profile", message: summary.status.failureMessage });
    }

    for (const feature of summary.status?.featureSummaries ?? []) {
      if (!feature.failureMessage && !failedStatuses.includes(feature.status ?? "")) continue;

      errors.push({
        ...base,
        id: `${key}-${feature.featureID}`,
        feature: feature.featureID,
        reason: feature.failureReason,
        message: feature.failureMessage ?? `Deployment ${feature.status}`,
      });
    }

    for (const release of summary.status?.helmReleaseSummaries ?? []) {
      const message = release.failureMessage ?? release.conflictMessage;

      if (!message) continue;

      errors.push({
        ...base,
        id: `${key}-helm-${release.releaseNamespace}/${release.releaseName}`,
        feature: "Helm",
        resource: `${release.releaseNamespace}/${release.releaseName}`,
        reason: release.status === "Conflict" ? "Conflict" : undefined,
        message,
      });
    }

    return errors;
  });
}

/** Failures the (Cluster)Profile itself reports when it cannot create a ClusterSummary. */
export function getFailedClusterErrors(status: ProfileStatus | undefined, profileName: string): DeployError[] {
  return (status?.failedClusters ?? []).map((failed) => ({
    id: `${failed.clusterRef.namespace ?? ""}/${failed.clusterRef.name ?? ""}-failed`,
    clusterNamespace: failed.clusterRef.namespace ?? "",
    clusterName: failed.clusterRef.name ?? "",
    profileName,
    feature: "Profile",
    message: failed.failureMessage,
  }));
}

export function filterErrorsByProfile(errors: DeployError[], kind: string, name: string): DeployError[] {
  return errors.filter((error) => error.profileKind === kind && error.profileName === name);
}

export function filterErrorsByCluster(errors: DeployError[], namespace: string, name: string): DeployError[] {
  return errors.filter((error) => error.clusterNamespace === namespace && error.clusterName === name);
}

export function filterErrorsByAddon(errors: DeployError[], addon: Addon): DeployError[] {
  return errors.filter((error) => {
    if (error.feature !== addon.type) return false;
    if (!error.resource) return true;

    return error.resource === `${addon.namespace ?? ""}/${addon.name}`;
  });
}
