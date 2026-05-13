/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Renderer } from "@freelensapp/extensions";
import { useEffect, useState } from "react";

import type { OverviewData } from "./types";

const { K8sApi } = Renderer;

export function useOverviewData(): OverviewData {
  const [data, setData] = useState<OverviewData>({
    clusters: {
      capiTotal: 0,
      capiReady: 0,
      sveltosTotal: 0,
      sveltosReady: 0,
    },
    helm: {
      totalReleases: 0,
    },
    events: {
      totalEvents: 0,
      recentEvents: [],
    },
    clustersByNamespace: {},
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      try {
        // Fetch ClusterAPI Clusters
        let capiTotal = 0;
        let capiReady = 0;
        try {
          const capiApi = new K8sApi.KubeApi({
            objectConstructor: K8sApi.KubeObject,
            apiBase: "/apis/cluster.x-k8s.io/v1beta1/clusters",
          });
          const capiItems = await capiApi.list();
          capiTotal = Array.isArray(capiItems) ? capiItems.length : 0;
          capiReady = (Array.isArray(capiItems) ? capiItems : []).filter((item: any) =>
            item.status?.conditions?.some((c: any) => c.type === "Ready" && c.status === "True"),
          ).length;
        } catch (e) {
          console.log("ClusterAPI not available or error fetching:", e);
        }

        // Fetch SveltosClusters
        let sveltosTotal = 0;
        let sveltosReady = 0;
        try {
          const sveltosApi = new K8sApi.KubeApi({
            objectConstructor: K8sApi.KubeObject,
            apiBase: "/apis/lib.projectsveltos.io/v1beta1/sveltosclusters",
          });
          const sveltosItems = await sveltosApi.list();
          sveltosTotal = Array.isArray(sveltosItems) ? sveltosItems.length : 0;
          sveltosReady = (Array.isArray(sveltosItems) ? sveltosItems : []).filter(
            (item: any) => item.status?.ready === true,
          ).length;
        } catch (e) {
          console.log("SveltosClusters not available or error fetching:", e);
        }

        // Count Helm releases by looking at HelmRelease CRDs (from FluxCD)
        let totalReleases = 0;
        try {
          const helmApi = new K8sApi.KubeApi({
            objectConstructor: K8sApi.KubeObject,
            apiBase: "/apis/helm.toolkit.fluxcd.io/v2/helmreleases",
          });
          const helmItems = await helmApi.list();
          totalReleases = Array.isArray(helmItems) ? helmItems.length : 0;
        } catch (e) {
          console.log("HelmReleases not available or error fetching:", e);
        }

        // Fetch EventTriggers as events
        let totalEvents = 0;
        let recentEvents: any[] = [];
        try {
          const eventApi = new K8sApi.KubeApi({
            objectConstructor: K8sApi.KubeObject,
            apiBase: "/apis/lib.projectsveltos.io/v1beta1/eventtriggers",
          });
          const eventItems = await eventApi.list();
          totalEvents = Array.isArray(eventItems) ? eventItems.length : 0;
          recentEvents = (Array.isArray(eventItems) ? eventItems : []).slice(0, 10).map((item: any) => ({
            name: item.metadata?.name || "Unknown",
            namespace: item.metadata?.namespace || "default",
            type: item.kind || "EventTrigger",
            message: item.spec?.name || "Event Trigger",
            timestamp: item.metadata?.creationTimestamp || new Date().toISOString(),
          }));
        } catch (e) {
          console.log("EventTriggers not available or error fetching:", e);
        }

        // Build clusters by namespace map
        const clustersByNamespace: Record<string, number> = {};
        try {
          const capiApi = new K8sApi.KubeApi({
            objectConstructor: K8sApi.KubeObject,
            apiBase: "/apis/cluster.x-k8s.io/v1beta1/clusters",
          });
          const capiItems = await capiApi.list();
          (Array.isArray(capiItems) ? capiItems : []).forEach((item: any) => {
            const ns = item.metadata?.namespace || "default";
            clustersByNamespace[ns] = (clustersByNamespace[ns] || 0) + 1;
          });
        } catch (e) {
          console.log("Error building clusters by namespace:", e);
        }

        if (isMounted) {
          setData({
            clusters: {
              capiTotal,
              capiReady,
              sveltosTotal,
              sveltosReady,
            },
            helm: {
              totalReleases,
            },
            events: {
              totalEvents,
              recentEvents,
            },
            clustersByNamespace,
            isLoading: false,
            error: null,
          });
        }
      } catch (error) {
        if (isMounted) {
          setData((prev) => ({
            ...prev,
            isLoading: false,
            error: error instanceof Error ? error : new Error("Unknown error"),
          }));
        }
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  return data;
}
