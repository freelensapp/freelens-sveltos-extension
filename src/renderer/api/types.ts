import { Renderer } from "@freelensapp/extensions";

export interface SveltosKubeObjectCRD extends Renderer.K8sApi.LensExtensionKubeObjectCRD {
  title: string;
}

export interface ObjectReference {
  apiVersion?: string;
  kind?: string;
  name?: string;
  namespace?: string;
  uid?: string;
}

export interface LabelSelectorRequirement {
  key: string;
  operator: string;
  values?: string[];
}

/** `libsveltos` Selector inlines a `metav1.LabelSelector`. */
export interface Selector {
  matchLabels?: Record<string, string>;
  matchExpressions?: LabelSelectorRequirement[];
}

export interface LabelFilter {
  key: string;
  operation: string;
  value?: string;
}

export interface ResourceSelector {
  group: string;
  version: string;
  kind: string;
  labelFilters?: LabelFilter[];
  namespace?: string;
  name?: string;
  evaluate?: string;
}

export interface ValueFrom {
  namespace?: string;
  name: string;
  kind: string;
  optional?: boolean;
}

export interface HelmChart {
  repositoryURL: string;
  repositoryName?: string;
  chartName?: string;
  chartVersion?: string;
  releaseName: string;
  releaseNamespace: string;
  values?: string;
  valuesFrom?: ValueFrom[];
  helmChartAction?: "Install" | "Uninstall";
}

export interface PolicyRef {
  namespace?: string;
  name?: string;
  kind?: string;
  path?: string;
  deploymentType?: "Local" | "Remote";
  optional?: boolean;
  tier?: number;
}

export interface KustomizationRef {
  namespace?: string;
  name?: string;
  kind?: string;
  path?: string;
  targetNamespace?: string;
  deploymentType?: "Local" | "Remote";
  optional?: boolean;
  tier?: number;
}

export interface TemplateResourceRef {
  resource: ObjectReference;
  identifier: string;
  optional?: boolean;
}

export interface ValidateHealth {
  name: string;
  featureID: string;
  group: string;
  version: string;
  kind: string;
  namespace?: string;
  script?: string;
}

export type SyncMode = "OneTime" | "Continuous" | "ContinuousWithDriftDetection" | "DryRun";

/** Shared spec of `ClusterProfile` and `Profile` (`config.projectsveltos.io`). */
export interface ProfileSpec {
  clusterSelector?: Selector;
  clusterRefs?: ObjectReference[];
  setRefs?: string[];
  syncMode?: SyncMode;
  tier?: number;
  continueOnConflict?: boolean;
  continueOnError?: boolean;
  maxUpdate?: number | string;
  stopMatchingBehavior?: "WithdrawPolicies" | "LeavePolicies";
  reloader?: boolean;
  templateResourceRefs?: TemplateResourceRef[];
  dependsOn?: string[];
  policyRefs?: PolicyRef[];
  helmCharts?: HelmChart[];
  kustomizationRefs?: KustomizationRef[];
  validateHealths?: ValidateHealth[];
  extraLabels?: Record<string, string>;
  extraAnnotations?: Record<string, string>;
}

export interface Clusters {
  hash?: string;
  clusters?: ObjectReference[];
}

export interface FailedCluster {
  clusterRef: ObjectReference;
  failureMessage: string;
  lastFailureTime?: string;
}

/** Shared status of `ClusterProfile` and `Profile`. */
export interface ProfileStatus {
  matchingClusters?: ObjectReference[];
  updatingClusters?: Clusters;
  updatedClusters?: Clusters;
  failedClusters?: FailedCluster[];
}

/** `Blocked` means deployment waits for the profiles listed in `dependsOn`. */
export type FeatureStatus =
  | "Provisioning"
  | "Provisioned"
  | "Failed"
  | "FailedNonRetriable"
  | "Removing"
  | "AgentRemoving"
  | "Removed"
  | "Blocked";

export interface ClusterInfo {
  clusterRef: ObjectReference;
  hash?: string;
  status?: FeatureStatus;
  failureMessage?: string;
}

export interface Resource {
  name: string;
  namespace?: string;
  group: string;
  kind: string;
  version?: string;
  owner?: ObjectReference;
  message?: string;
}

export interface ResourceReport {
  resource: Resource;
  action?: string;
  message?: string;
}

export function objectReferenceToString(ref: ObjectReference | undefined): string {
  if (!ref) return "";
  const name = ref.namespace ? `${ref.namespace}/${ref.name}` : (ref.name ?? "");
  return ref.kind ? `${name} (${ref.kind})` : name;
}

export function selectorToString(selector: Selector | undefined): string | undefined {
  if (!selector) return undefined;

  const labels = Object.entries(selector.matchLabels ?? {}).map(([key, value]) => `${key}=${value}`);
  const expressions = (selector.matchExpressions ?? []).map((expression) =>
    `${expression.key} ${expression.operator} ${(expression.values ?? []).join(",")}`.trim(),
  );
  const parts = [...labels, ...expressions];

  return parts.length > 0 ? parts.join(", ") : undefined;
}
