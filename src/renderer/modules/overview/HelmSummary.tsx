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
  totalReleases: number;
  clustersByNamespace: Record<string, number>;
}

export const HelmSummary: React.FC<HelmSummaryProps> = ({ totalReleases, clustersByNamespace }) => {
  return (
    <div className={styles.overviewSection}>
      <h2>
        <Component.Icon material="settings" />
        Deployment Summary
      </h2>

      <div className={styles.deploymentGrid}>
        <div className={styles.deploymentCard}>
          <div className={styles.deploymentCardHeader}>
            <Component.Icon material="layers" />
            <span>Helm Releases</span>
          </div>
          <div className={styles.deploymentCardValue}>{totalReleases}</div>
          <div className={styles.deploymentCardDesc}>deployed releases</div>
        </div>

        <div className={styles.deploymentCard}>
          <div className={styles.deploymentCardHeader}>
            <Component.Icon material="folder" />
            <span>Namespaces</span>
          </div>
          <div className={styles.deploymentCardValue}>{Object.keys(clustersByNamespace).length}</div>
          <div className={styles.deploymentCardDesc}>with clusters</div>
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
