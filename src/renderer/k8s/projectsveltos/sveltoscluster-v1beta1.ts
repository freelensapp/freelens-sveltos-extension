/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Renderer } from "@freelensapp/extensions";

import type { SveltosKubeObjectCRD } from "../types";

export interface SveltosClusterSpec {
  pullMode?: boolean;
  paused?: boolean;
}

export interface SveltosClusterStatus {
  ready?: boolean;
  version?: string;
  failureMessage?: string;
}

export class SveltosCluster extends Renderer.K8sApi.LensExtensionKubeObject<
  Renderer.K8sApi.KubeObjectMetadata,
  SveltosClusterStatus,
  SveltosClusterSpec
> {
  static readonly kind = "SveltosCluster";
  static readonly namespaced = true;
  static readonly apiBase = "/apis/lib.projectsveltos.io/v1beta1/sveltosclusters";

  static readonly crd: SveltosKubeObjectCRD = {
    apiVersions: ["lib.projectsveltos.io/v1beta1"],
    plural: "sveltosclusters",
    singular: "sveltoscluster",
    shortNames: ["sc"],
    title: "Sveltos Clusters",
  };
}

export class SveltosClusterApi extends Renderer.K8sApi.KubeApi<SveltosCluster> {}
export class SveltosClusterStore extends Renderer.K8sApi.KubeObjectStore<SveltosCluster, SveltosClusterApi> {}
