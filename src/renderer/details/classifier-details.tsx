import { Renderer } from "@freelensapp/extensions";
import * as MobxReact from "mobx-react";
import { withErrorPage } from "../components/error-page";

import type { Classifier } from "../api/lib/classifier-v1beta1";

const { observer } = MobxReact;

const {
  Component: { Badge, DrawerItem, DrawerTitle },
} = Renderer;

export interface ClassifierDetailsProps extends Renderer.Component.KubeObjectDetailsProps<Classifier> {
  extension: Renderer.LensExtension;
}

export const ClassifierDetails = observer((props: ClassifierDetailsProps) =>
  withErrorPage(props, () => {
    const { object } = props;
    const classifierLabels = object.spec?.classifierLabels ?? [];
    const versionConstraints = object.spec?.kubernetesVersionConstraints ?? [];
    const resourceSelectors = object.spec?.deployedResourceConstraint?.resourceSelectors ?? [];
    const matchingClusters = object.status?.machingClusterStatuses ?? [];

    return (
      <>
        <DrawerTitle>Classifier Labels</DrawerTitle>
        <DrawerItem name="Labels" labelsOnly>
          {classifierLabels.map((label) => (
            <Badge key={label.key} label={`${label.key}=${label.value}`} />
          ))}
        </DrawerItem>

        {versionConstraints.length > 0 ? (
          <>
            <DrawerTitle>Kubernetes Version Constraints</DrawerTitle>
            {versionConstraints.map((constraint) => (
              <DrawerItem key={`${constraint.comparison}-${constraint.version}`} name={constraint.comparison}>
                {constraint.version}
              </DrawerItem>
            ))}
          </>
        ) : null}

        {resourceSelectors.length > 0 ? (
          <>
            <DrawerTitle>Deployed Resource Constraint</DrawerTitle>
            {resourceSelectors.map((selector, index) => (
              <DrawerItem key={`${selector.group}-${selector.kind}-${index}`} name={selector.kind}>
                {[
                  [selector.group, selector.version].filter(Boolean).join("/"),
                  selector.namespace,
                  selector.name,
                  (selector.labelFilters ?? [])
                    .map((filter) => `${filter.key} ${filter.operation} ${filter.value ?? ""}`.trim())
                    .join(", "),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </DrawerItem>
            ))}
          </>
        ) : null}

        <DrawerTitle>Matching Clusters</DrawerTitle>
        {matchingClusters.length === 0 ? <DrawerItem name="Matching Clusters">None</DrawerItem> : null}
        {matchingClusters.map((status) => (
          <DrawerItem
            key={`${status.clusterRef.namespace}/${status.clusterRef.name}`}
            name={`${status.clusterRef.namespace ?? ""}/${status.clusterRef.name ?? ""}`}
          >
            {(status.managedLabels ?? []).join(", ") || "no managed labels"}
          </DrawerItem>
        ))}
      </>
    );
  }),
);
