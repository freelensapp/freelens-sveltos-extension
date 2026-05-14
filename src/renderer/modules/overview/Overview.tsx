/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
// transpiled .tsx code must have `React` symbol in the scope
// @ts-ignore

import { Renderer } from "@freelensapp/extensions";
import React, { useEffect, useRef, useState } from "react";
import { CapiCluster } from "../../k8s/clusterapi/cluster-v1beta1";
import { ClusterProfile } from "../../k8s/projectsveltos/clusterprofile-v1beta1";
import { ClusterSummary as ClusterSummaryResource } from "../../k8s/projectsveltos/clustersummary-v1beta1";
import { EventTrigger } from "../../k8s/projectsveltos/eventtrigger-v1beta1";
import { Profile } from "../../k8s/projectsveltos/profile-v1beta1";
import { SveltosCluster } from "../../k8s/projectsveltos/sveltoscluster-v1beta1";
import { observer } from "../../utils/mobx";
import { ensureApisRegistered } from "../../utils/register-apis";
import { ClusterSummary } from "./ClusterSummary";
import { EventsSummary } from "./EventsSummary";
import { HelmSummary } from "./HelmSummary";
import styles from "./Overview.module.scss";
import styleInline from "./Overview.module.scss?inline";
import { StatsCard } from "./StatsCard";

import type { EventStats } from "./types";

const { Component } = Renderer;

export interface OverviewProps {
  extension: Renderer.LensExtension;
}

const SVELTOS_API_GROUPS = ["config.projectsveltos.io", "lib.projectsveltos.io", "cluster.x-k8s.io"];

function isSveltosOrCapiEvent(event: Renderer.K8sApi.KubeEvent): boolean {
  const apiVersion = event.involvedObject?.apiVersion ?? "";
  return SVELTOS_API_GROUPS.some((group) => apiVersion.startsWith(`${group}/`));
}

function countSveltosReady(items: SveltosCluster[]): number {
  return items.reduce((acc, item) => (item.status?.ready === true ? acc + 1 : acc), 0);
}

function countCapiReady(items: CapiCluster[]): number {
  return items.reduce((acc, item) => {
    if (item.status?.controlPlaneReady === true) return acc + 1;
    if (item.status?.initialization?.controlPlaneInitialized === true) return acc + 1;
    const readyCondition = item.status?.conditions?.find((c) => c.type === "Ready");
    if (readyCondition?.status === "True") return acc + 1;
    return acc;
  }, 0);
}

function countPullMode(items: SveltosCluster[]): number {
  return items.reduce((acc, item) => (item.spec?.pullMode === true ? acc + 1 : acc), 0);
}

function clustersByNamespace(items: { getNs: () => string | undefined }[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const item of items) {
    const ns = item.getNs() || "default";
    result[ns] = (result[ns] ?? 0) + 1;
  }
  return result;
}

export const Overview: React.FC<OverviewProps> = observer(({ extension: _extension }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const watches = useRef<(() => void)[]>([]);
  const abortController = useRef(new AbortController());

  useEffect(() => {
    let isMounted = true;
    const controller = abortController.current;

    (async () => {
      try {
        // KubeApi requires cluster-frame request context, so register lazily here (not at module import time).
        ensureApisRegistered();

        const { namespaceStore, eventApi, apiManager } = Renderer.K8sApi;

        await namespaceStore.loadAll({ namespaces: [], reqInit: { signal: controller.signal } });
        if (isMounted) watches.current.push(namespaceStore.subscribe());

        const namespaces = namespaceStore.items.map((ns) => ns.getName());

        const resourceClasses = [
          ClusterProfile,
          Profile,
          ClusterSummaryResource,
          EventTrigger,
          SveltosCluster,
          CapiCluster,
        ];

        await Promise.allSettled(
          resourceClasses.map(async (cls) => {
            try {
              const store = cls.getStore();
              if (!store) return;
              await store.loadAll({ namespaces, reqInit: { signal: controller.signal } });
              if (isMounted) watches.current.push(store.subscribe());
            } catch (e) {
              // CRD may not be installed (e.g. ClusterAPI absent) — ignore.
              console.debug(`[sveltos-overview] skipping ${cls.kind}:`, e);
            }
          }),
        );

        try {
          const eventStore = apiManager.getStore(eventApi);
          if (eventStore) {
            await eventStore.loadAll({ namespaces, reqInit: { signal: controller.signal } });
            if (isMounted) watches.current.push(eventStore.subscribe());
          }
        } catch (e) {
          console.debug("[sveltos-overview] events subscribe failed:", e);
        }

        if (isMounted) setIsLoading(false);
      } catch (e) {
        if (isMounted) {
          setError(e instanceof Error ? e : new Error(String(e)));
          setIsLoading(false);
        }
      }
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

  const safeItems = <T extends Renderer.K8sApi.KubeObject>(cls: {
    getStore: () => Renderer.K8sApi.KubeObjectStore<T> | undefined;
  }): T[] => {
    try {
      return cls.getStore()?.items ?? [];
    } catch {
      // API/store not registered (e.g. CRD not installed on the cluster).
      return [];
    }
  };

  const sveltosClusters = safeItems<SveltosCluster>(SveltosCluster);
  const capiClusters = safeItems<CapiCluster>(CapiCluster);
  const clusterProfileItems = safeItems<ClusterProfile>(ClusterProfile);
  const profileItems = safeItems<Profile>(Profile);
  const clusterSummaryItems = safeItems<ClusterSummaryResource>(ClusterSummaryResource);
  const eventTriggerItems = safeItems<EventTrigger>(EventTrigger);

  const sveltosTotal = sveltosClusters.length;
  const sveltosReady = countSveltosReady(sveltosClusters);
  const sveltosNotReady = sveltosTotal - sveltosReady;

  const capiTotal = capiClusters.length;
  const capiReady = countCapiReady(capiClusters);
  const capiNotReady = capiTotal - capiReady;

  const pullModeClusters = countPullMode(sveltosClusters);

  const allClusters = [...sveltosClusters, ...capiClusters];
  const byNamespace = clustersByNamespace(allClusters);

  let eventStats: EventStats = { totalEvents: 0, recentEvents: [] };
  try {
    const eventStore = Renderer.K8sApi.apiManager.getStore(Renderer.K8sApi.eventApi);
    const allEvents = (eventStore?.items ?? []) as Renderer.K8sApi.KubeEvent[];
    const matching = allEvents.filter(isSveltosOrCapiEvent);
    eventStats = {
      totalEvents: matching.length,
      recentEvents: matching
        .slice()
        .sort((a, b) => b.getCreationTimestamp() - a.getCreationTimestamp())
        .slice(0, 10)
        .map((ev) => ({
          name: ev.involvedObject?.name ?? ev.getName(),
          namespace: ev.getNs() ?? "",
          type: ev.type ?? "",
          message: ev.message ?? "",
          timestamp:
            (ev as unknown as { lastTimestamp?: string }).lastTimestamp ||
            (ev as unknown as { eventTime?: string }).eventTime ||
            ev.metadata.creationTimestamp ||
            "",
        })),
    };
  } catch {
    /* ignore */
  }

  if (error) {
    return (
      <div className={styles.overviewError}>
        <Component.Icon material="error" />
        <p>Error loading overview data: {error.message}</p>
      </div>
    );
  }

  return (
    <div className={styles.overviewPage}>
      <style>{styleInline}</style>

      <div className={styles.overviewHeader}>
        <h1>
          <Component.Icon material="dashboard" />
          Sveltos Overview
        </h1>
        {isLoading && <Component.Icon material="hourglass_empty" className={styles.spinning} />}
      </div>

      <div className={styles.overviewGrid}>
        <div className={styles.statsRow}>
          <StatsCard
            title="Sveltos Clusters"
            value={sveltosTotal}
            subValue={sveltosNotReady}
            subLabel="Not Ready"
            icon="cloud_queue"
            color="purple"
          />
          <StatsCard
            title="ClusterAPI Clusters"
            value={capiTotal}
            subValue={capiNotReady}
            subLabel="Not Ready"
            icon="cloud"
            color="blue"
          />
          <StatsCard title="Cluster Profiles" value={clusterProfileItems.length} icon="layers" color="green" />
          <StatsCard title="Profiles" value={profileItems.length} icon="description" color="orange" />
          <StatsCard title="Cluster Summaries" value={clusterSummaryItems.length} icon="assignment" color="purple" />
          <StatsCard title="Event Triggers" value={eventTriggerItems.length} icon="event" color="orange" />
        </div>

        <ClusterSummary
          capiTotal={capiTotal}
          capiReady={capiReady}
          sveltosTotal={sveltosTotal}
          sveltosReady={sveltosReady}
        />

        <HelmSummary
          clusterProfiles={clusterProfileItems.length}
          profiles={profileItems.length}
          clusterSummaries={clusterSummaryItems.length}
          pullModeClusters={pullModeClusters}
          clustersByNamespace={byNamespace}
        />

        <EventsSummary events={eventStats} />
      </div>
    </div>
  );
});
