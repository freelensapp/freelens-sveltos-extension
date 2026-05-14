/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Renderer } from "@freelensapp/extensions";
import { useEffect, useState } from "react";

import type { OverviewData } from "./types";

const { K8sApi } = Renderer;
const REFRESH_INTERVAL_MS = 30000;

class NamespacedKubeObject extends K8sApi.KubeObject {
  static readonly namespaced = true;
}

class ClusterScopedKubeObject extends K8sApi.KubeObject {
  static readonly namespaced = false;
}

function toItems<T = any>(listResponse: unknown): T[] {
  if (Array.isArray(listResponse)) {
    return listResponse as T[];
  }

  if (listResponse && typeof listResponse === "object") {
    const maybeItems = (listResponse as { items?: unknown }).items;

    if (Array.isArray(maybeItems)) {
      return maybeItems as T[];
    }
  }

  return [];
}

function isTrue(value: unknown): boolean {
  return value === true || value === "True" || value === "true";
}

function isCapiReady(cluster: any): boolean {
  const cpInitialized = cluster?.status?.initialization?.controlPlaneInitialized;

  if (cpInitialized !== undefined) {
    return isTrue(cpInitialized);
  }

  return Boolean(
    cluster?.status?.conditions?.some((condition: any) => condition.type === "Ready" && isTrue(condition.status)),
  );
}

function uniqueByIdentity(items: any[]): any[] {
  const seen = new Set<string>();
  const result: any[] = [];

  for (const item of items) {
    const key =
      item?.metadata?.uid ||
      `${item?.apiVersion || ""}:${item?.kind || ""}:${item?.metadata?.namespace || ""}:${item?.metadata?.name || ""}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(item);
  }

  return result;
}

async function getAllNamespaces(): Promise<string[]> {
  try {
    const namespaceStore = (K8sApi as any).namespaceStore;

    if (namespaceStore) {
      await namespaceStore.loadAll({ namespaces: [] });

      const storeNamespaces = (namespaceStore.items ?? [])
        .map((ns: any) => (typeof ns?.getName === "function" ? ns.getName() : ns?.metadata?.name))
        .filter((name: unknown): name is string => typeof name === "string" && name.length > 0);

      if (storeNamespaces.length > 0) {
        return Array.from(new Set(storeNamespaces));
      }
    }
  } catch {
    // Fallback to direct API listing.
  }

  try {
    const namespaceApi = new K8sApi.KubeApi({
      objectConstructor: ClusterScopedKubeObject,
      apiBase: "/api/v1/namespaces",
    });
    const namespaceItems = toItems<any>(await namespaceApi.list());
    const namespaces = namespaceItems
      .map((ns) => ns?.metadata?.name)
      .filter((name: unknown): name is string => typeof name === "string" && name.length > 0);

    return Array.from(new Set(namespaces));
  } catch {
    return [];
  }
}

interface ListResourceOptions {
  namespaced: boolean;
  namespaceNames?: string[];
}

async function listResource(apiBases: string[], options: ListResourceOptions): Promise<any[]> {
  const { namespaced, namespaceNames } = options;
  const namespaces = namespaceNames && namespaceNames.length > 0 ? namespaceNames : [undefined];

  for (const apiBase of apiBases) {
    try {
      const resources: any[] = [];

      if (!namespaced) {
        const api = new K8sApi.KubeApi({
          objectConstructor: ClusterScopedKubeObject,
          apiBase,
        });
        const listResponse = await api.list();
        resources.push(...toItems(listResponse));
      } else {
        // Try cluster-wide first using a cluster-scoped constructor to avoid implicit
        // current-namespace filtering in the renderer context.
        try {
          const clusterWideApi = new K8sApi.KubeApi({
            objectConstructor: ClusterScopedKubeObject,
            apiBase,
          });
          const listResponse = await clusterWideApi.list();
          const clusterWideItems = toItems(listResponse);

          if (clusterWideItems.length > 0) {
            return uniqueByIdentity(clusterWideItems);
          }
        } catch {
          // Fallback below to namespace-by-namespace listing.
        }

        const namespacedApi = new K8sApi.KubeApi({
          objectConstructor: NamespacedKubeObject,
          apiBase,
        });

        for (const namespace of namespaces) {
          try {
            const listResponse = namespace ? await namespacedApi.list({ namespace }) : await namespacedApi.list();
            resources.push(...toItems(listResponse));
          } catch {
            // Continue with other namespaces and still keep partial results.
          }
        }
      }

      return uniqueByIdentity(resources);
    } catch {
      // Try the next apiBase variant.
    }
  }

  return [];
}

export function useOverviewData(): OverviewData {
  const [data, setData] = useState<OverviewData>({
    clusters: {
      capiTotal: 0,
      capiReady: 0,
      capiNotReady: 0,
      sveltosTotal: 0,
      sveltosReady: 0,
      sveltosNotReady: 0,
      pullModeClusters: 0,
    },
    resources: {
      clusterProfiles: 0,
      profiles: 0,
      clusterSummaries: 0,
      eventTriggers: 0,
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
    let interval: ReturnType<typeof setInterval> | undefined;

    async function fetchData() {
      try {
        const allNamespaces = await getAllNamespaces();

        const [capiItems, sveltosItems, clusterProfileItems, profileItems, clusterSummaryItems, eventTriggerItems] =
          await Promise.all([
            listResource(["/apis/cluster.x-k8s.io/v1beta2/clusters", "/apis/cluster.x-k8s.io/v1beta1/clusters"], {
              namespaced: true,
              namespaceNames: allNamespaces,
            }),
            listResource(["/apis/lib.projectsveltos.io/v1beta1/sveltosclusters"], {
              namespaced: true,
              namespaceNames: allNamespaces,
            }),
            listResource(["/apis/config.projectsveltos.io/v1beta1/clusterprofiles"], {
              namespaced: false,
            }),
            listResource(["/apis/config.projectsveltos.io/v1beta1/profiles"], {
              namespaced: true,
              namespaceNames: allNamespaces,
            }),
            listResource(["/apis/config.projectsveltos.io/v1beta1/clustersummaries"], {
              namespaced: true,
              namespaceNames: allNamespaces,
            }),
            listResource(["/apis/lib.projectsveltos.io/v1beta1/eventtriggers"], {
              namespaced: false,
            }),
          ]);

        const capiTotal = capiItems.length;
        const capiReady = capiItems.filter(isCapiReady).length;
        const capiNotReady = capiTotal - capiReady;

        const sveltosTotal = sveltosItems.length;
        const sveltosReady = sveltosItems.filter((item: any) => isTrue(item?.status?.ready)).length;
        const sveltosNotReady = sveltosTotal - sveltosReady;
        const pullModeClusters = sveltosItems.filter((item: any) => isTrue(item?.spec?.pullMode)).length;

        const clusterProfiles = clusterProfileItems.length;
        const profiles = profileItems.length;
        const clusterSummaries = clusterSummaryItems.length;
        const eventTriggers = eventTriggerItems.length;

        const totalEvents = eventTriggers;
        const recentEvents = eventTriggerItems
          .slice()
          .sort((a: any, b: any) => {
            const left = new Date(a?.metadata?.creationTimestamp || 0).getTime();
            const right = new Date(b?.metadata?.creationTimestamp || 0).getTime();

            return right - left;
          })
          .slice(0, 10)
          .map((item: any) => ({
            name: item.metadata?.name || "Unknown",
            namespace: item.metadata?.namespace || "default",
            type: item.kind || "EventTrigger",
            message: item.spec?.eventSourceName || item.spec?.name || "Event Trigger",
            timestamp: item.metadata?.creationTimestamp || new Date().toISOString(),
          }));

        const clustersByNamespace: Record<string, number> = {};
        capiItems.forEach((item: any) => {
          const ns = item.metadata?.namespace || "default";
          clustersByNamespace[ns] = (clustersByNamespace[ns] || 0) + 1;
        });

        if (isMounted) {
          setData({
            clusters: {
              capiTotal,
              capiReady,
              capiNotReady,
              sveltosTotal,
              sveltosReady,
              sveltosNotReady,
              pullModeClusters,
            },
            resources: {
              clusterProfiles,
              profiles,
              clusterSummaries,
              eventTriggers,
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
    interval = setInterval(fetchData, REFRESH_INTERVAL_MS);

    return () => {
      isMounted = false;

      if (interval) {
        clearInterval(interval);
      }
    };
  }, []);

  return data;
}
