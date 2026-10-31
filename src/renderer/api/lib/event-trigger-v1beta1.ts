import { Renderer } from "@freelensapp/extensions";

import type {
  ClusterInfo,
  HelmChart,
  KustomizationRef,
  ObjectReference,
  PolicyRef,
  Selector,
  SveltosKubeObjectCRD,
  SyncMode,
  TemplateResourceRef,
} from "../types";

export interface GeneratorReference {
  namespace?: string;
  name: string;
  nameFormat: string;
  optional?: boolean;
}

export interface EventTriggerSpec {
  sourceClusterSelector?: Selector;
  clusterSetRefs?: string[];
  destinationClusterSelector?: Selector;
  destinationCluster?: ObjectReference;
  oneForEvent?: boolean;
  profileNameFormat?: string;
  eventSourceName: string;
  configMapGenerator?: GeneratorReference[];
  secretGenerator?: GeneratorReference[];
  syncMode?: SyncMode;
  tier?: number;
  continueOnConflict?: boolean;
  maxUpdate?: number | string;
  stopMatchingBehavior?: "WithdrawPolicies" | "LeavePolicies";
  reloader?: boolean;
  dependsOn?: string[];
  templateResourceRefs?: TemplateResourceRef[];
  policyRefs?: PolicyRef[];
  helmCharts?: HelmChart[];
  kustomizationRefs?: KustomizationRef[];
  cloudEventAction?: "Create" | "Delete";
}

export interface EventTriggerStatus {
  matchingClusters?: ObjectReference[];
  destinationMatchingClusterRefs?: ObjectReference[];
  clusterInfo?: ClusterInfo[];
}

export class EventTrigger extends Renderer.K8sApi.LensExtensionKubeObject<
  Renderer.K8sApi.KubeObjectMetadata,
  EventTriggerStatus,
  EventTriggerSpec
> {
  declare kind: "EventTrigger";
  declare apiVersion: "lib.projectsveltos.io/v1beta1";

  static readonly kind = "EventTrigger";
  static readonly namespaced = false;
  static readonly apiBase = "/apis/lib.projectsveltos.io/v1beta1/eventtriggers";

  static readonly crd: SveltosKubeObjectCRD = {
    apiVersions: ["lib.projectsveltos.io/v1beta1"],
    plural: "eventtriggers",
    singular: "eventtrigger",
    title: "Event Triggers",
  };

  static getEventSourceName(object: EventTrigger): string | undefined {
    return object.spec?.eventSourceName;
  }

  static getMatchingClusterCount(object: EventTrigger): number {
    return (object.status?.matchingClusters ?? []).length;
  }
}

export class EventTriggerApi extends Renderer.K8sApi.KubeApi<EventTrigger> {}
export class EventTriggerStore extends Renderer.K8sApi.KubeObjectStore<EventTrigger, EventTriggerApi> {}
