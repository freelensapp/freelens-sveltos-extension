import { Renderer } from "@freelensapp/extensions";

import type { ProfileSpec, ProfileStatus, SveltosKubeObjectCRD } from "../types";

export class Profile extends Renderer.K8sApi.LensExtensionKubeObject<
  Renderer.K8sApi.KubeObjectMetadata,
  ProfileStatus,
  ProfileSpec
> {
  declare kind: "Profile";
  declare apiVersion: "config.projectsveltos.io/v1beta1";

  static readonly kind = "Profile";
  static readonly namespaced = true;
  static readonly apiBase = "/apis/config.projectsveltos.io/v1beta1/profiles";

  static readonly crd: SveltosKubeObjectCRD = {
    apiVersions: ["config.projectsveltos.io/v1beta1"],
    plural: "profiles",
    singular: "profile",
    title: "Profiles",
  };
}

export class ProfileApi extends Renderer.K8sApi.KubeApi<Profile> {}
export class ProfileStore extends Renderer.K8sApi.KubeObjectStore<Profile, ProfileApi> {}
