/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
// transpiled .tsx code must have `React` symbol in the scope
// @ts-ignore

import { Renderer } from "@freelensapp/extensions";
import React, { useEffect, useRef, useState } from "react";
import { CapiCluster, CapiClusterApi } from "../../k8s/clusterapi/cluster-v1beta1";
import { SveltosCluster, SveltosClusterApi } from "../../k8s/projectsveltos/sveltoscluster-v1beta1";
import { observer } from "../../utils/mobx";
import { ensureApisRegistered } from "../../utils/register-apis";
import styles from "./ClustersPage.module.scss";
import styleInline from "./ClustersPage.module.scss?inline";

const pageInlineStyles = `${styleInline}
.TabLayout > .Tabs {
  display: none;
}

.TabLayout > main {
  margin: 0;
  padding: 0;
  height: 100%;
  min-height: 100%;
  background: var(--layoutBackground);
  overflow: hidden;
}`;

const {
  Component: { KubeObjectListLayout, KubeObjectAge, NamespaceSelectBadge, WithTooltip },
} = Renderer;

type ClusterTab = "sveltos" | "capi";

export interface ClustersPageProps {
  extension: Renderer.LensExtension;
}

// ─── SveltosCluster helpers ───────────────────────────────────────────────────

const getSveltosStatus = (object: SveltosCluster): string => (object.status?.ready === true ? "Ready" : "Not Ready");

const getSveltosVersion = (object: SveltosCluster): string => object.status?.version ?? "-";

const getSveltosPaused = (object: SveltosCluster): boolean => object.spec?.paused === true;

const getSveltosPullMode = (object: SveltosCluster): boolean => object.spec?.pullMode === true;

const sveltosSearchFilters = [
  (object: SveltosCluster) => [
    object.getName(),
    object.getNs() ?? "",
    getSveltosStatus(object),
    getSveltosVersion(object),
  ],
];

const sveltosSortingCallbacks = {
  name: (object: SveltosCluster) => object.getName(),
  namespace: (object: SveltosCluster) => object.getNs() ?? "",
  status: (object: SveltosCluster) => getSveltosStatus(object),
  version: (object: SveltosCluster) => getSveltosVersion(object),
  age: (object: SveltosCluster) => object.getCreationTimestamp(),
};

const sveltosSortingCallbacksWithAgent = {
  ...sveltosSortingCallbacks,
  agent: (object: SveltosCluster) => {
    const ready = object.status?.ready;

    if (ready === true) return "2";
    if (ready === false) return "1";

    return "0";
  },
};

const sveltosTableHeader: {
  title: string;
  sortBy: keyof typeof sveltosSortingCallbacksWithAgent;
  className?: string;
}[] = [
  { title: "Name", sortBy: "name", className: "name" },
  { title: "Namespace", sortBy: "namespace", className: "namespace" },
  { title: "Status", sortBy: "status", className: "status" },
  { title: "Agent", sortBy: "agent", className: "agent" },
  { title: "Version", sortBy: "version", className: "version" },
  { title: "Age", sortBy: "age", className: "age" },
];

function renderSveltosRow(object: SveltosCluster): React.ReactNode[] {
  const paused = getSveltosPaused(object);
  const pullMode = getSveltosPullMode(object);
  const ready = object.status?.ready === true;
  const readyValue = object.status?.ready;
  const agentState = readyValue === true ? "present" : readyValue === false ? "missing" : "unknown";

  return [
    <WithTooltip key="name">{object.getName()}</WithTooltip>,
    <NamespaceSelectBadge key="ns" namespace={object.getNs() ?? ""} />,
    <span key="status" className={styles.statusBadge}>
      <span className={`${styles.statusDot} ${ready ? styles.ready : styles.notReady}`} />
      {ready ? "Ready" : "Not Ready"}
      {paused && <span className={styles.pausedBadge}>Paused</span>}
      {pullMode && <span className={styles.pullModeBadge}>Pull Mode</span>}
    </span>,
    <span key="agent" className={styles.agentBadge}>
      <span
        className={`${styles.agentDot} ${agentState === "present" ? styles.ok : agentState === "missing" ? styles.error : styles.unknown}`}
      />
      {agentState === "present" ? "Present" : agentState === "missing" ? "Not Present" : "Unknown"}
    </span>,
    <span key="version" className={styles.versionText}>
      {getSveltosVersion(object)}
    </span>,
    <KubeObjectAge key="age" object={object} />,
  ];
}

// ─── CapiCluster helpers ──────────────────────────────────────────────────────

const getCapiStatus = (object: CapiCluster): string => {
  if (object.status?.controlPlaneReady === true) return "Ready";
  if (object.status?.phase) return object.status.phase;
  return "Unknown";
};

const getCapiPhase = (object: CapiCluster): string => object.status?.phase ?? "-";

const getCapiPaused = (object: CapiCluster): boolean => object.spec?.paused === true;

const capiSearchFilters = [
  (object: CapiCluster) => [object.getName(), object.getNs() ?? "", getCapiStatus(object), getCapiPhase(object)],
];

const capiSortingCallbacks = {
  name: (object: CapiCluster) => object.getName(),
  namespace: (object: CapiCluster) => object.getNs() ?? "",
  status: (object: CapiCluster) => getCapiStatus(object),
  phase: (object: CapiCluster) => getCapiPhase(object),
  age: (object: CapiCluster) => object.getCreationTimestamp(),
};

const capiTableHeader: { title: string; sortBy: keyof typeof capiSortingCallbacks; className?: string }[] = [
  { title: "Name", sortBy: "name", className: "name" },
  { title: "Namespace", sortBy: "namespace", className: "namespace" },
  { title: "Status", sortBy: "status", className: "status" },
  { title: "Phase", sortBy: "phase", className: "phase" },
  { title: "Age", sortBy: "age", className: "age" },
];

function renderCapiRow(object: CapiCluster): React.ReactNode[] {
  const ready = object.status?.controlPlaneReady === true;
  const paused = getCapiPaused(object);

  return [
    <WithTooltip key="name">{object.getName()}</WithTooltip>,
    <NamespaceSelectBadge key="ns" namespace={object.getNs() ?? ""} />,
    <span key="status" className={styles.statusBadge}>
      <span className={`${styles.statusDot} ${ready ? styles.ready : styles.notReady}`} />
      {getCapiStatus(object)}
      {paused && <span className={styles.pausedBadge}>Paused</span>}
    </span>,
    <WithTooltip key="phase">{getCapiPhase(object)}</WithTooltip>,
    <KubeObjectAge key="age" object={object} />,
  ];
}

// ─── Page component ───────────────────────────────────────────────────────────

export const ClustersPage: React.FC<ClustersPageProps> = observer(({ extension: _extension }) => {
  const [activeTab, setActiveTab] = useState<ClusterTab>("sveltos");
  const [apisReady, setApisReady] = useState(false);
  const [capiAvailable, setCapiAvailable] = useState(true);
  const watches = useRef<(() => void)[]>([]);
  const abortController = useRef(new AbortController());

  useEffect(() => {
    let isMounted = true;
    const controller = abortController.current;

    (async () => {
      ensureApisRegistered();

      const { namespaceStore } = Renderer.K8sApi;

      try {
        await namespaceStore.loadAll({ namespaces: [], reqInit: { signal: controller.signal } });
        if (isMounted) watches.current.push(namespaceStore.subscribe());
      } catch {
        // namespace load may fail in some contexts; continue
      }

      const namespaces = namespaceStore.items.map((ns) => ns.getName());

      // Load SveltosCluster store
      try {
        const sveltosStore = SveltosCluster.getStore();
        if (sveltosStore) {
          await sveltosStore.loadAll({ namespaces, reqInit: { signal: controller.signal } });
          if (isMounted) watches.current.push(sveltosStore.subscribe());
        }
      } catch (e) {
        console.debug("[sveltos-clusters] SveltosCluster store unavailable:", e);
      }

      // Load CapiCluster store (optional – CAPI may not be installed)
      try {
        const capiStore = CapiCluster.getStore();
        if (capiStore) {
          await capiStore.loadAll({ namespaces, reqInit: { signal: controller.signal } });
          if (isMounted) watches.current.push(capiStore.subscribe());
        }
      } catch (e) {
        console.debug("[sveltos-clusters] CapiCluster store unavailable (CAPI not installed):", e);
        if (isMounted) setCapiAvailable(false);
      }

      if (isMounted) setApisReady(true);
    })();

    return () => {
      isMounted = false;
      controller.abort();
      watches.current.forEach((unsubscribe) => {
        try {
          unsubscribe();
        } catch {
          /* ignore */
        }
      });
      watches.current = [];
    };
  }, []);

  let sveltosStore: Renderer.K8sApi.KubeObjectStore<SveltosCluster> | null = null;
  let capiStore: Renderer.K8sApi.KubeObjectStore<CapiCluster> | null = null;

  if (apisReady) {
    try {
      sveltosStore = SveltosCluster.getStore() as Renderer.K8sApi.KubeObjectStore<SveltosCluster>;
    } catch {
      // not available
    }
    try {
      capiStore = CapiCluster.getStore() as Renderer.K8sApi.KubeObjectStore<CapiCluster>;
    } catch {
      // not available
    }
  }

  return (
    <div className={styles.clustersPage}>
      <style>{pageInlineStyles}</style>

      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === "sveltos" ? styles.active : ""}`}
          onClick={() => setActiveTab("sveltos")}
        >
          Sveltos Clusters
        </button>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === "capi" ? styles.active : ""}`}
          onClick={() => setActiveTab("capi")}
        >
          ClusterAPI Clusters
        </button>
      </div>

      <div className={styles.tabContent}>
        {activeTab === "sveltos" && apisReady && sveltosStore && (
          <KubeObjectListLayout<SveltosCluster, SveltosClusterApi>
            className={styles.tabContent}
            tableId="sveltoclustersTable"
            store={sveltosStore}
            renderHeaderTitle={SveltosCluster.crd.title}
            sortingCallbacks={sveltosSortingCallbacksWithAgent}
            searchFilters={sveltosSearchFilters}
            renderTableHeader={sveltosTableHeader}
            renderTableContents={renderSveltosRow}
          />
        )}
        {activeTab === "sveltos" && apisReady && !sveltosStore && (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateCard}>
              <h2>SveltosCluster CRD not found</h2>
              <p>The SveltosCluster CRD is not installed on this cluster. Install Sveltos to manage clusters.</p>
            </div>
          </div>
        )}
        {activeTab === "capi" && apisReady && capiStore && capiAvailable && (
          <KubeObjectListLayout<CapiCluster, CapiClusterApi>
            className={styles.tabContent}
            tableId="capiclustersTable"
            store={capiStore}
            renderHeaderTitle={CapiCluster.crd.title}
            sortingCallbacks={capiSortingCallbacks}
            searchFilters={capiSearchFilters}
            renderTableHeader={capiTableHeader}
            renderTableContents={renderCapiRow}
          />
        )}
        {activeTab === "capi" && apisReady && (!capiStore || !capiAvailable) && (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateCard}>
              <h2>ClusterAPI not detected</h2>
              <p>
                The ClusterAPI (CAPI) CRDs are not installed on this cluster. Install ClusterAPI to manage
                infrastructure clusters.
              </p>
            </div>
          </div>
        )}
        {!apisReady && (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateCard}>
              <p>Loading clusters…</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
