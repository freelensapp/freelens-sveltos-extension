import { Renderer } from "@freelensapp/extensions";
import * as MobxReact from "mobx-react";
import { Classifier, type ClassifierApi } from "../api/lib/classifier-v1beta1";
import styles from "./sveltos-page.module.scss";

const { observer } = MobxReact;

const {
  Component: { KubeObjectAge, KubeObjectListLayout, WithTooltip },
} = Renderer;

const KubeObject = Classifier;
type KubeObject = Classifier;
type KubeObjectApi = ClassifierApi;

const getVersionConstraints = (object: KubeObject) =>
  (object.spec?.kubernetesVersionConstraints ?? [])
    .map((constraint) => `${constraint.comparison} ${constraint.version}`)
    .join(", ");

const sortingCallbacks = {
  name: (object: KubeObject) => object.getName(),
  labels: (object: KubeObject) => KubeObject.getLabels(object).join(", "),
  versions: getVersionConstraints,
  matching: (object: KubeObject) => KubeObject.getMatchingClusterCount(object),
  age: (object: KubeObject) => object.getCreationTimestamp(),
};

const renderTableHeader: { id: string; title: string; sortBy: keyof typeof sortingCallbacks; className?: string }[] = [
  { id: "name", title: "Name", sortBy: "name" },
  { id: "classifierLabels", title: "Classifier Labels", sortBy: "labels", className: styles.wide },
  { id: "versionConstraints", title: "Version Constraints", sortBy: "versions", className: styles.medium },
  { id: "matchingClusters", title: "Matching Clusters", sortBy: "matching", className: styles.short },
  { id: "age", title: "Age", sortBy: "age", className: styles.age },
];

export interface ClassifiersPageProps {
  extension: Renderer.LensExtension;
}

export const ClassifiersPage = observer((props: ClassifiersPageProps) => {
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
          <WithTooltip>{KubeObject.getLabels(object).join(", ") || "N/A"}</WithTooltip>,
          <WithTooltip>{getVersionConstraints(object) || "N/A"}</WithTooltip>,
          <WithTooltip>{KubeObject.getMatchingClusterCount(object)}</WithTooltip>,
          <KubeObjectAge object={object} key="age" />,
        ]}
      />
    </>
  );
});
