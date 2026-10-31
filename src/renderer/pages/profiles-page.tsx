import { Renderer } from "@freelensapp/extensions";
import * as MobxReact from "mobx-react";
import { Profile, type ProfileApi } from "../api/config/profile-v1beta1";
import { selectorToString } from "../api/types";
import { DependsOnSummary } from "../components/profile-dependencies";
import { TierBadge } from "../components/tier-badge";
import styles from "./sveltos-page.module.scss";

const { observer } = MobxReact;

const {
  Component: { KubeObjectAge, KubeObjectListLayout, LinkToNamespace, WithTooltip },
} = Renderer;

const KubeObject = Profile;
type KubeObject = Profile;
type KubeObjectApi = ProfileApi;

const sortingCallbacks = {
  name: (object: KubeObject) => object.getName(),
  namespace: (object: KubeObject) => object.getNs(),
  syncMode: (object: KubeObject) => object.spec?.syncMode ?? "Continuous",
  tier: (object: KubeObject) => object.spec?.tier ?? 100,
  dependsOn: (object: KubeObject) => (object.spec?.dependsOn ?? []).join(","),
  matching: (object: KubeObject) => (object.status?.matchingClusters ?? []).length,
  age: (object: KubeObject) => object.getCreationTimestamp(),
};

const renderTableHeader: { id: string; title: string; sortBy: keyof typeof sortingCallbacks; className?: string }[] = [
  { id: "name", title: "Name", sortBy: "name" },
  { id: "namespace", title: "Namespace", sortBy: "namespace" },
  { id: "syncMode", title: "Sync Mode", sortBy: "syncMode", className: styles.medium },
  { id: "tier", title: "Tier", sortBy: "tier", className: styles.short },
  { id: "dependsOn", title: "Depends On", sortBy: "dependsOn", className: styles.medium },
  { id: "clusterSelector", title: "Cluster Selector", sortBy: "name", className: styles.wide },
  { id: "matchingClusters", title: "Matching Clusters", sortBy: "matching", className: styles.short },
  { id: "age", title: "Age", sortBy: "age", className: styles.age },
];

export interface ProfilesPageProps {
  extension: Renderer.LensExtension;
}

export const ProfilesPage = observer((props: ProfilesPageProps) => {
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
          <LinkToNamespace namespace={object.getNs()} />,
          <WithTooltip>{object.spec?.syncMode ?? "Continuous"}</WithTooltip>,
          <TierBadge tier={object.spec?.tier} />,
          <DependsOnSummary names={object.spec?.dependsOn} />,
          <WithTooltip>{selectorToString(object.spec?.clusterSelector) ?? "N/A"}</WithTooltip>,
          <WithTooltip>{(object.status?.matchingClusters ?? []).length}</WithTooltip>,
          <KubeObjectAge object={object} key="age" />,
        ]}
      />
    </>
  );
});
