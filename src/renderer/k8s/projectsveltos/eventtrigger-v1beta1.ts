/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Renderer } from "@freelensapp/extensions";

import type { SveltosKubeObjectCRD } from "../types";

export interface EventTriggerSpec {
  eventSourceName?: string;
}

export interface EventTriggerStatus {}

export class EventTrigger extends Renderer.K8sApi.LensExtensionKubeObject<
  Renderer.K8sApi.KubeObjectMetadata,
  EventTriggerStatus,
  EventTriggerSpec
> {
  static readonly kind = "EventTrigger";
  static readonly namespaced = false;
  static readonly apiBase = "/apis/lib.projectsveltos.io/v1beta1/eventtriggers";

  static readonly crd: SveltosKubeObjectCRD = {
    apiVersions: ["lib.projectsveltos.io/v1beta1"],
    plural: "eventtriggers",
    singular: "eventtrigger",
    shortNames: ["et"],
    title: "Event Triggers",
  };
}

export class EventTriggerApi extends Renderer.K8sApi.KubeApi<EventTrigger> {}
export class EventTriggerStore extends Renderer.K8sApi.KubeObjectStore<EventTrigger, EventTriggerApi> {}

export const eventTriggerApi = new EventTriggerApi({ objectConstructor: EventTrigger });
