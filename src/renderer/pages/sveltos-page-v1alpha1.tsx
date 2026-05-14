import { Renderer } from "@freelensapp/extensions";
import { withErrorPage } from "../components/error-page";
import { Sveltos, type SveltosApi } from "../k8s/sveltos/sveltos-v1alpha1";
import { observer } from "../utils/mobx";
import styles from "./sveltos-page.module.scss";
import stylesInline from "./sveltos-page.module.scss?inline";

const {
  Component: { BadgeBoolean, KubeObjectAge, KubeObjectListLayout, LinkToNamespace, WithTooltip },
} = Renderer;

const KubeObject = Sveltos;
type KubeObject = Sveltos;
type KubeObjectApi = SveltosApi;

const sortingCallbacks = {
  name: (object: KubeObject) => object.getName(),
  namespace: (object: KubeObject) => object.getNs(),
  active: (object: KubeObject) => String(KubeObject.getActive(object)),
  title: (object: KubeObject) => KubeObject.getTitle(object),
  age: (object: KubeObject) => object.getCreationTimestamp(),
};

const renderTableHeader: { title: string; sortBy: keyof typeof sortingCallbacks; className?: string }[] = [
  { title: "Name", sortBy: "name" },
  { title: "Namespace", sortBy: "namespace" },
  { title: "Active", sortBy: "active", className: styles.active },
  { title: "Title", sortBy: "title", className: styles.title },
  { title: "Age", sortBy: "age", className: styles.age },
];

export interface SveltosPageProps {
  extension: Renderer.LensExtension;
}

export const SveltosPage = observer((props: SveltosPageProps) =>
  withErrorPage(props, () => {
    const store = KubeObject.getStore<KubeObject>();

    return (
      <>
        <style>{stylesInline}</style>
        <KubeObjectListLayout<KubeObject, KubeObjectApi>
          tableId={`${KubeObject.crd.plural}Table`}
          className={styles.page}
          store={store}
          sortingCallbacks={sortingCallbacks}
          searchFilters={[(object: KubeObject) => object.getSearchFields()]}
          renderHeaderTitle={KubeObject.crd.title}
          renderTableHeader={renderTableHeader}
          renderTableContents={(object: KubeObject) => [
            <WithTooltip>{object.getName()}</WithTooltip>,
            <LinkToNamespace namespace={object.getNs()} />,
            <BadgeBoolean value={KubeObject.getActive(object)} />,
            <WithTooltip>{KubeObject.getTitle(object) ?? "N/A"}</WithTooltip>,
            <KubeObjectAge object={object} key="age" />,
          ]}
        />
      </>
    );
  }),
);
