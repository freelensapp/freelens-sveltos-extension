import { Renderer } from "@freelensapp/extensions";

import type { FeatureStatus, ProfileSpec, SveltosKubeObjectCRD } from "../types";

export interface FeatureSummary {
  featureID: string;
  hash?: string;
  status?: FeatureStatus;
  failureReason?: string;
  failureMessage?: string;
  deployedGroupVersionKind?: string[];
  lastAppliedTime?: string;
}

export interface FeatureDeploymentInfo {
  featureID: string;
  deployedGroupVersionKind?: string[];
}

export interface HelmChartSummary {
  releaseName: string;
  releaseNamespace: string;
  status: "Managing" | "Conflict";
  conflictMessage?: string;
  failureMessage?: string;
  chartName?: string;
  repositoryName?: string;
  repoURL?: string;
  chartVersion?: string;
  latestVersion?: string;
  latestPatchVersion?: string;
  lastCheckedTime?: string;
}

export interface ClusterSummarySpec {
  clusterNamespace: string;
  clusterName: string;
  clusterType: string;
  clusterProfileSpec?: ProfileSpec;
}

export interface ClusterSummaryStatus {
  dependencies?: string;
  featureSummaries?: FeatureSummary[];
  deployedGVKs?: FeatureDeploymentInfo[];
  helmReleaseSummaries?: HelmChartSummary[];
  failureMessage?: string;
}

export class ClusterSummary extends Renderer.K8sApi.LensExtensionKubeObject<
  Renderer.K8sApi.KubeObjectMetadata,
  ClusterSummaryStatus,
  ClusterSummarySpec
> {
  declare kind: "ClusterSummary";
  declare apiVersion: "config.projectsveltos.io/v1beta1";

  static readonly kind = "ClusterSummary";
  static readonly namespaced = true;
  static readonly apiBase = "/apis/config.projectsveltos.io/v1beta1/clustersummaries";

  static readonly crd: SveltosKubeObjectCRD = {
    apiVersions: ["config.projectsveltos.io/v1beta1"],
    plural: "clustersummaries",
    singular: "clustersummary",
    title: "Add-ons",
  };

  static getFeatureStatus(object: ClusterSummary, featureID: string): FeatureStatus | undefined {
    return object.status?.featureSummaries?.find((summary) => summary.featureID === featureID)?.status;
  }

  /**
   * Worst status across every feature, used as the overall row status. A summary that declares add-ons
   * but has no feature status yet was just created, addon-controller is about to provision it.
   */
  static getOverallStatus(object: ClusterSummary): FeatureStatus | undefined {
    const statuses = (object.status?.featureSummaries ?? []).map((summary) => summary.status);

    for (const candidate of [
      "Failed",
      "FailedNonRetriable",
      "Provisioning",
      "Blocked",
      "Removing",
      "AgentRemoving",
      "Removed",
    ] as const) {
      if (statuses.includes(candidate)) return candidate;
    }

    if (statuses.length > 0) return "Provisioned";

    return ClusterSummary.declaresAddons(object) ? "Provisioning" : undefined;
  }

  static declaresAddons(object: ClusterSummary): boolean {
    const spec = object.spec?.clusterProfileSpec;

    return Boolean(spec?.helmCharts?.length || spec?.policyRefs?.length || spec?.kustomizationRefs?.length);
  }

  static getProfileRef(object: ClusterSummary): { kind: string; name: string } | undefined {
    const owner = object.metadata.ownerReferences?.find(
      (reference) => reference.kind === "ClusterProfile" || reference.kind === "Profile",
    );

    return owner ? { kind: owner.kind, name: owner.name } : undefined;
  }

  static getProfileName(object: ClusterSummary): string | undefined {
    return ClusterSummary.getProfileRef(object)?.name;
  }
}

export class ClusterSummaryApi extends Renderer.K8sApi.KubeApi<ClusterSummary> {}
export class ClusterSummaryStore extends Renderer.K8sApi.KubeObjectStore<ClusterSummary, ClusterSummaryApi> {}
