/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Renderer } from "@freelensapp/extensions";

import type { SveltosKubeObjectCRD } from "../types";

export interface ProfileClusterSelectorMatchExpression {
  key: string;
  operator: string;
  values?: string[];
}

export interface ProfileClusterSelector {
  matchLabels?: Record<string, string>;
  matchExpressions?: ProfileClusterSelectorMatchExpression[];
}

export interface ProfileSpec {
  syncMode?: string;
  tier?: number;
  clusterSelector?: ProfileClusterSelector;
  stopMatchingBehavior?: string;
  reloader?: boolean;
}

export interface ProfileStatus {}

export class Profile extends Renderer.K8sApi.LensExtensionKubeObject<
  Renderer.K8sApi.KubeObjectMetadata,
  ProfileStatus,
  ProfileSpec
> {
  static readonly kind = "Profile";
  static readonly namespaced = true;
  static readonly apiBase = "/apis/config.projectsveltos.io/v1beta1/profiles";

  static readonly crd: SveltosKubeObjectCRD = {
    apiVersions: ["config.projectsveltos.io/v1beta1"],
    plural: "profiles",
    singular: "profile",
    shortNames: ["p"],
    title: "Profiles",
  };
}

export class ProfileApi extends Renderer.K8sApi.KubeApi<Profile> {}
export class ProfileStore extends Renderer.K8sApi.KubeObjectStore<Profile, ProfileApi> {}
