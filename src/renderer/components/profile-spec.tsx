import { Renderer } from "@freelensapp/extensions";
import { type ProfileSpec, selectorToString } from "../api/types";
import { ObjectReferenceList } from "./object-reference-list";
import { DependsOnChips, type ProfileKind, RequiredByChips } from "./profile-dependencies";
import { TierBadge } from "./tier-badge";

const {
  Component: { Badge, BadgeBoolean, DrawerItem, DrawerTitle },
} = Renderer;

export interface ProfileSpecDetailsProps {
  spec?: ProfileSpec;
  /** Kind of the profile owning the spec, `dependsOn` names resolve to profiles of this kind. */
  profileKind?: string;
  namespace?: string;
  /** Set on the profile itself to also list the profiles depending on it. */
  profileName?: string;
}

const isProfileKind = (kind: string | undefined): kind is ProfileKind =>
  kind === "ClusterProfile" || kind === "Profile";

/** Renders the add-on configuration shared by ClusterProfile, Profile and ClusterSummary. */
export function ProfileSpecDetails({ spec, profileKind, namespace, profileName }: ProfileSpecDetailsProps) {
  if (!spec) return <></>;

  return (
    <>
      <DrawerTitle>Configuration</DrawerTitle>
      <DrawerItem name="Sync Mode">{spec.syncMode ?? "Continuous"}</DrawerItem>
      <DrawerItem name="Tier">
        <TierBadge tier={spec.tier} />
      </DrawerItem>
      <DrawerItem name="Cluster Selector">{selectorToString(spec.clusterSelector) ?? "N/A"}</DrawerItem>
      <DrawerItem name="Cluster Refs" hidden={!spec.clusterRefs?.length}>
        <ObjectReferenceList refs={spec.clusterRefs} />
      </DrawerItem>
      <DrawerItem name="Set Refs" hidden={!spec.setRefs?.length}>
        {(spec.setRefs ?? []).join(", ")}
      </DrawerItem>
      <DrawerItem name="Depends On" hidden={!spec.dependsOn?.length}>
        {isProfileKind(profileKind) ? (
          <DependsOnChips names={spec.dependsOn ?? []} kind={profileKind} namespace={namespace} />
        ) : (
          (spec.dependsOn ?? []).map((name) => <Badge key={name} label={name} />)
        )}
      </DrawerItem>
      {profileName && isProfileKind(profileKind) ? (
        <DrawerItem name="Required By">
          <RequiredByChips name={profileName} kind={profileKind} namespace={namespace} />
        </DrawerItem>
      ) : null}
      <DrawerItem name="Stop Matching Behavior">{spec.stopMatchingBehavior ?? "WithdrawPolicies"}</DrawerItem>
      <DrawerItem name="Max Update" hidden={spec.maxUpdate === undefined}>
        {String(spec.maxUpdate)}
      </DrawerItem>
      <DrawerItem name="Continue On Conflict">
        <BadgeBoolean value={spec.continueOnConflict ?? false} />
      </DrawerItem>
      <DrawerItem name="Continue On Error">
        <BadgeBoolean value={spec.continueOnError ?? false} />
      </DrawerItem>
      <DrawerItem name="Reloader">
        <BadgeBoolean value={spec.reloader ?? false} />
      </DrawerItem>

      {spec.helmCharts?.length ? (
        <>
          <DrawerTitle size="sub-title">Helm Charts</DrawerTitle>
          {spec.helmCharts.map((chart) => (
            <DrawerItem key={`${chart.releaseNamespace}/${chart.releaseName}`} name={chart.releaseName}>
              {[chart.chartName ?? chart.repositoryURL, chart.chartVersion, `ns: ${chart.releaseNamespace}`]
                .filter(Boolean)
                .join(" · ")}
            </DrawerItem>
          ))}
        </>
      ) : null}

      {spec.policyRefs?.length ? (
        <>
          <DrawerTitle size="sub-title">Policy Refs</DrawerTitle>
          {spec.policyRefs.map((ref, index) => (
            <DrawerItem key={`${ref.kind}-${ref.namespace}-${ref.name}-${index}`} name={ref.kind ?? "Ref"}>
              {[ref.namespace ? `${ref.namespace}/${ref.name}` : ref.name, ref.path, ref.deploymentType]
                .filter(Boolean)
                .join(" · ")}
            </DrawerItem>
          ))}
        </>
      ) : null}

      {spec.kustomizationRefs?.length ? (
        <>
          <DrawerTitle size="sub-title">Kustomization Refs</DrawerTitle>
          {spec.kustomizationRefs.map((ref, index) => (
            <DrawerItem key={`${ref.kind}-${ref.namespace}-${ref.name}-${index}`} name={ref.kind ?? "Ref"}>
              {[
                ref.namespace ? `${ref.namespace}/${ref.name}` : ref.name,
                ref.path,
                ref.targetNamespace,
                ref.deploymentType,
              ]
                .filter(Boolean)
                .join(" · ")}
            </DrawerItem>
          ))}
        </>
      ) : null}

      {spec.templateResourceRefs?.length ? (
        <>
          <DrawerTitle size="sub-title">Template Resource Refs</DrawerTitle>
          {spec.templateResourceRefs.map((ref) => (
            <DrawerItem key={ref.identifier} name={ref.identifier}>
              {[
                ref.resource.kind,
                ref.resource.namespace ? `${ref.resource.namespace}/${ref.resource.name}` : ref.resource.name,
              ]
                .filter(Boolean)
                .join(" · ")}
            </DrawerItem>
          ))}
        </>
      ) : null}
    </>
  );
}
