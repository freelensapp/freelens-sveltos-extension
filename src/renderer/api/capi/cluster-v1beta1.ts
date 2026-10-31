import { Renderer } from "@freelensapp/extensions";

import type { SveltosKubeObjectCRD } from "../types";

export interface CapiClusterSpec {
  paused?: boolean;
  topology?: { version?: string };
}

export interface CapiClusterStatus {
  phase?: string;
  controlPlaneReady?: boolean;
  infrastructureReady?: boolean;
  conditions?: { type: string; status: string }[];
}

/** ClusterAPI cluster, Sveltos discovers these on its own, no SveltosCluster needed. */
export class CapiCluster extends Renderer.K8sApi.LensExtensionKubeObject<
  Renderer.K8sApi.KubeObjectMetadata,
  CapiClusterStatus,
  CapiClusterSpec
> {
  declare kind: "Cluster";
  declare apiVersion: "cluster.x-k8s.io/v1beta1";

  static readonly kind = "Cluster";
  static readonly namespaced = true;
  // ponytail: v1beta1 only, still served by CAPI 1.11; add v1beta2 when clusters stop serving v1beta1.
  static readonly apiBase = "/apis/cluster.x-k8s.io/v1beta1/clusters";

  static readonly crd: SveltosKubeObjectCRD = {
    apiVersions: ["cluster.x-k8s.io/v1beta1"],
    plural: "clusters",
    singular: "cluster",
    title: "ClusterAPI Clusters",
  };

  static getReady(object: CapiCluster): boolean {
    const ready = object.status?.conditions?.find((condition) => condition.type === "Ready");

    if (ready) return ready.status === "True";

    return Boolean(object.status?.controlPlaneReady && object.status?.infrastructureReady);
  }

  /** The CAPI phase, shown where SveltosCluster has its connection status. */
  static getConnectionStatus(object: CapiCluster): string | undefined {
    return object.status?.phase;
  }

  static getVersion(object: CapiCluster): string | undefined {
    return object.spec?.topology?.version;
  }

  static getPaused(object: CapiCluster): boolean {
    return object.spec?.paused ?? false;
  }
}

export class CapiClusterApi extends Renderer.K8sApi.KubeApi<CapiCluster> {}
export class CapiClusterStore extends Renderer.K8sApi.KubeObjectStore<CapiCluster, CapiClusterApi> {}
