import { Renderer } from "@freelensapp/extensions";

export interface NamespacedObjectReference {
  name: string;
  namespace?: string;
}

export interface SveltosKubeObjectCRD extends Renderer.K8sApi.LensExtensionKubeObjectCRD {
  title: string;
}
