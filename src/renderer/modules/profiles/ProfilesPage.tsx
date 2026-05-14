/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
// transpiled .tsx code must have `React` symbol in the scope
// @ts-ignore

import { Renderer } from "@freelensapp/extensions";
import React, { useEffect, useRef, useState } from "react";
import {
  ClusterProfile,
  type ClusterProfileApi,
  type ClusterSelector,
} from "../../k8s/projectsveltos/clusterprofile-v1beta1";
import { Profile, type ProfileApi, type ProfileClusterSelector } from "../../k8s/projectsveltos/profile-v1beta1";
import { observer } from "../../utils/mobx";
import { ensureApisRegistered } from "../../utils/register-apis";
import styles from "./ProfilesPage.module.scss";
import styleInline from "./ProfilesPage.module.scss?inline";

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

type ProfileTab = "cluster-profiles" | "profiles";

export interface ProfilesPageProps {
  extension: Renderer.LensExtension;
}

// ─── Shared helpers ──────────────────────────────────────────────────────────

type AnyClusterSelector = ClusterSelector | ProfileClusterSelector | undefined;

function formatClusterSelector(selector: AnyClusterSelector): string {
  if (!selector) return "-";

  const parts: string[] = [];

  if (selector.matchLabels) {
    for (const [key, value] of Object.entries(selector.matchLabels)) {
      parts.push(`${key}=${value}`);
    }
  }

  if (selector.matchExpressions) {
    for (const expr of selector.matchExpressions) {
      const values = expr.values?.length ? ` (${expr.values.join(",")})` : "";
      parts.push(`${expr.key} ${expr.operator}${values}`);
    }
  }

  return parts.length ? parts.join(", ") : "-";
}

// ─── ClusterProfile helpers ───────────────────────────────────────────────────

const getCpTier = (object: ClusterProfile): string => {
  const tier = object.spec?.tier;
  return tier === undefined || tier === null ? "-" : String(tier);
};

const getCpSyncMode = (object: ClusterProfile): string => object.spec?.syncMode ?? "-";

const getCpClusterSelector = (object: ClusterProfile): string => formatClusterSelector(object.spec?.clusterSelector);

const clusterProfileSearchFilters = [
  (object: ClusterProfile) => [
    object.getName(),
    getCpTier(object),
    getCpSyncMode(object),
    getCpClusterSelector(object),
  ],
];

const clusterProfileSortingCallbacks = {
  name: (object: ClusterProfile) => object.getName(),
  tier: (object: ClusterProfile) => object.spec?.tier ?? -1,
  syncMode: (object: ClusterProfile) => getCpSyncMode(object),
  selector: (object: ClusterProfile) => getCpClusterSelector(object),
  age: (object: ClusterProfile) => object.getCreationTimestamp(),
};

const clusterProfileTableHeader: {
  title: string;
  sortBy: keyof typeof clusterProfileSortingCallbacks;
  className?: string;
}[] = [
  { title: "Name", sortBy: "name", className: "name" },
  { title: "Tier", sortBy: "tier", className: "tier" },
  { title: "Sync Mode", sortBy: "syncMode", className: "syncMode" },
  { title: "Cluster Selector", sortBy: "selector", className: "selector" },
  { title: "Age", sortBy: "age", className: "age" },
];

function renderClusterProfileRow(object: ClusterProfile): React.ReactNode[] {
  return [
    <WithTooltip key="name">{object.getName()}</WithTooltip>,
    <span key="tier" className={styles.tierBadge}>
      {getCpTier(object)}
    </span>,
    <WithTooltip key="syncMode">{getCpSyncMode(object)}</WithTooltip>,
    <WithTooltip key="selector">{getCpClusterSelector(object)}</WithTooltip>,
    <KubeObjectAge key="age" object={object} />,
  ];
}

// ─── Profile helpers ──────────────────────────────────────────────────────────

const getPTier = (object: Profile): string => {
  const tier = object.spec?.tier;
  return tier === undefined || tier === null ? "-" : String(tier);
};

const getPSyncMode = (object: Profile): string => object.spec?.syncMode ?? "-";

const getPClusterSelector = (object: Profile): string => formatClusterSelector(object.spec?.clusterSelector);

const profileSearchFilters = [
  (object: Profile) => [
    object.getName(),
    object.getNs() ?? "",
    getPTier(object),
    getPSyncMode(object),
    getPClusterSelector(object),
  ],
];

const profileSortingCallbacks = {
  name: (object: Profile) => object.getName(),
  namespace: (object: Profile) => object.getNs() ?? "",
  tier: (object: Profile) => object.spec?.tier ?? -1,
  syncMode: (object: Profile) => getPSyncMode(object),
  selector: (object: Profile) => getPClusterSelector(object),
  age: (object: Profile) => object.getCreationTimestamp(),
};

const profileTableHeader: {
  title: string;
  sortBy: keyof typeof profileSortingCallbacks;
  className?: string;
}[] = [
  { title: "Name", sortBy: "name", className: "name" },
  { title: "Namespace", sortBy: "namespace", className: "namespace" },
  { title: "Tier", sortBy: "tier", className: "tier" },
  { title: "Sync Mode", sortBy: "syncMode", className: "syncMode" },
  { title: "Cluster Selector", sortBy: "selector", className: "selector" },
  { title: "Age", sortBy: "age", className: "age" },
];

function renderProfileRow(object: Profile): React.ReactNode[] {
  return [
    <WithTooltip key="name">{object.getName()}</WithTooltip>,
    <NamespaceSelectBadge key="ns" namespace={object.getNs() ?? ""} />,
    <span key="tier" className={styles.tierBadge}>
      {getPTier(object)}
    </span>,
    <WithTooltip key="syncMode">{getPSyncMode(object)}</WithTooltip>,
    <WithTooltip key="selector">{getPClusterSelector(object)}</WithTooltip>,
    <KubeObjectAge key="age" object={object} />,
  ];
}

// ─── Page component ───────────────────────────────────────────────────────────

export const ProfilesPage: React.FC<ProfilesPageProps> = observer(({ extension: _extension }) => {
  const [activeTab, setActiveTab] = useState<ProfileTab>("cluster-profiles");
  const [apisReady, setApisReady] = useState(false);
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

      // Load ClusterProfile store (cluster-scoped)
      try {
        const cpStore = ClusterProfile.getStore();
        if (cpStore) {
          await cpStore.loadAll({ namespaces, reqInit: { signal: controller.signal } });
          if (isMounted) watches.current.push(cpStore.subscribe());
        }
      } catch (e) {
        console.debug("[sveltos-profiles] ClusterProfile store unavailable:", e);
      }

      // Load Profile store (namespaced)
      try {
        const pStore = Profile.getStore();
        if (pStore) {
          await pStore.loadAll({ namespaces, reqInit: { signal: controller.signal } });
          if (isMounted) watches.current.push(pStore.subscribe());
        }
      } catch (e) {
        console.debug("[sveltos-profiles] Profile store unavailable:", e);
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

  let clusterProfileStore: Renderer.K8sApi.KubeObjectStore<ClusterProfile> | null = null;
  let profileStore: Renderer.K8sApi.KubeObjectStore<Profile> | null = null;

  if (apisReady) {
    try {
      clusterProfileStore = ClusterProfile.getStore() as Renderer.K8sApi.KubeObjectStore<ClusterProfile>;
    } catch {
      // not available
    }
    try {
      profileStore = Profile.getStore() as Renderer.K8sApi.KubeObjectStore<Profile>;
    } catch {
      // not available
    }
  }

  return (
    <div className={styles.profilesPage}>
      <style>{pageInlineStyles}</style>

      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === "cluster-profiles" ? styles.active : ""}`}
          onClick={() => setActiveTab("cluster-profiles")}
        >
          Cluster Profiles
        </button>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === "profiles" ? styles.active : ""}`}
          onClick={() => setActiveTab("profiles")}
        >
          Profiles
        </button>
      </div>

      <div className={styles.tabContent}>
        {activeTab === "cluster-profiles" && apisReady && clusterProfileStore && (
          <KubeObjectListLayout<ClusterProfile, ClusterProfileApi>
            className={styles.tabContent}
            tableId="sveltosClusterProfilesTable"
            store={clusterProfileStore}
            renderHeaderTitle={ClusterProfile.crd.title}
            sortingCallbacks={clusterProfileSortingCallbacks}
            searchFilters={clusterProfileSearchFilters}
            renderTableHeader={clusterProfileTableHeader}
            renderTableContents={renderClusterProfileRow}
          />
        )}
        {activeTab === "cluster-profiles" && apisReady && !clusterProfileStore && (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateCard}>
              <h2>ClusterProfile CRD not found</h2>
              <p>
                The ClusterProfile CRD is not installed on this cluster. Install Sveltos to manage cluster profiles.
              </p>
            </div>
          </div>
        )}
        {activeTab === "profiles" && apisReady && profileStore && (
          <KubeObjectListLayout<Profile, ProfileApi>
            className={styles.tabContent}
            tableId="sveltosProfilesTable"
            store={profileStore}
            renderHeaderTitle={Profile.crd.title}
            sortingCallbacks={profileSortingCallbacks}
            searchFilters={profileSearchFilters}
            renderTableHeader={profileTableHeader}
            renderTableContents={renderProfileRow}
          />
        )}
        {activeTab === "profiles" && apisReady && !profileStore && (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateCard}>
              <h2>Profile CRD not found</h2>
              <p>The Profile CRD is not installed on this cluster. Install Sveltos to manage namespaced profiles.</p>
            </div>
          </div>
        )}
        {!apisReady && (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateCard}>
              <p>Loading profiles…</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
