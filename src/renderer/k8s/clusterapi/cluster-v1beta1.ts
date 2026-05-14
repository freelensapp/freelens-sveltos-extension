/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Renderer } from "@freelensapp/extensions";

import type { SveltosKubeObjectCRD } from "../types";

export interface CapiClusterSpec {
  paused?: boolean;
}

export interface CapiClusterCondition {
  type: string;
  status: string;
}

export interface CapiClusterStatus {
  phase?: string;
  controlPlaneReady?: boolean;
  conditions?: CapiClusterCondition[];
  initialization?: { controlPlaneInitialized?: boolean };
}

export class CapiCluster extends Renderer.K8sApi.LensExtensionKubeObject<
  Renderer.K8sApi.KubeObjectMetadata,
  CapiClusterStatus,
  CapiClusterSpec
> {
  static readonly kind = "Cluster";
  static readonly namespaced = true;
  static readonly apiBase = "/apis/cluster.x-k8s.io/v1beta1/clusters";

  static readonly crd: SveltosKubeObjectCRD = {
    apiVersions: ["cluster.x-k8s.io/v1beta1"],
    plural: "clusters",
    singular: "cluster",
    shortNames: ["capi-cluster"],
    title: "ClusterAPI Clusters",
  };
}

export class CapiClusterApi extends Renderer.K8sApi.KubeApi<CapiCluster> {}
export class CapiClusterStore extends Renderer.K8sApi.KubeObjectStore<CapiCluster, CapiClusterApi> {}
