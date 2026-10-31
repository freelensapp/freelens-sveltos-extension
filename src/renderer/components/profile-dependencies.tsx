import { Renderer } from "@freelensapp/extensions";
import * as MobxReact from "mobx-react";
import React from "react";
import { maybe } from "../../common/utils";
import { ClusterProfile } from "../api/config/cluster-profile-v1beta1";
import { Profile } from "../api/config/profile-v1beta1";
import { getDependents, profileHealth } from "../api/dependency-graph";
import styles from "./dashboard.module.scss";
import { healthClasses, healthLabels, toDependencyInputs } from "./dependency-graph";

const { observer } = MobxReact;

const {
  Component: { Icon },
  Navigation: { showDetails },
} = Renderer;

export type ProfileKind = "ClusterProfile" | "Profile";

/** `dependsOn` only links profiles of the same kind, a Profile only within its namespace. */
function useProfiles(kind: ProfileKind, namespace: string | undefined) {
  const store = maybe(() =>
    kind === "ClusterProfile" ? ClusterProfile.getStore<ClusterProfile>() : Profile.getStore<Profile>(),
  );

  // The drawer can open on its own, without the list page that loads the store.
  React.useEffect(() => {
    if (store && !store.isLoaded && !store.isLoading) void store.loadAll();
  }, [store]);

  return (store?.items ?? []).filter((profile) => kind === "ClusterProfile" || profile.getNs() === namespace);
}

function ProfileChip({ profile, name }: { profile?: ClusterProfile | Profile; name: string }) {
  if (!profile) {
    return (
      <span
        className={`${styles.chip} ${styles.dependencyChip} ${styles.dependencyChipMissing}`}
        title="No profile with this name exists, Sveltos keeps the dependent profile blocked"
      >
        <Icon material="link_off" small />
        {name}
      </span>
    );
  }

  const health = profileHealth(profile.status);
  const matching = profile.status?.matchingClusters?.length ?? 0;

  return (
    <button
      type="button"
      className={`${styles.chip} ${styles.chipButton} ${styles.dependencyChip}`}
      title={`${healthLabels[health]} · ${matching} matching cluster${matching === 1 ? "" : "s"}\nOpen details`}
      onClick={() => showDetails(profile.selfLink)}
    >
      <span className={`${styles.healthDot} ${healthClasses[health]}`} />
      {name}
    </button>
  );
}

export interface DependsOnChipsProps {
  names: string[];
  kind: ProfileKind;
  namespace?: string;
}

export const DependsOnChips = observer(({ names, kind, namespace }: DependsOnChipsProps) => {
  const profiles = useProfiles(kind, namespace);

  return (
    <div className={styles.dependencyChips}>
      {names.map((name) => (
        <ProfileChip key={name} name={name} profile={profiles.find((profile) => profile.getName() === name)} />
      ))}
    </div>
  );
});

export interface RequiredByChipsProps {
  name: string;
  kind: ProfileKind;
  namespace?: string;
}

/** The reverse of `dependsOn`: profiles that wait for this one before deploying. */
export const RequiredByChips = observer(({ name, kind, namespace }: RequiredByChipsProps) => {
  const profiles = useProfiles(kind, namespace);
  const dependents = getDependents(toDependencyInputs(profiles), name, kind === "Profile" ? namespace : undefined);

  if (dependents.length === 0) return <>None</>;

  return (
    <div className={styles.dependencyChips}>
      {dependents.map((dependent) => (
        <ProfileChip
          key={dependent.name}
          name={dependent.name}
          profile={profiles.find((profile) => profile.getName() === dependent.name)}
        />
      ))}
    </div>
  );
});

/** Compact form for list rows, the drawer shows the full chips with their status. */
export function DependsOnSummary({ names }: { names?: string[] }) {
  if (!names?.length) return <>-</>;

  return (
    <span className={styles.dependsOnSummary} title={`Deployed after: ${names.join(", ")}`}>
      <Icon material="call_merge" small />
      <span className={styles.cellText}>{names.join(", ")}</span>
    </span>
  );
}
