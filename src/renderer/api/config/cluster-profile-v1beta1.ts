import { Renderer } from "@freelensapp/extensions";

import type { ProfileSpec, ProfileStatus, SveltosKubeObjectCRD } from "../types";

export class ClusterProfile extends Renderer.K8sApi.LensExtensionKubeObject<
  Renderer.K8sApi.KubeObjectMetadata,
  ProfileStatus,
  ProfileSpec
> {
  static readonly kind = "ClusterProfile";
  static readonly namespaced = false;
  static readonly apiBase = "/apis/config.projectsveltos.io/v1beta1/clusterprofiles";

  static readonly crd: SveltosKubeObjectCRD = {
    apiVersions: ["config.projectsveltos.io/v1beta1"],
    plural: "clusterprofiles",
    singular: "clusterprofile",
    title: "Cluster Profiles",
  };
}

export class ClusterProfileApi extends Renderer.K8sApi.KubeApi<ClusterProfile> {}
export class ClusterProfileStore extends Renderer.K8sApi.KubeObjectStore<ClusterProfile, ClusterProfileApi> {}
