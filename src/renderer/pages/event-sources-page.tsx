import { Renderer } from "@freelensapp/extensions";
import * as MobxReact from "mobx-react";
import { EventSource, type EventSourceApi } from "../api/lib/event-source-v1beta1";
import styles from "./sveltos-page.module.scss";

const { observer } = MobxReact;

const {
  Component: { BadgeBoolean, KubeObjectAge, KubeObjectListLayout, WithTooltip },
} = Renderer;

const KubeObject = EventSource;
type KubeObject = EventSource;
type KubeObjectApi = EventSourceApi;

const sortingCallbacks = {
  name: (object: KubeObject) => object.getName(),
  resources: (object: KubeObject) => KubeObject.getWatchedKinds(object).join(", "),
  collect: (object: KubeObject) => String(KubeObject.getCollectResources(object)),
  age: (object: KubeObject) => object.getCreationTimestamp(),
};

const renderTableHeader: { id: string; title: string; sortBy: keyof typeof sortingCallbacks; className?: string }[] = [
  { id: "name", title: "Name", sortBy: "name" },
  { id: "watchedResources", title: "Watched Resources", sortBy: "resources", className: styles.wide },
  { id: "collectResources", title: "Collect Resources", sortBy: "collect", className: styles.short },
  { id: "age", title: "Age", sortBy: "age", className: styles.age },
];

export interface EventSourcesPageProps {
  extension: Renderer.LensExtension;
}

export const EventSourcesPage = observer((props: EventSourcesPageProps) => {
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
          <WithTooltip>{KubeObject.getWatchedKinds(object).join(", ") || "N/A"}</WithTooltip>,
          <BadgeBoolean value={KubeObject.getCollectResources(object)} />,
          <KubeObjectAge object={object} key="age" />,
        ]}
      />
    </>
  );
});
