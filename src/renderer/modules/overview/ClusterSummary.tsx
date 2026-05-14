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

interface ClusterSummaryProps {
  capiTotal: number;
  capiReady: number;
  sveltosTotal: number;
  sveltosReady: number;
}

export const ClusterSummary: React.FC<ClusterSummaryProps> = ({ capiTotal, capiReady, sveltosTotal, sveltosReady }) => {
  const capiHealthPercent = capiTotal > 0 ? Math.round((capiReady / capiTotal) * 100) : 0;
  const sveltosHealthPercent = sveltosTotal > 0 ? Math.round((sveltosReady / sveltosTotal) * 100) : 0;

  return (
    <div className={styles.overviewSection}>
      <h2>
        <Component.Icon material="cloud" />
        Cluster Overview
      </h2>

      <div className={styles.clusterSummary}>
        <div className={styles.clusterSummaryItem}>
          <div className={styles.clusterSummaryTitle}>
            <span>ClusterAPI Clusters</span>
          </div>
          <div className={styles.clusterSummaryStats}>
            <div className={styles.clusterStat}>
              <span className={styles.statLabel}>Total</span>
              <span className={styles.statValue}>{capiTotal}</span>
            </div>
            <div className={styles.clusterStat}>
              <span className={styles.statLabel}>Ready</span>
              <span className={`${styles.statValue} ${styles.statReady}`}>{capiReady}</span>
            </div>
            <div className={styles.clusterStat}>
              <span className={styles.statLabel}>Health</span>
              <span className={`${styles.statHealth} ${capiHealthPercent >= 80 ? styles.healthy : styles.warning}`}>
                {capiHealthPercent}%
              </span>
            </div>
          </div>
        </div>

        <div className={styles.clusterSummaryItem}>
          <div className={styles.clusterSummaryTitle}>
            <span>Sveltos Clusters</span>
          </div>
          <div className={styles.clusterSummaryStats}>
            <div className={styles.clusterStat}>
              <span className={styles.statLabel}>Total</span>
              <span className={styles.statValue}>{sveltosTotal}</span>
            </div>
            <div className={styles.clusterStat}>
              <span className={styles.statLabel}>Ready</span>
              <span className={`${styles.statValue} ${styles.statReady}`}>{sveltosReady}</span>
            </div>
            <div className={styles.clusterStat}>
              <span className={styles.statLabel}>Health</span>
              <span className={`${styles.statHealth} ${sveltosHealthPercent >= 80 ? styles.healthy : styles.warning}`}>
                {sveltosHealthPercent}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
