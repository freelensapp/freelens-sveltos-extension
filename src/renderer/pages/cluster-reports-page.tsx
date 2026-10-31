import { Renderer } from "@freelensapp/extensions";
import * as MobxReact from "mobx-react";
import { ClusterReport, type ClusterReportApi } from "../api/config/cluster-report-v1beta1";
import { withErrorPage } from "../components/error-page";
import styles from "./sveltos-page.module.scss";
import stylesInline from "./sveltos-page.module.scss?inline";

const { observer } = MobxReact;

const {
  Component: { KubeObjectAge, KubeObjectListLayout, LinkToNamespace, WithTooltip },
} = Renderer;

const KubeObject = ClusterReport;
type KubeObject = ClusterReport;
type KubeObjectApi = ClusterReportApi;

const sortingCallbacks = {
  name: (object: KubeObject) => object.getName(),
  namespace: (object: KubeObject) => object.getNs(),
  cluster: (object: KubeObject) => object.spec?.clusterName,
  releases: (object: KubeObject) => (object.status?.releaseReports ?? []).length,
  resources: (object: KubeObject) => KubeObject.getAllResourceReports(object).length,
  age: (object: KubeObject) => object.getCreationTimestamp(),
};

const renderTableHeader: { id: string; title: string; sortBy: keyof typeof sortingCallbacks; className?: string }[] = [
  { id: "name", title: "Name", sortBy: "name", className: styles.wide },
  { id: "namespace", title: "Namespace", sortBy: "namespace" },
  { id: "cluster", title: "Cluster", sortBy: "cluster", className: styles.medium },
  { id: "helmChanges", title: "Helm Changes", sortBy: "releases", className: styles.short },
  { id: "resourceChanges", title: "Resource Changes", sortBy: "resources", className: styles.short },
  { id: "age", title: "Age", sortBy: "age", className: styles.age },
];

export interface ClusterReportsPageProps {
  extension: Renderer.LensExtension;
}

export const ClusterReportsPage = observer((props: ClusterReportsPageProps) =>
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
            <WithTooltip>{(object.status?.releaseReports ?? []).length}</WithTooltip>,
            <WithTooltip>{KubeObject.getAllResourceReports(object).length}</WithTooltip>,
            <KubeObjectAge object={object} key="age" />,
          ]}
        />
      </>
    );
  }),
);
