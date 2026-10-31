import { Renderer } from "@freelensapp/extensions";
import * as MobxReact from "mobx-react";
import React from "react";
import { maybe } from "../../common/utils";
import { ClusterProfile } from "../api/config/cluster-profile-v1beta1";
import { Profile } from "../api/config/profile-v1beta1";
import { subscribeToStores } from "../api/subscribe-stores";
import styles from "../components/dashboard.module.scss";
import stylesInline from "../components/dashboard.module.scss?inline";
import { DependencyGraphView, toDependencyInputs } from "../components/dependency-graph";
import { withErrorPage } from "../components/error-page";

const { observer } = MobxReact;

export interface ProfileDependenciesPageProps {
  extension: Renderer.LensExtension;
}

export const ProfileDependenciesPage = observer((props: ProfileDependenciesPageProps) =>
  withErrorPage(props, () => {
    const clusterProfileStore = maybe(() => ClusterProfile.getStore<ClusterProfile>());
    const profileStore = maybe(() => Profile.getStore<Profile>());

    React.useEffect(
      () => subscribeToStores([clusterProfileStore, profileStore].filter((store) => store !== null)),
      [clusterProfileStore, profileStore],
    );

    return (
      <>
        <style>{stylesInline}</style>
        <div className={styles.page}>
          <DependencyGraphView
            title="Cluster Profiles"
            profiles={toDependencyInputs(clusterProfileStore?.items ?? [])}
          />
          <DependencyGraphView title="Profiles" profiles={toDependencyInputs(profileStore?.items ?? [])} />
        </div>
      </>
    );
  }),
);
