import { ClusterConfiguration } from "./config/cluster-configuration-v1beta1";
import { ClusterSummary } from "./config/cluster-summary-v1beta1";
import { matchesSearchQuery, parseSearchQuery, toSearchFields } from "./search-query";

import type { Chart } from "./config/cluster-configuration-v1beta1";
import type { HelmChartSummary } from "./config/cluster-summary-v1beta1";
import type { FeatureStatus } from "./types";

export type AddonType = "Helm" | "Resources" | "Kustomize";

export const addonTypes: AddonType[] = ["Helm", "Resources", "Kustomize"];

export interface Addon {
  id: string;
  type: AddonType;
  name: string;
  namespace?: string;
  version?: string;
  appVersion?: string;
  latestVersion?: string;
  latestPatchVersion?: string;
  /** `undefined` when addon-controller has not checked the chart repository yet. */
  updateAvailable?: boolean;
  source?: string;
  chartName?: string;
  repositoryURL?: string;
  /** URL of the chart logo as reported by Sveltos. */
  icon?: string;
  clusterNamespace: string;
  clusterName: string;
  /** `Sveltos` or `Capi`, decides which Secret holds the cluster kubeconfig. */
  clusterType?: string;
  profile?: string;
  status?: string;
  message?: string;
  lastAppliedTime?: string;
}

export function clusterKey(namespace: string | undefined, name: string | undefined): string {
  return `${namespace ?? ""}/${name ?? ""}`;
}

function releaseKey(clusterNamespace: string, clusterName: string, namespace: string, name: string): string {
  return `${clusterKey(clusterNamespace, clusterName)}|${namespace}/${name}`;
}

/** Charts actually deployed, keyed per cluster and release, as the Sveltos dashboard does. */
function indexDeployedCharts(configurations: ClusterConfiguration[]): Map<string, Chart> {
  const charts = new Map<string, Chart>();

  for (const configuration of configurations) {
    const clusterNamespace = configuration.metadata.namespace ?? "";
    const clusterName = ClusterConfiguration.getClusterName(configuration) ?? "";

    for (const { chart } of ClusterConfiguration.getDeployedCharts(configuration)) {
      charts.set(releaseKey(clusterNamespace, clusterName, chart.namespace ?? "", chart.releaseName), chart);
    }
  }

  return charts;
}

/** `deployedGVKs` supersedes the deprecated per-feature `deployedGroupVersionKind`. */
function getDeployedKinds(summary: ClusterSummary, featureID: AddonType): string[] {
  const current = summary.status?.deployedGVKs?.find((info) => info.featureID === featureID)?.deployedGroupVersionKind;

  if (current?.length) return current;

  return summary.status?.featureSummaries?.find((s) => s.featureID === featureID)?.deployedGroupVersionKind ?? [];
}

/** `Blocked` carries no failure, the reason is the dependency message on the summary. */
function getFeatureMessage(summary: ClusterSummary, featureID: AddonType): string | undefined {
  const feature = summary.status?.featureSummaries?.find((s) => s.featureID === featureID);

  if (feature?.status === "Blocked") return summary.status?.dependencies ?? "Waiting for the profiles it depends on";

  return feature?.failureMessage ?? summary.status?.failureMessage;
}

/**
 * addon-controller only writes the feature status once it picks the summary up, a fresh summary or a
 * feature added to an existing one has none yet: from the user point of view it is already provisioning.
 */
function getStatus(featureStatus: FeatureStatus | undefined): string {
  return featureStatus ?? "Provisioning";
}

/**
 * Every deployed chart gets a release summary, so a declared chart without one is not installed yet.
 * `Provisioned` there is stale, left over from before the chart was added to the profile.
 */
function getUndeployedStatus(featureStatus: FeatureStatus | undefined): string {
  return featureStatus === "Provisioned" ? "Provisioning" : getStatus(featureStatus);
}

/** Add-ons still on their way to the cluster, counted as provisioning on the cluster rows. */
export function isProvisioning(status: string | undefined): boolean {
  return status === "Provisioning" || status === "Pending" || status === "Blocked";
}

function getLastAppliedTime(summary: ClusterSummary, featureID: AddonType): string | undefined {
  return summary.status?.featureSummaries?.find((s) => s.featureID === featureID)?.lastAppliedTime;
}

function summaryId(summary: ClusterSummary): string {
  return `${summary.metadata.namespace ?? ""}/${summary.metadata.name}`;
}

/** Same rule as the Sveltos dashboard: addon-controller only sets the latest versions when newer than the deployed one. */
function isUpdateAvailable(release: HelmChartSummary): boolean | undefined {
  if (release.status !== "Managing") return undefined;
  if (release.latestVersion || release.latestPatchVersion) return true;

  return release.lastCheckedTime ? false : undefined;
}

/** The spec keeps the profile template, only the status holds the values Sveltos rendered per cluster. */
function isTemplate(value: string | undefined): boolean {
  return value?.includes("{{") ?? false;
}

function getHelmAddons(
  summary: ClusterSummary,
  base: Omit<Addon, "id" | "type" | "name">,
  deployed: Map<string, Chart>,
): Addon[] {
  const featureStatus = ClusterSummary.getFeatureStatus(summary, "Helm");
  const featureMessage = getFeatureMessage(summary, "Helm");
  const lastAppliedTime = getLastAppliedTime(summary, "Helm");
  const releases = summary.status?.helmReleaseSummaries ?? [];
  const declared = summary.spec?.clusterProfileSpec?.helmCharts ?? [];
  // chartName and repoURL only exist on recent Sveltos releases, the spec always has them.
  const declaredFor = (namespace: string, name: string) =>
    declared.find((chart) => chart.releaseNamespace === namespace && chart.releaseName === name);
  const deployedFor = (namespace: string, name: string) =>
    deployed.get(releaseKey(base.clusterNamespace, base.clusterName, namespace, name));

  const addons = releases.map((release) => {
    const chart = declaredFor(release.releaseNamespace, release.releaseName);
    const live = deployedFor(release.releaseNamespace, release.releaseName);

    return {
      ...base,
      id: `${summaryId(summary)}-helm-${release.releaseNamespace}/${release.releaseName}`,
      type: "Helm" as const,
      name: release.releaseName,
      namespace: release.releaseNamespace,
      version: release.chartVersion ?? live?.chartVersion ?? chart?.chartVersion,
      appVersion: live?.appVersion,
      latestVersion: release.latestVersion,
      latestPatchVersion: release.latestPatchVersion,
      updateAvailable: isUpdateAvailable(release),
      source: release.repoURL ?? live?.repoURL ?? chart?.repositoryURL ?? release.repositoryName ?? release.chartName,
      chartName: release.chartName ?? chart?.chartName,
      repositoryURL: release.repoURL ?? live?.repoURL ?? chart?.repositoryURL,
      icon: live?.icon,
      status: release.status === "Conflict" ? "Conflict" : getStatus(featureStatus),
      message: release.conflictMessage ?? release.failureMessage ?? featureMessage,
      lastAppliedTime: live?.lastAppliedTime ?? lastAppliedTime,
    };
  });
  const reported = new Set(addons.map((addon) => `${addon.namespace}/${addon.name}`));

  // Charts declared in the profile that have not produced a release summary yet.
  const pending = declared
    .filter((chart) => !isTemplate(chart.releaseName) && !isTemplate(chart.releaseNamespace))
    .filter((chart) => !reported.has(`${chart.releaseNamespace}/${chart.releaseName}`))
    .map((chart) => ({
      ...base,
      id: `${summaryId(summary)}-helm-${chart.releaseNamespace}/${chart.releaseName}`,
      type: "Helm" as const,
      name: chart.releaseName,
      namespace: chart.releaseNamespace,
      version: chart.chartVersion,
      appVersion: deployedFor(chart.releaseNamespace, chart.releaseName)?.appVersion,
      source: chart.repositoryURL,
      chartName: chart.chartName,
      repositoryURL: chart.repositoryURL,
      icon: deployedFor(chart.releaseNamespace, chart.releaseName)?.icon,
      status: getUndeployedStatus(featureStatus),
      message: featureMessage,
    }));

  return [...addons, ...pending];
}

function getResourceAddons(
  summary: ClusterSummary,
  featureID: Extract<AddonType, "Resources" | "Kustomize">,
  base: Omit<Addon, "id" | "type" | "name">,
): Addon[] {
  const featureStatus = ClusterSummary.getFeatureStatus(summary, featureID);
  const message = getFeatureMessage(summary, featureID);
  const lastAppliedTime = getLastAppliedTime(summary, featureID);
  const deployed = getDeployedKinds(summary, featureID);

  if (deployed.length > 0) {
    return deployed.map((kind) => ({
      ...base,
      id: `${summaryId(summary)}-${featureID}-${kind}`,
      type: featureID,
      name: kind,
      status: getStatus(featureStatus),
      message,
      lastAppliedTime,
    }));
  }

  const refs =
    featureID === "Resources"
      ? (summary.spec?.clusterProfileSpec?.policyRefs ?? [])
      : (summary.spec?.clusterProfileSpec?.kustomizationRefs ?? []);

  return refs.map((ref, index) => ({
    ...base,
    id: `${summaryId(summary)}-${featureID}-ref-${index}`,
    type: featureID,
    name: ref.name ?? ref.kind ?? "unnamed",
    namespace: ref.namespace,
    source: [ref.kind, ref.path].filter(Boolean).join(" "),
    status: getStatus(featureStatus),
    message,
    lastAppliedTime,
  }));
}

/** Sveltos leaves a ClusterSummary behind when it cannot reach a deleted cluster to withdraw its policies. */
function isLiveSummary(summary: ClusterSummary, knownClusters?: Set<string>): boolean {
  if (summary.metadata.deletionTimestamp) return false;
  if (!knownClusters?.size || summary.spec?.clusterType !== "Sveltos") return true;

  return knownClusters.has(clusterKey(summary.spec?.clusterNamespace, summary.spec?.clusterName));
}

/** Flattens ClusterSummary resources into the add-on rows shown under the clusters. */
export function getAddons(
  summaries: ClusterSummary[],
  configurations: ClusterConfiguration[] = [],
  knownClusters?: Set<string>,
): Addon[] {
  const deployed = indexDeployedCharts(configurations);

  return summaries
    .filter((summary) => isLiveSummary(summary, knownClusters))
    .flatMap((summary) => {
      const base = {
        clusterNamespace: summary.spec?.clusterNamespace ?? summary.metadata.namespace ?? "",
        clusterName: summary.spec?.clusterName ?? "",
        clusterType: summary.spec?.clusterType,
        profile: ClusterSummary.getProfileName(summary),
      };

      return [
        ...getHelmAddons(summary, base, deployed),
        ...getResourceAddons(summary, "Resources", base),
        ...getResourceAddons(summary, "Kustomize", base),
      ];
    });
}

export function updateLabel(addon: Addon): string | undefined {
  if (addon.updateAvailable === undefined) return undefined;

  return addon.updateAvailable ? "Outdated" : "Up to date";
}

export function filterAddons(addons: Addon[], type: AddonType | "All", search: string): Addon[] {
  const terms = parseSearchQuery(search);

  return addons.filter((addon) => {
    if (type !== "All" && addon.type !== type) return false;

    return matchesSearchQuery(terms, {
      text: [addon.name, addon.source],
      fields: toSearchFields({
        type: addon.type,
        name: addon.name,
        namespace: addon.namespace,
        version: addon.version,
        cluster: addon.clusterName,
        profile: addon.profile,
        status: addon.status,
        source: addon.source,
        update: updateLabel(addon),
      }),
    });
  });
}
