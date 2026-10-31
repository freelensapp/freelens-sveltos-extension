import { Renderer } from "@freelensapp/extensions";
import * as MobxReact from "mobx-react";
import React from "react";
import { maybe } from "../../common/utils";
import { ClusterSummary } from "../api/config/cluster-summary-v1beta1";
import { filterErrorsByProfile, getDeployErrors, getFailedClusterErrors } from "../api/deploy-errors";
import { subscribeToStores } from "../api/subscribe-stores";
import { LastUpdate } from "../components/last-update";
import { ObjectReferenceList } from "../components/object-reference-list";
import { ProfileSpecDetails } from "../components/profile-spec";

import type { ProfileSpec, ProfileStatus } from "../api/types";

const { observer } = MobxReact;

const {
  Component: { DrawerItem, DrawerTitle, Icon },
} = Renderer;

type ProfileLike = Renderer.K8sApi.KubeObject<Renderer.K8sApi.KubeObjectMetadata, ProfileStatus, ProfileSpec>;

export interface ProfileDetailsProps extends Renderer.Component.KubeObjectDetailsProps<ProfileLike> {}

/** Details shared by `ClusterProfile` and `Profile`, which use the same spec and status. */
export const ProfileDetails = observer((props: ProfileDetailsProps) => {
  const { object } = props;
  const summaryStore = maybe(() => ClusterSummary.getStore<ClusterSummary>());

  React.useEffect(() => subscribeToStores(summaryStore ? [summaryStore] : []), [summaryStore]);

  const summaries = (summaryStore?.items ?? []).filter((summary) => {
    const profile = ClusterSummary.getProfileRef(summary);

    return profile?.kind === object.kind && profile.name === object.getName();
  });
  const deployErrors = [
    ...getFailedClusterErrors(object.status, object.getName()),
    ...filterErrorsByProfile(getDeployErrors(summaryStore?.items ?? []), object.kind, object.getName()),
  ];
  const appliedTimes = summaries.flatMap((summary) =>
    (summary.status?.featureSummaries ?? []).map((feature) => feature.lastAppliedTime).filter(Boolean),
  ) as string[];

  return (
    <>
      <DrawerTitle>Rollout</DrawerTitle>
      <DrawerItem name="Last Applied">
        <LastUpdate timestamp={appliedTimes.sort().at(-1)} placeholder="Never" />
      </DrawerItem>
      <DrawerItem name="Matching Clusters">
        <ObjectReferenceList refs={object.status?.matchingClusters} />
      </DrawerItem>
      <DrawerItem name="Updated Clusters">
        <ObjectReferenceList refs={object.status?.updatedClusters?.clusters} />
      </DrawerItem>
      <DrawerItem name="Updating Clusters" hidden={!object.status?.updatingClusters?.clusters?.length}>
        <ObjectReferenceList refs={object.status?.updatingClusters?.clusters} />
      </DrawerItem>

      {summaries.length > 0 ? (
        <>
          <DrawerTitle size="sub-title">Per Cluster</DrawerTitle>
          {summaries.map((summary) => (
            <DrawerItem
              key={summary.metadata.name}
              name={`${summary.spec?.clusterNamespace ?? ""}/${summary.spec?.clusterName ?? ""}`}
            >
              {ClusterSummary.getOverallStatus(summary) ?? "Unknown"}
              {" · "}
              <LastUpdate
                timestamp={
                  (summary.status?.featureSummaries ?? [])
                    .map((feature) => feature.lastAppliedTime)
                    .filter(Boolean)
                    .sort()
                    .at(-1) as string | undefined
                }
                placeholder="never applied"
              />
            </DrawerItem>
          ))}
        </>
      ) : null}

      <DrawerTitle>Deployment Errors</DrawerTitle>
      {deployErrors.length === 0 ? (
        <DrawerItem name="Errors">None</DrawerItem>
      ) : (
        deployErrors.map((error) => (
          <DrawerItem
            key={error.id}
            name={
              <>
                <Icon material="error" small />
                {` ${error.clusterNamespace}/${error.clusterName} · ${error.feature}`}
              </>
            }
          >
            {[error.resource, error.reason, error.message].filter(Boolean).join(" · ")}
          </DrawerItem>
        ))
      )}

      <ProfileSpecDetails
        spec={object.spec}
        profileKind={object.kind}
        namespace={object.getNs()}
        profileName={object.getName()}
      />
    </>
  );
});
