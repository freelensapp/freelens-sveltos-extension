import { Common, Renderer } from "@freelensapp/extensions";
import * as MobxReact from "mobx-react";
import React from "react";
import { maybe } from "../../common/utils";
import { isUpdateAvailable } from "../../common/version";
import { clusterKey, getAddons } from "../api/addons";
import { getShard } from "../api/clusters";
import { ClusterProfile } from "../api/config/cluster-profile-v1beta1";
import { ClusterReport } from "../api/config/cluster-report-v1beta1";
import { ClusterSummary } from "../api/config/cluster-summary-v1beta1";
import { Profile } from "../api/config/profile-v1beta1";
import { Classifier } from "../api/lib/classifier-v1beta1";
import { EventSource } from "../api/lib/event-source-v1beta1";
import { EventTrigger } from "../api/lib/event-trigger-v1beta1";
import { SveltosCluster } from "../api/lib/sveltos-cluster-v1beta1";
import { subscribeToStores } from "../api/subscribe-stores";
import {
  baseName,
  getSveltosComponents,
  getSveltosVersion,
  type SveltosComponent,
  versionLabel,
} from "../api/sveltos-version";
import { getShardColor, setShardColor, syncUiSettings } from "../api/ui-settings";
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

interface Shard {
  key?: string;
  controllers: SveltosComponent[];
  clusters: number;
}

/** Default shard first, then every shard that has controllers or clusters, by key. */
function getShards(components: SveltosComponent[], clusters: SveltosCluster[]): Shard[] {
  const shards = new Map<string | undefined, Shard>([[undefined, { controllers: [], clusters: 0 }]]);
  const entry = (key: string | undefined) => {
    let shard = shards.get(key);

    if (!shard) {
      shard = { key, controllers: [], clusters: 0 };
      shards.set(key, shard);
    }

    return shard;
  };

  for (const component of components) entry(component.shard).controllers.push(component);
  for (const cluster of clusters) entry(getShard(cluster)).clusters++;

  return [...shards.values()].sort((a, b) =>
    a.key === undefined ? -1 : b.key === undefined ? 1 : a.key.localeCompare(b.key),
  );
}

function ControllerChips({ controllers, version }: { controllers: SveltosComponent[]; version?: string }) {
  return (
    <div className={styles.versionComponents}>
      {[...controllers]
        .sort((a, b) => baseName(a).localeCompare(baseName(b)))
        .map((component) => {
          const differs = component.version !== version;

          return (
            <span
              key={component.name}
              className={`${styles.controller} ${differs ? styles.controllerWarn : ""}`}
              title={component.image}
            >
              {baseName(component)}
              {differs ? <span className={styles.controllerVersion}>{versionLabel(component)}</span> : null}
            </span>
          );
        })}
    </div>
  );
}

const ShardColorPicker = observer(({ shard }: { shard?: string }) => {
  const saved = getShardColor(shard);
  const [draft, setDraft] = React.useState<string | undefined>();

  // The picker fires on every drag step, only the last color is saved.
  React.useEffect(() => {
    if (draft === undefined) return;

    const timer = setTimeout(() => {
      setShardColor(shard, draft);
      setDraft(undefined);
    }, 300);

    return () => clearTimeout(timer);
  }, [shard, draft]);

  return (
    <span className={styles.shardColor}>
      <input
        type="color"
        className={styles.shardColorInput}
        value={draft ?? saved ?? "#808080"}
        title="Shard color"
        onChange={(event) => setDraft(event.target.value)}
      />
      {saved ? (
        <Icon
          material="format_color_reset"
          small
          interactive
          tooltip="Reset color"
          onClick={() => setShardColor(shard, undefined)}
        />
      ) : null}
    </span>
  );
});

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

  React.useEffect(() => syncUiSettings(), []);

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
  const shards = getShards(components, sveltosClusters as SveltosCluster[]);
  const sharded = shards.length > 1;
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
                ? `${components.length} controller${components.length === 1 ? "" : "s"} in ${components[0].namespace}${
                    sharded ? ` · ${shards.length - 1} shard${shards.length === 2 ? "" : "s"}` : ""
                  }`
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
            {components.length > 0 && !sharded ? (
              <ControllerChips controllers={components} version={installedVersion} />
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

        {sharded ? (
          <>
            <h3 className={styles.sectionTitle}>Shards</h3>
            <div className={styles.shards}>
              {shards.map((shard) => {
                const color = getShardColor(shard.key);

                return (
                  <div
                    className={styles.shard}
                    key={shard.key ?? ""}
                    style={color ? { borderLeftColor: color } : undefined}
                  >
                    <div className={styles.shardHeader}>
                      <Icon material="dns" small style={color ? { color } : undefined} />
                      <span className={styles.shardName}>{shard.key ?? "Default"}</span>
                      <span className={styles.cardHint}>
                        {shard.clusters} cluster{shard.clusters === 1 ? "" : "s"}
                      </span>
                      <ShardColorPicker shard={shard.key} />
                    </div>
                    {shard.controllers.length > 0 ? (
                      <ControllerChips controllers={shard.controllers} version={installedVersion} />
                    ) : (
                      <div className={styles.shardWarn}>No controller deployed for this shard</div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : null}

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
