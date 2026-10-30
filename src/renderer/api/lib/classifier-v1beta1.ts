import { Renderer } from "@freelensapp/extensions";

import type { ClusterInfo, ObjectReference, ResourceSelector, SveltosKubeObjectCRD } from "../types";

export interface ClassifierLabel {
  key: string;
  value: string;
}

export interface KubernetesVersionConstraint {
  version: string;
  comparison: string;
}

export interface DeployedResourceConstraint {
  resourceSelectors: ResourceSelector[];
  aggregatedClassification?: string;
}

export interface ClassifierSpec {
  classifierLabels?: ClassifierLabel[];
  kubernetesVersionConstraints?: KubernetesVersionConstraint[];
  deployedResourceConstraint?: DeployedResourceConstraint;
}

export interface MachingClusterStatus {
  clusterRef: ObjectReference;
  managedLabels?: string[];
  unManagedLabels?: { key: string; failureMessage?: string }[];
}

export interface ClassifierStatus {
  machingClusterStatuses?: MachingClusterStatus[];
  clusterInfo?: ClusterInfo[];
}

export class Classifier extends Renderer.K8sApi.LensExtensionKubeObject<
  Renderer.K8sApi.KubeObjectMetadata,
  ClassifierStatus,
  ClassifierSpec
> {
  static readonly kind = "Classifier";
  static readonly namespaced = false;
  static readonly apiBase = "/apis/lib.projectsveltos.io/v1beta1/classifiers";

  static readonly crd: SveltosKubeObjectCRD = {
    apiVersions: ["lib.projectsveltos.io/v1beta1"],
    plural: "classifiers",
    singular: "classifier",
    title: "Classifiers",
  };

  static getLabels(object: Classifier): string[] {
    return (object.spec?.classifierLabels ?? []).map((label) => `${label.key}=${label.value}`);
  }

  static getMatchingClusterCount(object: Classifier): number {
    return (object.status?.machingClusterStatuses ?? []).length;
  }
}

export class ClassifierApi extends Renderer.K8sApi.KubeApi<Classifier> {}
export class ClassifierStore extends Renderer.K8sApi.KubeObjectStore<Classifier, ClassifierApi> {}
