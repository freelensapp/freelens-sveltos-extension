/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
// transpiled .tsx code must have `React` symbol in the scope
// @ts-ignore

import { Renderer } from "@freelensapp/extensions";
import React from "react";

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
    <div className="overview-section">
      <h2>
        <Component.Icon material="cloud" />
        Cluster Overview
      </h2>

      <div className="cluster-summary">
        <div className="cluster-summary-item">
          <div className="cluster-summary-title">
            <span>ClusterAPI Clusters</span>
          </div>
          <div className="cluster-summary-stats">
            <div className="cluster-stat">
              <span className="stat-label">Total</span>
              <span className="stat-value">{capiTotal}</span>
            </div>
            <div className="cluster-stat">
              <span className="stat-label">Ready</span>
              <span className="stat-value stat-ready">{capiReady}</span>
            </div>
            <div className="cluster-stat">
              <span className="stat-label">Health</span>
              <span className={`stat-health ${capiHealthPercent >= 80 ? "healthy" : "warning"}`}>
                {capiHealthPercent}%
              </span>
            </div>
          </div>
        </div>

        <div className="cluster-summary-item">
          <div className="cluster-summary-title">
            <span>Sveltos Clusters</span>
          </div>
          <div className="cluster-summary-stats">
            <div className="cluster-stat">
              <span className="stat-label">Total</span>
              <span className="stat-value">{sveltosTotal}</span>
            </div>
            <div className="cluster-stat">
              <span className="stat-label">Ready</span>
              <span className="stat-value stat-ready">{sveltosReady}</span>
            </div>
            <div className="cluster-stat">
              <span className="stat-label">Health</span>
              <span className={`stat-health ${sveltosHealthPercent >= 80 ? "healthy" : "warning"}`}>
                {sveltosHealthPercent}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
