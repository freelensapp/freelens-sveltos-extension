import { Common, Renderer } from "@freelensapp/extensions";
import * as MobxReact from "mobx-react";
import React from "react";
import { maybe } from "../../common/utils";
import { isUpdateAvailable } from "../../common/version";
import { clusterKey, getAddons } from "../api/addons";
import { ClusterProfile } from "../api/config/cluster-profile-v1beta1";
import { ClusterReport } from "../api/config/cluster-report-v1beta1";
import { ClusterSummary } from "../api/config/cluster-summary-v1beta1";
import { Profile } from "../api/config/profile-v1beta1";
import { Classifier } from "../api/lib/classifier-v1beta1";
import { EventSource } from "../api/lib/event-source-v1beta1";
import { SveltosCluster } from "../api/lib/sveltos-cluster-v1beta1";
import { subscribeToStores } from "../api/subscribe-stores";
import { getSveltosComponents, getSveltosVersion, type SveltosComponent } from "../api/sveltos-version";
import { EventTrigger } from "../api/utils/event-trigger-v1beta1";
import styles from "./overview-page.module.scss";

const { observer } = MobxReact;

const {
  Component: { Badge, Button, Icon },
  K8sApi: { deploymentApi },
} = Renderer;

/** Namespace the Sveltos manifests and Helm chart install the controllers into. */
const sveltosNamespace = "projectsveltos";

/** Falls back to a cluster wide list because Sveltos can be installed elsewhere. */
async function listSveltosComponents(): Promise<SveltosComponent[]> {
  const scoped = getSveltosComponents((await deploymentApi.list({ namespace: sveltosNamespace })) ?? []);

  if (scoped.length > 0) return scoped;

  return getSveltosComponents((await deploymentApi.list()) ?? []);
}

type KubeObjectClass = typeof Renderer.K8sApi.LensExtensionKubeObject<any, any, any>;

/** Returns the store only when the CRD is installed in the current cluster. */
const tryGetStore = (kubeObjectClass: KubeObjectClass) => maybe(() => kubeObjectClass.getStore());

const trackedClasses: KubeObjectClass[] = [
  SveltosCluster,
  ClusterProfile,
  Profile,
  ClusterSummary,
  ClusterReport,
  EventSource,
  EventTrigger,
  Classifier,
];

export interface OverviewPageProps {
  extension: Renderer.LensExtension;
  getLatestRelease?: (force?: boolean) => Promise<string | undefined>;
}

export const OverviewPage = observer((props: OverviewPageProps) => {
  const [components, setComponents] = React.useState<SveltosComponent[]>([]);
  const [componentsError, setComponentsError] = React.useState<string | undefined>();
  const [latestRelease, setLatestRelease] = React.useState<string | undefined>();
  const [updateCheckError, setUpdateCheckError] = React.useState<string | undefined>();
  const [checking, setChecking] = React.useState(false);

  React.useEffect(() => {
    const stores = trackedClasses
      .map((kubeObjectClass) => tryGetStore(kubeObjectClass))
      .filter((store) => store !== null);

    return subscribeToStores(stores);
  }, []);

  React.useEffect(() => {
    listSveltosComponents()
      .then((found) => {
        setComponents(found);
        setComponentsError(undefined);
      })
      .catch((error) => {
        Common.logger.warn(`[@freelensapp/sveltos-extension]: cannot list Sveltos controllers: ${error}`);
        setComponents([]);
        setComponentsError(String(error));
      });
  }, []);

  // The request runs in the main process, the renderer network stack cannot reach the internet.
  const runUpdateCheck = React.useCallback(
    async (force: boolean) => {
      const getLatestRelease = props.getLatestRelease;

      if (!getLatestRelease) return;

      setChecking(true);

      try {
        setLatestRelease(await getLatestRelease(force));
        setUpdateCheckError(undefined);
      } catch (error) {
        Common.logger.warn(`[@freelensapp/sveltos-extension]: update check failed: ${error}`);
        setLatestRelease(undefined);
        setUpdateCheckError(String(error));
      } finally {
        setChecking(false);
      }
    },
    [props.getLatestRelease],
  );

  React.useEffect(() => {
    void runUpdateCheck(false);
  }, [runUpdateCheck]);

  const installedVersion = getSveltosVersion(components);
  const updateAvailable = isUpdateAvailable(installedVersion, latestRelease);

  const sveltosClusters = tryGetStore(SveltosCluster)?.items ?? [];
  const clusterSummaries = tryGetStore(ClusterSummary)?.items ?? [];
  const readyClusters = (sveltosClusters as SveltosCluster[]).filter((cluster) =>
    SveltosCluster.getReady(cluster),
  ).length;
  const failedSummaries = (clusterSummaries as ClusterSummary[]).filter((summary) => {
    const status = ClusterSummary.getOverallStatus(summary);
    return status === "Failed" || status === "FailedNonRetriable";
  }).length;
  const knownClusters = new Set(
    (sveltosClusters as SveltosCluster[]).map((cluster) => clusterKey(cluster.getNs(), cluster.getName())),
  );
  const checkedCharts = getAddons(clusterSummaries as ClusterSummary[], [], knownClusters).filter(
    (addon) => addon.updateAvailable !== undefined,
  );
  const outdatedCharts = checkedCharts.filter((addon) => addon.updateAvailable).length;

  const cards = [
    {
      title: "Sveltos Clusters",
      value: sveltosClusters.length,
      hint: `${readyClusters} ready`,
    },
    {
      title: "Cluster Profiles",
      value: tryGetStore(ClusterProfile)?.items.length ?? 0,
    },
    {
      title: "Profiles",
      value: tryGetStore(Profile)?.items.length ?? 0,
    },
    {
      title: "Add-ons",
      value: clusterSummaries.length,
      hint: failedSummaries > 0 ? `${failedSummaries} failing` : "all healthy",
    },
    {
      title: "Add-ons Up to Date",
      value:
        checkedCharts.length > 0
          ? `${Math.floor(((checkedCharts.length - outdatedCharts) / checkedCharts.length) * 100)}%`
          : "-",
      hint:
        checkedCharts.length > 0
          ? `${outdatedCharts} of ${checkedCharts.length} Helm charts outdated`
          : "No Helm chart checked yet",
    },
    {
      title: "Dry Run Reports",
      value: tryGetStore(ClusterReport)?.items.length ?? 0,
    },
    {
      title: "Event Sources",
      value: tryGetStore(EventSource)?.items.length ?? 0,
    },
    {
      title: "Event Triggers",
      value: tryGetStore(EventTrigger)?.items.length ?? 0,
    },
    {
      title: "Classifiers",
      value: tryGetStore(Classifier)?.items.length ?? 0,
    },
  ];

  return (
    <>
      <div className={styles.overview}>
        <h2>Sveltos Overview</h2>

        <div className={`${styles.version} ${updateAvailable ? styles.versionOutdated : ""}`}>
          <Icon material={updateAvailable ? "system_update_alt" : "verified_user"} big className={styles.versionIcon} />
          <div className={styles.versionBody}>
            <div className={styles.versionTitle}>
              Sveltos {installedVersion ?? "version unknown"}
              {updateAvailable ? <Badge small label={`${latestRelease} available`} /> : null}
            </div>
            <div className={styles.cardHint}>
              {components.length > 0
                ? `${components.length} controller${components.length === 1 ? "" : "s"} in ${components[0].namespace}`
                : (componentsError ??
                  `No deployment using a projectsveltos image found (looked in ${sveltosNamespace} and cluster wide)`)}
            </div>
            <div className={styles.cardHint}>
              {latestRelease
                ? `Latest release: ${latestRelease}${updateAvailable ? "" : " · up to date"}`
                : checking
                  ? "Checking for updates..."
                  : updateCheckError
                    ? `Update check failed: ${updateCheckError}`
                    : "Update status unknown"}
            </div>
            {components.length > 0 ? (
              <div className={styles.versionComponents}>
                {components.map((component) => (
                  <Badge key={component.name} small label={`${component.name}: ${component.version ?? "?"}`} />
                ))}
              </div>
            ) : null}
          </div>
          <Button
            plain
            outlined
            waiting={checking}
            label="Check for updates"
            onClick={() => void runUpdateCheck(true)}
          />
        </div>

        <div className={styles.cards}>
          {cards.map((card) => (
            <div className={styles.card} key={card.title}>
              <div className={styles.cardTitle}>{card.title}</div>
              <div className={styles.cardValue}>{card.value}</div>
              {card.hint ? <div className={styles.cardHint}>{card.hint}</div> : null}
            </div>
          ))}
        </div>
      </div>
    </>
  );
});
