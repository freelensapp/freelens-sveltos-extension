import { Renderer } from "@freelensapp/extensions";
import * as MobxReact from "mobx-react";
import { selectorToString } from "../api/types";
import { ObjectReferenceList } from "../components/object-reference-list";

import type { EventTrigger } from "../api/utils/event-trigger-v1beta1";

const { observer } = MobxReact;

const {
  Component: { BadgeBoolean, DrawerItem, DrawerTitle },
} = Renderer;

export interface EventTriggerDetailsProps extends Renderer.Component.KubeObjectDetailsProps<EventTrigger> {}

export const EventTriggerDetails = observer((props: EventTriggerDetailsProps) => {
  const { object } = props;
  const clusterInfo = object.status?.clusterInfo ?? [];

  return (
    <>
      <DrawerTitle>Trigger</DrawerTitle>
      <DrawerItem name="Event Source">{object.spec?.eventSourceName ?? "N/A"}</DrawerItem>
      <DrawerItem name="One For Event">
        <BadgeBoolean value={object.spec?.oneForEvent ?? false} />
      </DrawerItem>
      <DrawerItem name="Cloud Event Action" hidden={!object.spec?.cloudEventAction}>
        {object.spec?.cloudEventAction}
      </DrawerItem>
      <DrawerItem name="Source Cluster Selector">
        {selectorToString(object.spec?.sourceClusterSelector) ?? "N/A"}
      </DrawerItem>
      <DrawerItem name="Destination Cluster Selector" hidden={!object.spec?.destinationClusterSelector}>
        {selectorToString(object.spec?.destinationClusterSelector) ?? "N/A"}
      </DrawerItem>
      <DrawerItem name="Sync Mode">{object.spec?.syncMode ?? "Continuous"}</DrawerItem>
      <DrawerItem name="Tier">{object.spec?.tier ?? 100}</DrawerItem>

      <DrawerTitle>Matching Clusters</DrawerTitle>
      <DrawerItem name="Source">
        <ObjectReferenceList refs={object.status?.matchingClusters} />
      </DrawerItem>
      <DrawerItem name="Destination" hidden={!object.status?.destinationMatchingClusterRefs?.length}>
        <ObjectReferenceList refs={object.status?.destinationMatchingClusterRefs} />
      </DrawerItem>

      {clusterInfo.length > 0 ? (
        <>
          <DrawerTitle size="sub-title">Deployment Status</DrawerTitle>
          {clusterInfo.map((info) => (
            <DrawerItem
              key={`${info.clusterRef.namespace}/${info.clusterRef.name}`}
              name={`${info.clusterRef.namespace ?? ""}/${info.clusterRef.name ?? ""}`}
            >
              {[info.status, info.failureMessage].filter(Boolean).join(" · ")}
            </DrawerItem>
          ))}
        </>
      ) : null}
    </>
  );
});
