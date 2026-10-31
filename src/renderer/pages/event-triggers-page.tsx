import { Renderer } from "@freelensapp/extensions";
import * as MobxReact from "mobx-react";
import { EventTrigger, type EventTriggerApi } from "../api/lib/event-trigger-v1beta1";
import styles from "./sveltos-page.module.scss";

const { observer } = MobxReact;

const {
  Component: { BadgeBoolean, KubeObjectAge, KubeObjectListLayout, WithTooltip },
} = Renderer;

const KubeObject = EventTrigger;
type KubeObject = EventTrigger;
type KubeObjectApi = EventTriggerApi;

const sortingCallbacks = {
  name: (object: KubeObject) => object.getName(),
  eventSource: (object: KubeObject) => KubeObject.getEventSourceName(object),
  oneForEvent: (object: KubeObject) => String(object.spec?.oneForEvent ?? false),
  syncMode: (object: KubeObject) => object.spec?.syncMode ?? "Continuous",
  matching: (object: KubeObject) => KubeObject.getMatchingClusterCount(object),
  age: (object: KubeObject) => object.getCreationTimestamp(),
};

const renderTableHeader: { id: string; title: string; sortBy: keyof typeof sortingCallbacks; className?: string }[] = [
  { id: "name", title: "Name", sortBy: "name" },
  { id: "eventSource", title: "Event Source", sortBy: "eventSource", className: styles.medium },
  { id: "oneForEvent", title: "One For Event", sortBy: "oneForEvent", className: styles.short },
  { id: "syncMode", title: "Sync Mode", sortBy: "syncMode", className: styles.medium },
  { id: "matchingClusters", title: "Matching Clusters", sortBy: "matching", className: styles.short },
  { id: "age", title: "Age", sortBy: "age", className: styles.age },
];

export interface EventTriggersPageProps {
  extension: Renderer.LensExtension;
}

export const EventTriggersPage = observer((props: EventTriggersPageProps) => {
  const store = KubeObject.getStore<KubeObject>();

  return (
    <>
      <KubeObjectListLayout<KubeObject, KubeObjectApi>
        tableId={`${KubeObject.crd.plural}Table`}
        isConfigurable
        className={styles.page}
        store={store}
        sortingCallbacks={sortingCallbacks}
        searchFilters={[(object: KubeObject) => object.getSearchFields()]}
        renderHeaderTitle={KubeObject.crd.title}
        renderTableHeader={renderTableHeader}
        renderTableContents={(object: KubeObject) => [
          <WithTooltip>{object.getName()}</WithTooltip>,
          <WithTooltip>{KubeObject.getEventSourceName(object) ?? "N/A"}</WithTooltip>,
          <BadgeBoolean value={object.spec?.oneForEvent ?? false} />,
          <WithTooltip>{object.spec?.syncMode ?? "Continuous"}</WithTooltip>,
          <WithTooltip>{KubeObject.getMatchingClusterCount(object)}</WithTooltip>,
          <KubeObjectAge object={object} key="age" />,
        ]}
      />
    </>
  );
});
