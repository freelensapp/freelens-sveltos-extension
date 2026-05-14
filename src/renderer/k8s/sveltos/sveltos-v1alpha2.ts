import { Renderer } from "@freelensapp/extensions";

import type { NamespacedObjectReference, SveltosKubeObjectCRD } from "../types";

export interface SveltosSpec {
  title?: string;
  suspended?: boolean;
  description?: string;
  sveltos?: NamespacedObjectReference[];
}

export type SveltosStatus = {};

export class Sveltos extends Renderer.K8sApi.LensExtensionKubeObject<
  Renderer.K8sApi.KubeObjectMetadata,
  SveltosStatus,
  SveltosSpec
> {
  static readonly kind = "Sveltos";
  static readonly namespaced = true;
  static readonly apiBase = "/apis/sveltos.freelens.app/v1alpha2/sveltos";

  static readonly crd: SveltosKubeObjectCRD = {
    apiVersions: ["sveltos.freelens.app/v1alpha2"],
    plural: "sveltos",
    singular: "sveltos",
    shortNames: ["ex"],
    title: "Sveltos",
  };

  static getSuspended(object: Sveltos): boolean {
    return object.spec.suspended ?? false;
  }

  static getTitle(object: Sveltos): string | undefined {
    return object.spec.title;
  }
}

export class SveltosApi extends Renderer.K8sApi.KubeApi<Sveltos> {}
export class SveltosStore extends Renderer.K8sApi.KubeObjectStore<Sveltos, SveltosApi> {}
