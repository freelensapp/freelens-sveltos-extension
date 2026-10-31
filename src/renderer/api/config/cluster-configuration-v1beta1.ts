import { Renderer } from "@freelensapp/extensions";

import type { SveltosKubeObjectCRD } from "../types";

export interface Chart {
  repoURL: string;
  releaseName: string;
  namespace?: string;
  chartVersion: string;
  appVersion?: string;
  /** URL of the chart logo, resolved by the addon controller from the deployed release. */
  icon?: string;
  lastAppliedTime?: string;
}

export interface DeployedResource {
  name: string;
  namespace?: string;
  group: string;
  kind: string;
  version: string;
  lastAppliedTime?: string;
  deploymentType?: "Local" | "Remote";
}

export interface Feature {
  featureID: string;
  resources?: DeployedResource[];
  charts?: Chart[];
}

/** The API serialises these as `Features`, with a capital F. */
export interface ClusterProfileResource {
  clusterProfileName: string;
  Features?: Feature[];
}

export interface ProfileResource {
  profileName: string;
  Features?: Feature[];
}

export interface ClusterConfigurationStatus {
  clusterProfileResources?: ClusterProfileResource[];
  profileResources?: ProfileResource[];
}

export interface DeployedChart {
  profileKind: string;
  profileName: string;
  chart: Chart;
}

export const clusterNameLabel = "projectsveltos.io/cluster-name";

/** Reports what Sveltos actually deployed in a cluster, including the chart logos. */
export class ClusterConfiguration extends Renderer.K8sApi.LensExtensionKubeObject<
  Renderer.K8sApi.KubeObjectMetadata,
  ClusterConfigurationStatus,
  void
> {
  declare kind: "ClusterConfiguration";
  declare apiVersion: "config.projectsveltos.io/v1beta1";

  static readonly kind = "ClusterConfiguration";
  static readonly namespaced = true;
  static readonly apiBase = "/apis/config.projectsveltos.io/v1beta1/clusterconfigurations";

  static readonly crd: SveltosKubeObjectCRD = {
    apiVersions: ["config.projectsveltos.io/v1beta1"],
    plural: "clusterconfigurations",
    singular: "clusterconfiguration",
    title: "Cluster Configurations",
  };

  static getClusterName(object: ClusterConfiguration): string | undefined {
    return object.metadata.labels?.[clusterNameLabel];
  }

  static getDeployedCharts(object: ClusterConfiguration): DeployedChart[] {
    const fromClusterProfiles = (object.status?.clusterProfileResources ?? []).flatMap((resource) =>
      charts("ClusterProfile", resource.clusterProfileName, resource.Features),
    );
    const fromProfiles = (object.status?.profileResources ?? []).flatMap((resource) =>
      charts("Profile", resource.profileName, resource.Features),
    );

    return [...fromClusterProfiles, ...fromProfiles];
  }
}

function charts(profileKind: string, profileName: string, features: Feature[] | undefined): DeployedChart[] {
  return (features ?? []).flatMap((feature) =>
    (feature.charts ?? []).map((chart) => ({ profileKind, profileName, chart })),
  );
}

export class ClusterConfigurationApi extends Renderer.K8sApi.KubeApi<ClusterConfiguration> {}
export class ClusterConfigurationStore extends Renderer.K8sApi.KubeObjectStore<
  ClusterConfiguration,
  ClusterConfigurationApi
> {}
