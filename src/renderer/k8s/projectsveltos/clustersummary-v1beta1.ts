/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Renderer } from "@freelensapp/extensions";

import type { SveltosKubeObjectCRD } from "../types";

export interface ClusterSummarySpec {
  clusterName?: string;
  clusterNamespace?: string;
  clusterType?: string;
}

export interface ClusterSummaryStatus {}

export class ClusterSummary extends Renderer.K8sApi.LensExtensionKubeObject<
  Renderer.K8sApi.KubeObjectMetadata,
  ClusterSummaryStatus,
  ClusterSummarySpec
> {
  static readonly kind = "ClusterSummary";
  static readonly namespaced = true;
  static readonly apiBase = "/apis/config.projectsveltos.io/v1beta1/clustersummaries";

  static readonly crd: SveltosKubeObjectCRD = {
    apiVersions: ["config.projectsveltos.io/v1beta1"],
    plural: "clustersummaries",
    singular: "clustersummary",
    shortNames: ["cs"],
    title: "Cluster Summaries",
  };
}

export class ClusterSummaryApi extends Renderer.K8sApi.KubeApi<ClusterSummary> {}
export class ClusterSummaryStore extends Renderer.K8sApi.KubeObjectStore<ClusterSummary, ClusterSummaryApi> {}
