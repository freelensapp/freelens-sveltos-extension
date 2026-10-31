import { Renderer } from "@freelensapp/extensions";
import { computed } from "mobx";
import * as MobxReact from "mobx-react";
import React from "react";
import { maybe } from "../../common/utils";
import { type Addon, clusterKey, getAddons, isProvisioning } from "../api/addons";
import { CapiCluster } from "../api/capi/cluster-v1beta1";
import {
  type AnyCluster,
  type ClusterType,
  getConnectionStatus,
  getPaused,
  getReady,
  getVersion,
  isCapi,
} from "../api/clusters";
import { ClusterConfiguration } from "../api/config/cluster-configuration-v1beta1";
import { ClusterSummary } from "../api/config/cluster-summary-v1beta1";
import { type DeployError, filterErrorsByAddon, filterErrorsByCluster, getDeployErrors } from "../api/deploy-errors";
import { getKubeconfigSecretRef } from "../api/helm-release";
import { SveltosCluster } from "../api/lib/sveltos-cluster-v1beta1";
import { reuseUnchanged } from "../api/reuse-unchanged";
import { matchesSearchQuery, parseSearchQuery, toSearchFields } from "../api/search-query";
import { countByStatus, matchesStatus } from "../api/status-filter";
import { subscribeToStores } from "../api/subscribe-stores";
import { AddonsView } from "../components/addons-view";
import { ClusterCard } from "../components/cluster-card";
import { useColumnResize } from "../components/column-resize";
import styles from "../components/dashboard.module.scss";
import { DeployErrorsView } from "../components/deploy-errors-view";
import { HelmReleaseView } from "../components/helm-release-view";
import { LastUpdate } from "../components/last-update";
import { useLatest } from "../components/row-cache";
import { StatusChip } from "../components/status-chip";
import { allStatuses, StatusFilter } from "../components/status-filter";
import { ColumnsMenu, type TableColumn, useHiddenColumns, useTableSort } from "../components/table-columns";
import { type ViewMode, ViewToggle } from "../components/view-toggle";

const { observer } = MobxReact;

const {
  Component: {
    BadgeBoolean,
    Icon,
    KubeObjectAge,
    NamespaceSelectFilter,
    SearchInput,
    Table,
    TableCell,
    TableHead,
    TableRow,
  },
  Navigation: { showDetails },
} = Renderer;

const tableId = "sveltosClustersTable";

const sortingCallbacks = {
  name: (cluster: AnyCluster) => cluster.getName(),
  namespace: (cluster: AnyCluster) => cluster.getNs() ?? "",
  ready: (cluster: AnyCluster) => String(getReady(cluster)),
  connection: (cluster: AnyCluster) => getConnectionStatus(cluster) ?? "",
  version: (cluster: AnyCluster) => getVersion(cluster) ?? "",
  age: (cluster: AnyCluster) => cluster.getCreationTimestamp(),
};

/** Cluster labels are addressable by name, so `tier: dev` filters on the `tier` label. */
function clusterSearchTarget(cluster: AnyCluster, status: string) {
  return {
    text: [cluster.getName(), cluster.getNs()],
    fields: toSearchFields({
      ...cluster.metadata.labels,
      name: cluster.getName(),
      namespace: cluster.getNs(),
      version: getVersion(cluster),
      ready: String(getReady(cluster)),
      connection: getConnectionStatus(cluster),
      paused: String(getPaused(cluster)),
      status,
    }),
  };
}

const keyOf = (cluster: AnyCluster) => clusterKey(cluster.getNs(), cluster.getName());

interface ClusterStats {
  addonCount: number;
  provisioningCount: number;
  errorCount: number;
  profileCount: number;
  lastUpdate?: string;
}

const emptyStats: ClusterStats = { addonCount: 0, provisioningCount: 0, errorCount: 0, profileCount: 0 };

const noAddons = "No add-ons";

/** What the Status column shows, also what the status filter and the `status:` search term match. */
function getClusterStatus(cluster: AnyCluster, stats: ClusterStats): string {
  if (getPaused(cluster)) return "Paused";
  if (stats.provisioningCount > 0) return "Provisioning";
  if (stats.errorCount > 0) return "Failed";

  return stats.addonCount > 0 ? "Provisioned" : noAddons;
}

/** One pass over add-ons and errors instead of filtering both for every cluster row. */
function computeStats(addons: Addon[], errors: DeployError[]): Map<string, ClusterStats> {
  const stats = new Map<string, ClusterStats & { profiles: Set<string> }>();
  const entry = (key: string) => {
    let value = stats.get(key);

    if (!value) {
      value = { ...emptyStats, profiles: new Set() };
      stats.set(key, value);
    }

    return value;
  };

  for (const addon of addons) {
    const value = entry(clusterKey(addon.clusterNamespace, addon.clusterName));

    value.addonCount++;
    if (isProvisioning(addon.status)) value.provisioningCount++;
    if (addon.profile) value.profiles.add(addon.profile);
    if (addon.lastAppliedTime && (!value.lastUpdate || addon.lastAppliedTime > value.lastUpdate)) {
      value.lastUpdate = addon.lastAppliedTime;
    }
  }

  for (const error of errors) entry(clusterKey(error.clusterNamespace, error.clusterName)).errorCount++;

  return new Map(
    [...stats].map(([key, { profiles, ...value }]) => [key, { ...value, profileCount: profiles.size }] as const),
  );
}

type Store<Item> = { items: Item[] } | null;

/**
 * Derived data lives in MobX computeds: it is rebuilt when the stores change, not on every render caused by
 * typing in the search box, selecting a row or resizing a column. Unchanged add-ons and errors keep their
 * identity across watch events and reloads, so the tables only re-render rows that actually changed.
 */
function createClustersModel(
  clusterStore: Store<AnyCluster>,
  summaryStore: Store<ClusterSummary>,
  configurationStore: Store<ClusterConfiguration>,
  clusterType: ClusterType,
) {
  let addons: Addon[] = [];
  let errors: DeployError[] = [];

  const clustersComputed = computed(() => [...(clusterStore?.items ?? [])]);
  const addonsComputed = computed(() => {
    const knownClusters = new Set(clustersComputed.get().map(keyOf));

    addons = reuseUnchanged(
      addons,
      getAddons(summaryStore?.items ?? [], configurationStore?.items ?? [], knownClusters).filter(
        (addon) => addon.clusterType === clusterType,
      ),
    );

    return addons;
  });
  const errorsComputed = computed(() => {
    errors = reuseUnchanged(
      errors,
      getDeployErrors(summaryStore?.items ?? []).filter((error) => error.clusterType === clusterType),
    );

    return errors;
  });
  const statsComputed = computed(() => computeStats(addonsComputed.get(), errorsComputed.get()));

  return {
    get clusters() {
      return clustersComputed.get();
    },
    get addons() {
      return addonsComputed.get();
    },
    get errors() {
      return errorsComputed.get();
    },
    get stats() {
      return statsComputed.get();
    },
  };
}

export interface SveltosClustersPageProps {
  extension: Renderer.LensExtension;
}

export const SveltosClustersPage = observer((props: SveltosClustersPageProps) => {
  const capiStore = maybe(() => CapiCluster.getStore<CapiCluster>());
  const [clusterType, setClusterType] = React.useState<ClusterType>("Sveltos");
  const clusterStore = clusterType === "Capi" && capiStore ? capiStore : SveltosCluster.getStore<SveltosCluster>();
  const summaryStore = maybe(() => ClusterSummary.getStore<ClusterSummary>());
  const configurationStore = maybe(() => ClusterConfiguration.getStore<ClusterConfiguration>());

  const [view, setView] = React.useState<ViewMode>("table");
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState(allStatuses);
  const [selected, setSelected] = React.useState<string | undefined>();
  const [selectedAddon, setSelectedAddon] = React.useState<string | undefined>();

  // Same namespace filter as the rest of Freelens, so picking a namespace here or elsewhere applies to both.
  const { namespaceStore } = Renderer.K8sApi;
  const namespaceKey = namespaceStore.areAllSelectedImplicitly
    ? undefined
    : namespaceStore.contextNamespaces.join("\n");
  const inNamespace = React.useMemo(() => {
    const namespaces = namespaceKey === undefined ? undefined : new Set(namespaceKey.split("\n"));

    return (namespace: string | undefined) => !namespaces || namespaces.has(namespace ?? "");
  }, [namespaceKey]);

  // Clears the selection whenever the namespace filter or the cluster type changes.
  React.useEffect(() => {
    setSelected(undefined);
    setSelectedAddon(undefined);
  }, [namespaceKey, clusterType]);

  // Separate subscriptions, so switching the cluster type does not reload every ClusterSummary.
  React.useEffect(() => subscribeToStores([clusterStore]), [clusterStore]);
  React.useEffect(
    () => subscribeToStores([summaryStore, configurationStore].filter((store) => store !== null)),
    [summaryStore, configurationStore],
  );

  const model = React.useMemo(
    () => createClustersModel(clusterStore, summaryStore, configurationStore, clusterType),
    [clusterStore, summaryStore, configurationStore, clusterType],
  );
  const { clusters: allClusters, addons, errors, stats } = model;

  const { clusters, statusCounts } = React.useMemo(() => {
    const terms = parseSearchQuery(search);
    const matching = allClusters
      .map((cluster) => ({ cluster, status: getClusterStatus(cluster, stats.get(keyOf(cluster)) ?? emptyStats) }))
      .filter(
        (entry) =>
          inNamespace(entry.cluster.getNs()) &&
          matchesSearchQuery(terms, clusterSearchTarget(entry.cluster, entry.status)),
      );

    return {
      // Counted before the status filter, so every option shows how many clusters picking it leaves.
      statusCounts: countByStatus(matching, (entry) => entry.status),
      clusters: matching.filter((entry) => matchesStatus(entry.status, status)).map((entry) => entry.cluster),
    };
  }, [allClusters, stats, search, inNamespace, status]);

  const selectedCluster = clusters.find((cluster) => keyOf(cluster) === selected);
  const selectedAddons = React.useMemo(
    () =>
      selected
        ? addons.filter((addon) => clusterKey(addon.clusterNamespace, addon.clusterName) === selected)
        : addons.filter((addon) => inNamespace(addon.clusterNamespace)),
    [addons, selected, inNamespace],
  );
  const selectedAddonObject = addons.find((addon) => addon.id === selectedAddon);
  const selectedHelmRelease =
    selectedAddonObject?.type === "Helm" && selectedAddonObject.namespace ? selectedAddonObject : undefined;
  const selectedAddonCluster = selectedHelmRelease
    ? allClusters.find(
        (cluster) =>
          keyOf(cluster) === clusterKey(selectedHelmRelease.clusterNamespace, selectedHelmRelease.clusterName),
      )
    : undefined;
  const selectedSecret = React.useMemo(
    () =>
      selectedHelmRelease
        ? getKubeconfigSecretRef(
            selectedHelmRelease,
            selectedAddonCluster && !isCapi(selectedAddonCluster) ? selectedAddonCluster.spec : undefined,
          )
        : undefined,
    [selectedHelmRelease, selectedAddonCluster],
  );
  const selectedErrors = React.useMemo(
    () =>
      selectedAddonObject
        ? filterErrorsByAddon(errors, selectedAddonObject)
        : selectedCluster
          ? filterErrorsByCluster(errors, selectedCluster.getNs() ?? "", selectedCluster.getName())
          : errors.filter((error) => inNamespace(error.clusterNamespace)),
    [errors, selectedAddonObject, selectedCluster, inNamespace],
  );

  const toggleSelection = React.useCallback((cluster: AnyCluster) => {
    const key = keyOf(cluster);

    setSelectedAddon(undefined);
    setSelected((current) => (current === key ? undefined : key));
  }, []);
  const toggleAddon = React.useCallback(
    (addon: Addon) => setSelectedAddon((current) => (current === addon.id ? undefined : addon.id)),
    [],
  );
  const togglePause = React.useCallback((cluster: AnyCluster) => {
    if (isCapi(cluster)) return;

    void SveltosCluster.getStore<SveltosCluster>().patch(cluster, { spec: { paused: !getPaused(cluster) } }, "merge");
  }, []);

  const subtitle = selectedCluster ? `${selectedCluster.getNs()}/${selectedCluster.getName()}` : "all clusters";

  return (
    <>
      <div className={styles.page}>
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Sveltos Clusters</h2>
            {capiStore ? (
              <div className={styles.viewToggle}>
                {(
                  [
                    ["Sveltos", "SveltosCluster"],
                    ["Capi", "ClusterAPI"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    className={`${styles.viewToggleButton} ${clusterType === value ? styles.viewToggleButtonActive : ""}`}
                    onClick={() => setClusterType(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}
            <span className={styles.sectionSubtitle}>
              {clusters.length} cluster{clusters.length === 1 ? "" : "s"}
              {selected ? " · click the selected cluster again to clear the filter" : ""}
            </span>
            <div className={styles.spacer} />
            <div className={styles.toolbar}>
              <div className={styles.namespaceSelect}>
                <NamespaceSelectFilter id="sveltosClusterNamespace" />
              </div>
              <StatusFilter
                id="sveltosClusterStatus"
                value={status}
                counts={statusCounts}
                onChange={(value) => {
                  setStatus(value);
                  setSelected(undefined);
                  setSelectedAddon(undefined);
                }}
              />
              <SearchInput
                className={styles.searchWide}
                value={search}
                onChange={(value: string) => setSearch(value)}
                placeholder="cloudProvider: aws, tier: dev"
                title="Filter by label or field, comma separated. Bare words search everywhere."
              />
              <ViewToggle value={view} onChange={setView} />
              {view === "table" ? <ColumnsMenu tableId={tableId} columns={clusterColumns} /> : null}
            </div>
          </div>

          {clusters.length === 0 ? (
            <div className={styles.empty}>No cluster matches the current filters.</div>
          ) : view === "cards" ? (
            <div className={styles.cards}>
              {clusters.map((cluster) => (
                <ClusterCard
                  key={cluster.getId()}
                  cluster={cluster}
                  selected={keyOf(cluster) === selected}
                  onSelect={() => toggleSelection(cluster)}
                  {...(stats.get(keyOf(cluster)) ?? emptyStats)}
                />
              ))}
            </div>
          ) : (
            <ClustersTable
              clusters={clusters}
              stats={stats}
              selected={selected}
              onSelect={toggleSelection}
              onTogglePause={togglePause}
            />
          )}
        </div>

        <AddonsView
          addons={selectedAddons}
          selectedAddonId={selectedAddon}
          subtitle={subtitle}
          onAddonSelect={toggleAddon}
        />

        {selectedHelmRelease?.namespace && selectedSecret ? (
          <HelmReleaseView
            key={selectedHelmRelease.id}
            secret={selectedSecret}
            namespace={selectedHelmRelease.namespace}
            name={selectedHelmRelease.name}
            subtitle={`${selectedHelmRelease.clusterNamespace}/${selectedHelmRelease.clusterName}`}
          />
        ) : null}

        <DeployErrorsView errors={selectedErrors} subtitle={subtitle} />
      </div>
    </>
  );
});

interface ClusterColumn extends TableColumn {
  sortBy?: keyof typeof sortingCallbacks;
  className: string;
  render: (cluster: AnyCluster, stats: ClusterStats) => React.ReactNode;
}

function ClusterStatus({ cluster, stats }: { cluster: AnyCluster; stats: ClusterStats }) {
  const status = getClusterStatus(cluster, stats);

  switch (status) {
    case "Paused":
      return <StatusChip status={status} tooltip="Sveltos is not reconciling this cluster" />;
    case "Provisioning":
      return (
        <StatusChip
          status={status}
          tooltip={`${stats.provisioningCount} add-on${stats.provisioningCount === 1 ? "" : "s"} provisioning`}
        />
      );
    case "Failed":
      return <StatusChip status={status} tooltip={`${stats.errorCount} errors`} />;
    case noAddons:
      return <>-</>;
    default:
      return <StatusChip status={status} />;
  }
}

const clusterColumns: ClusterColumn[] = [
  {
    id: "name",
    title: "Name",
    sortBy: "name",
    className: styles.cellName,
    render: (cluster) => (
      <span className={styles.cellText} title={cluster.getName()}>
        {cluster.getName()}
      </span>
    ),
  },
  {
    id: "namespace",
    title: "Namespace",
    sortBy: "namespace",
    className: styles.cellNamespace,
    render: (cluster) => (
      <span className={styles.cellText} title={cluster.getNs()}>
        {cluster.getNs()}
      </span>
    ),
  },
  {
    id: "ready",
    title: "Ready",
    sortBy: "ready",
    className: styles.cellShort,
    render: (cluster) => <BadgeBoolean value={getReady(cluster)} />,
  },
  {
    id: "connection",
    title: "Connection",
    sortBy: "connection",
    className: styles.cellMedium,
    render: (cluster) => <StatusChip status={getConnectionStatus(cluster)} />,
  },
  {
    id: "version",
    title: "Version",
    sortBy: "version",
    className: styles.cellMedium,
    render: (cluster) => getVersion(cluster) ?? "-",
  },
  {
    id: "addons",
    title: "Add-ons",
    className: styles.cellTiny,
    render: (_cluster, stats) => stats.addonCount,
  },
  {
    id: "status",
    title: "Status",
    className: styles.cellMedium,
    render: (cluster, stats) => <ClusterStatus cluster={cluster} stats={stats} />,
  },
  {
    id: "lastUpdate",
    title: "Last Update",
    className: styles.cellMedium,
    render: (_cluster, stats) => <LastUpdate timestamp={stats.lastUpdate} />,
  },
  {
    id: "age",
    title: "Age",
    sortBy: "age",
    className: styles.cellTiny,
    render: (cluster) => <KubeObjectAge object={cluster} />,
  },
];

interface ClustersTableProps {
  clusters: AnyCluster[];
  stats: Map<string, ClusterStats>;
  selected?: string;
  onSelect: (cluster: AnyCluster) => void;
  onTogglePause: (cluster: AnyCluster) => void;
}

/** Own component, so resizing a column or typing in a search box elsewhere does not re-render the rows. */
const ClustersTable = observer(({ clusters, stats, selected, onSelect, onTogglePause }: ClustersTableProps) => {
  const { headProps, cellClass, widthStyle } = useColumnResize();
  const hidden = useHiddenColumns(tableId);
  const actions = useLatest({ onSelect, onTogglePause });
  const shown = clusterColumns.filter((column) => !hidden.has(column.id));
  const { sorted, sortHeadProps } = useTableSort(clusters, sortingCallbacks, "name");

  return (
    <div className={styles.tableScroll}>
      {widthStyle}
      <Table className={styles.table} tableId={tableId} selectable scrollable={false} virtual={false}>
        <TableHead sticky={false}>
          {shown.map((column) => (
            <TableCell
              key={column.id}
              className={`${column.className} ${cellClass(column.id)}`}
              {...sortHeadProps(column.sortBy)}
              {...headProps(column.id)}
            >
              {column.title}
            </TableCell>
          ))}
          <TableCell className={styles.cellIcon}>{""}</TableCell>
          <TableCell className={styles.cellIcon}>{""}</TableCell>
        </TableHead>
        {sorted.map((cluster) => {
          const clusterStats = stats.get(keyOf(cluster)) ?? emptyStats;
          const paused = getPaused(cluster);

          return (
            <TableRow
              key={cluster.getId()}
              nowrap
              selected={keyOf(cluster) === selected}
              onClick={() => actions.current.onSelect(cluster)}
            >
              {shown.map((column) => (
                <TableCell key={column.id} className={`${column.className} ${cellClass(column.id)}`}>
                  {column.render(cluster, clusterStats)}
                </TableCell>
              ))}
              <TableCell className={styles.cellIcon}>
                {/* Pausing a CAPI Cluster would also stop ClusterAPI itself, not only Sveltos. */}
                {isCapi(cluster) ? null : (
                  <Icon
                    material={paused ? "play_circle_outline" : "pause_circle_filled"}
                    small
                    interactive
                    tooltip={paused ? "Resume" : "Pause"}
                    onClick={(event: React.MouseEvent) => {
                      event.stopPropagation();
                      actions.current.onTogglePause(cluster);
                    }}
                  />
                )}
              </TableCell>
              <TableCell className={styles.cellIcon}>
                <Icon
                  material="open_in_new"
                  small
                  interactive
                  tooltip="Open details"
                  onClick={(event: React.MouseEvent) => {
                    event.stopPropagation();
                    showDetails(cluster.selfLink);
                  }}
                />
              </TableCell>
            </TableRow>
          );
        })}
      </Table>
    </div>
  );
});
