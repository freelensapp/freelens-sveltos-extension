import { Renderer } from "@freelensapp/extensions";

import type { ResourceSelector, SveltosKubeObjectCRD } from "../types";

export interface MessagingMatchCriteria {
  subject?: string;
  cloudEventSource?: string;
  cloudEventType?: string;
  cloudEventSubject?: string;
}

export interface EventSourceSpec {
  resourceSelectors?: ResourceSelector[];
  aggregatedSelection?: string;
  collectResources?: boolean;
  messagingMatchCriteria?: MessagingMatchCriteria[];
}

/** `EventSource` has no status subresource. */
export type EventSourceStatus = Record<string, never>;

export class EventSource extends Renderer.K8sApi.LensExtensionKubeObject<
  Renderer.K8sApi.KubeObjectMetadata,
  EventSourceStatus,
  EventSourceSpec
> {
  declare kind: "EventSource";
  declare apiVersion: "lib.projectsveltos.io/v1beta1";

  static readonly kind = "EventSource";
  static readonly namespaced = false;
  static readonly apiBase = "/apis/lib.projectsveltos.io/v1beta1/eventsources";

  static readonly crd: SveltosKubeObjectCRD = {
    apiVersions: ["lib.projectsveltos.io/v1beta1"],
    plural: "eventsources",
    singular: "eventsource",
    title: "Event Sources",
  };

  static getWatchedKinds(object: EventSource): string[] {
    return (object.spec?.resourceSelectors ?? []).map((selector) =>
      [selector.group, selector.version, selector.kind].filter(Boolean).join("/"),
    );
  }

  static getCollectResources(object: EventSource): boolean {
    return object.spec?.collectResources ?? false;
  }
}

export class EventSourceApi extends Renderer.K8sApi.KubeApi<EventSource> {}
export class EventSourceStore extends Renderer.K8sApi.KubeObjectStore<EventSource, EventSourceApi> {}
