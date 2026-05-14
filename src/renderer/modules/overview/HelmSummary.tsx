/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
// transpiled .tsx code must have `React` symbol in the scope
// @ts-ignore

import { Renderer } from "@freelensapp/extensions";
import React from "react";
import styles from "./Overview.module.scss";

const { Component } = Renderer;

interface HelmSummaryProps {
  clusterProfiles: number;
  profiles: number;
  clusterSummaries: number;
  pullModeClusters: number;
  clustersByNamespace: Record<string, number>;
}

export const HelmSummary: React.FC<HelmSummaryProps> = ({
  clusterProfiles,
  profiles,
  clusterSummaries,
  pullModeClusters,
  clustersByNamespace,
}) => {
  return (
    <div className={styles.overviewSection}>
      <h2>
        <Component.Icon material="settings" />
        Resource Summary
      </h2>

      <div className={styles.deploymentGrid}>
        <div className={styles.deploymentCard}>
          <div className={styles.deploymentCardHeader}>
            <Component.Icon material="layers" />
            <span>Cluster Profiles</span>
          </div>
          <div className={styles.deploymentCardValue}>{clusterProfiles}</div>
          <div className={styles.deploymentCardDesc}>global policy definitions</div>
        </div>

        <div className={styles.deploymentCard}>
          <div className={styles.deploymentCardHeader}>
            <Component.Icon material="description" />
            <span>Profiles</span>
          </div>
          <div className={styles.deploymentCardValue}>{profiles}</div>
          <div className={styles.deploymentCardDesc}>namespaced policy definitions</div>
        </div>

        <div className={styles.deploymentCard}>
          <div className={styles.deploymentCardHeader}>
            <Component.Icon material="assignment" />
            <span>Cluster Summaries</span>
          </div>
          <div className={styles.deploymentCardValue}>{clusterSummaries}</div>
          <div className={styles.deploymentCardDesc}>profile-to-cluster status entries</div>
        </div>

        <div className={styles.deploymentCard}>
          <div className={styles.deploymentCardHeader}>
            <Component.Icon material="sync_alt" />
            <span>Pull Mode Clusters</span>
          </div>
          <div className={styles.deploymentCardValue}>{pullModeClusters}</div>
          <div className={styles.deploymentCardDesc}>agent-based management clusters</div>
        </div>

        {Object.keys(clustersByNamespace).length > 0 && (
          <div className={`${styles.deploymentCard} ${styles.fullWidth}`}>
            <div className={styles.deploymentCardHeader}>
              <Component.Icon material="view_list" />
              <span>Clusters by Namespace</span>
            </div>
            <div className={styles.namespaceList}>
              {Object.entries(clustersByNamespace).map(([ns, count]) => (
                <div key={ns} className={styles.namespaceItem}>
                  <span className={styles.namespaceName}>{ns || "default"}</span>
                  <span className={styles.namespaceCount}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
