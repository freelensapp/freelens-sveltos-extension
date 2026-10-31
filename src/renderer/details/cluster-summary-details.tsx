import { Renderer } from "@freelensapp/extensions";
import * as MobxReact from "mobx-react";
import { ClusterSummary } from "../api/config/cluster-summary-v1beta1";
import { ProfileSpecDetails } from "../components/profile-spec";

const { observer } = MobxReact;

const {
  Component: { DrawerItem, DrawerTitle },
} = Renderer;

export interface ClusterSummaryDetailsProps extends Renderer.Component.KubeObjectDetailsProps<ClusterSummary> {}

export const ClusterSummaryDetails = observer((props: ClusterSummaryDetailsProps) => {
  const { object } = props;
  const featureSummaries = object.status?.featureSummaries ?? [];
  const helmReleaseSummaries = object.status?.helmReleaseSummaries ?? [];
  const deployedGVKs = object.status?.deployedGVKs ?? [];

  return (
    <>
      <DrawerTitle>Cluster</DrawerTitle>
      <DrawerItem name="Cluster">
        {`${object.spec?.clusterNamespace ?? ""}/${object.spec?.clusterName ?? ""}`}
      </DrawerItem>
      <DrawerItem name="Cluster Type">{object.spec?.clusterType ?? "N/A"}</DrawerItem>
      <DrawerItem name="Dependencies" hidden={!object.status?.dependencies}>
        {object.status?.dependencies}
      </DrawerItem>
      <DrawerItem name="Failure Message" hidden={!object.status?.failureMessage}>
        {object.status?.failureMessage}
      </DrawerItem>

      <DrawerTitle>Features</DrawerTitle>
      {featureSummaries.length === 0 ? <DrawerItem name="Features">N/A</DrawerItem> : null}
      {featureSummaries.map((summary) => (
        <DrawerItem key={summary.featureID} name={summary.featureID}>
          {[summary.status, summary.failureMessage, summary.lastAppliedTime].filter(Boolean).join(" · ")}
        </DrawerItem>
      ))}

      {helmReleaseSummaries.length > 0 ? (
        <>
          <DrawerTitle>Helm Releases</DrawerTitle>
          {helmReleaseSummaries.map((release) => (
            <DrawerItem
              key={`${release.releaseNamespace}/${release.releaseName}`}
              name={`${release.releaseNamespace}/${release.releaseName}`}
            >
              {[
                release.chartName,
                release.chartVersion,
                release.status,
                release.latestVersion ? `latest: ${release.latestVersion}` : undefined,
                release.conflictMessage,
                release.failureMessage,
              ]
                .filter(Boolean)
                .join(" · ")}
            </DrawerItem>
          ))}
        </>
      ) : null}

      {deployedGVKs.length > 0 ? (
        <>
          <DrawerTitle>Deployed Resources</DrawerTitle>
          {deployedGVKs.map((info) => (
            <DrawerItem key={info.featureID} name={info.featureID}>
              {(info.deployedGroupVersionKind ?? []).join(", ")}
            </DrawerItem>
          ))}
        </>
      ) : null}

      <ProfileSpecDetails
        spec={object.spec?.clusterProfileSpec}
        profileKind={ClusterSummary.getProfileRef(object)?.kind}
        namespace={object.getNs()}
      />
    </>
  );
});
