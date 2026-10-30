import { Renderer } from "@freelensapp/extensions";
import * as MobxReact from "mobx-react";
import { ClusterSummary, type ClusterSummaryApi } from "../api/config/cluster-summary-v1beta1";
import { withErrorPage } from "../components/error-page";
import styles from "./sveltos-page.module.scss";
import stylesInline from "./sveltos-page.module.scss?inline";

const { observer } = MobxReact;

const {
  Component: { KubeObjectAge, KubeObjectListLayout, LinkToNamespace, WithTooltip },
} = Renderer;

const KubeObject = ClusterSummary;
type KubeObject = ClusterSummary;
type KubeObjectApi = ClusterSummaryApi;

const sortingCallbacks = {
  name: (object: KubeObject) => object.getName(),
  namespace: (object: KubeObject) => object.getNs(),
  cluster: (object: KubeObject) => object.spec?.clusterName,
  profile: (object: KubeObject) => KubeObject.getProfileName(object),
  helm: (object: KubeObject) => KubeObject.getFeatureStatus(object, "Helm"),
  resources: (object: KubeObject) => KubeObject.getFeatureStatus(object, "Resources"),
  kustomize: (object: KubeObject) => KubeObject.getFeatureStatus(object, "Kustomize"),
  age: (object: KubeObject) => object.getCreationTimestamp(),
};

const renderTableHeader: { id: string; title: string; sortBy: keyof typeof sortingCallbacks; className?: string }[] = [
  { id: "name", title: "Name", sortBy: "name", className: styles.wide },
  { id: "namespace", title: "Namespace", sortBy: "namespace" },
  { id: "cluster", title: "Cluster", sortBy: "cluster", className: styles.medium },
  { id: "profile", title: "Profile", sortBy: "profile", className: styles.medium },
  { id: "helm", title: "Helm", sortBy: "helm", className: styles.medium },
  { id: "resources", title: "Resources", sortBy: "resources", className: styles.medium },
  { id: "kustomize", title: "Kustomize", sortBy: "kustomize", className: styles.medium },
  { id: "age", title: "Age", sortBy: "age", className: styles.age },
];

export interface ClusterSummariesPageProps {
  extension: Renderer.LensExtension;
}

export const ClusterSummariesPage = observer((props: ClusterSummariesPageProps) =>
  withErrorPage(props, () => {
    const store = KubeObject.getStore<KubeObject>();

    return (
      <>
        <style>{stylesInline}</style>
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
            <WithTooltip>{object.spec?.clusterName ?? "N/A"}</WithTooltip>,
            <WithTooltip>{KubeObject.getProfileName(object) ?? "N/A"}</WithTooltip>,
            <WithTooltip>{KubeObject.getFeatureStatus(object, "Helm") ?? "-"}</WithTooltip>,
            <WithTooltip>{KubeObject.getFeatureStatus(object, "Resources") ?? "-"}</WithTooltip>,
            <WithTooltip>{KubeObject.getFeatureStatus(object, "Kustomize") ?? "-"}</WithTooltip>,
            <KubeObjectAge object={object} key="age" />,
          ]}
        />
      </>
    );
  }),
);
