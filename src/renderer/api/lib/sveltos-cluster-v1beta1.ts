import { Renderer } from "@freelensapp/extensions";

import type { SveltosKubeObjectCRD } from "../types";

export interface ClusterCheck {
  name: string;
  condition?: string;
}

export interface ActiveWindow {
  from: string;
  to: string;
}

export interface SveltosClusterSpec {
  kubeconfigName?: string;
  kubeconfigKeyName?: string;
  paused?: boolean;
  data?: Record<string, string>;
  activeWindow?: ActiveWindow;
  consecutiveFailureThreshold?: number;
  readinessChecks?: ClusterCheck[];
  livenessChecks?: ClusterCheck[];
  pullMode?: boolean;
}

export interface SveltosClusterStatus {
  version?: string;
  ready?: boolean;
  connectionStatus?: "Healthy" | "Down";
  failureMessage?: string;
  lastReconciledTokenRequestAt?: string;
  agentLastReportTime?: string;
  nextUnpause?: string;
  nextPause?: string;
  connectionFailures?: number;
}

export class SveltosCluster extends Renderer.K8sApi.LensExtensionKubeObject<
  Renderer.K8sApi.KubeObjectMetadata,
  SveltosClusterStatus,
  SveltosClusterSpec
> {
  declare kind: "SveltosCluster";
  declare apiVersion: "lib.projectsveltos.io/v1beta1";

  static readonly kind = "SveltosCluster";
  static readonly namespaced = true;
  static readonly apiBase = "/apis/lib.projectsveltos.io/v1beta1/sveltosclusters";

  static readonly crd: SveltosKubeObjectCRD = {
    apiVersions: ["lib.projectsveltos.io/v1beta1"],
    plural: "sveltosclusters",
    singular: "sveltoscluster",
    title: "Sveltos Clusters",
  };

  static getReady(object: SveltosCluster): boolean {
    return object.status?.ready ?? false;
  }

  static getConnectionStatus(object: SveltosCluster): string | undefined {
    return object.status?.connectionStatus;
  }

  static getVersion(object: SveltosCluster): string | undefined {
    return object.status?.version;
  }

  static getPaused(object: SveltosCluster): boolean {
    return object.spec?.paused ?? false;
  }
}

export class SveltosClusterApi extends Renderer.K8sApi.KubeApi<SveltosCluster> {}
export class SveltosClusterStore extends Renderer.K8sApi.KubeObjectStore<SveltosCluster, SveltosClusterApi> {}
