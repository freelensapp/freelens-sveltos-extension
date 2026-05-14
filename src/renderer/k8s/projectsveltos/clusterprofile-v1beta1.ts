/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Renderer } from "@freelensapp/extensions";

import type { SveltosKubeObjectCRD } from "../types";

export interface ClusterSelectorMatchExpression {
  key: string;
  operator: string;
  values?: string[];
}

export interface ClusterSelector {
  matchLabels?: Record<string, string>;
  matchExpressions?: ClusterSelectorMatchExpression[];
}

export interface ClusterProfileSpec {
  syncMode?: string;
  tier?: number;
  clusterSelector?: ClusterSelector;
  stopMatchingBehavior?: string;
  reloader?: boolean;
}

export interface ClusterProfileStatus {}

export class ClusterProfile extends Renderer.K8sApi.LensExtensionKubeObject<
  Renderer.K8sApi.KubeObjectMetadata,
  ClusterProfileStatus,
  ClusterProfileSpec
> {
  static readonly kind = "ClusterProfile";
  static readonly namespaced = false;
  static readonly apiBase = "/apis/config.projectsveltos.io/v1beta1/clusterprofiles";

  static readonly crd: SveltosKubeObjectCRD = {
    apiVersions: ["config.projectsveltos.io/v1beta1"],
    plural: "clusterprofiles",
    singular: "clusterprofile",
    shortNames: ["cp"],
    title: "Cluster Profiles",
  };
}

export class ClusterProfileApi extends Renderer.K8sApi.KubeApi<ClusterProfile> {}
export class ClusterProfileStore extends Renderer.K8sApi.KubeObjectStore<ClusterProfile, ClusterProfileApi> {}
