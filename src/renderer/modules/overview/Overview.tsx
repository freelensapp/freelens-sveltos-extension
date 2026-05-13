/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
// transpiled .tsx code must have `React` symbol in the scope
// @ts-ignore

import { Renderer } from "@freelensapp/extensions";
import React from "react";
import { ClusterSummary } from "./ClusterSummary";
import { EventsSummary } from "./EventsSummary";
import { HelmSummary } from "./HelmSummary";
import styles from "./Overview.module.scss";
import styleInline from "./Overview.module.scss?inline";
import { StatsCard } from "./StatsCard";
import { useOverviewData } from "./useOverviewData";

const { Component } = Renderer;

export interface OverviewProps {
  extension: Renderer.LensExtension;
}

export const Overview: React.FC<OverviewProps> = ({ extension: _extension }) => {
  const data = useOverviewData();

  if (data.error) {
    return (
      <div className={styles.overviewError}>
        <Component.Icon material="error" />
        <p>Error loading overview data: {data.error.message}</p>
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
        {data.isLoading && <Component.Icon material="hourglass_empty" className={styles.spinning} />}
      </div>

      <div className={styles.overviewGrid}>
        <div className={styles.statsRow}>
          <StatsCard
            title="ClusterAPI Clusters"
            value={data.clusters.capiTotal}
            subValue={data.clusters.capiReady}
            subLabel="Ready"
            icon="cloud"
            color="blue"
          />
          <StatsCard
            title="Sveltos Clusters"
            value={data.clusters.sveltosTotal}
            subValue={data.clusters.sveltosReady}
            subLabel="Ready"
            icon="cloud_queue"
            color="purple"
          />
          <StatsCard title="Helm Releases" value={data.helm.totalReleases} icon="layers" color="green" />
          <StatsCard title="Events" value={data.events.totalEvents} icon="event" color="orange" />
        </div>

        <ClusterSummary
          capiTotal={data.clusters.capiTotal}
          capiReady={data.clusters.capiReady}
          sveltosTotal={data.clusters.sveltosTotal}
          sveltosReady={data.clusters.sveltosReady}
        />

        <HelmSummary totalReleases={data.helm.totalReleases} clustersByNamespace={data.clustersByNamespace} />

        <EventsSummary events={data.events} />
      </div>
    </div>
  );
};
