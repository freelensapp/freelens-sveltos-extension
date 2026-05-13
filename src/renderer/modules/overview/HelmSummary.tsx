/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
// transpiled .tsx code must have `React` symbol in the scope
// @ts-ignore

import { Renderer } from "@freelensapp/extensions";
import React from "react";

const { Component } = Renderer;

interface HelmSummaryProps {
  totalReleases: number;
  clustersByNamespace: Record<string, number>;
}

export const HelmSummary: React.FC<HelmSummaryProps> = ({ totalReleases, clustersByNamespace }) => {
  return (
    <div className="overview-section">
      <h2>
        <Component.Icon material="settings" />
        Deployment Summary
      </h2>

      <div className="deployment-grid">
        <div className="deployment-card">
          <div className="deployment-card-header">
            <Component.Icon material="layers" />
            <span>Helm Releases</span>
          </div>
          <div className="deployment-card-value">{totalReleases}</div>
          <div className="deployment-card-desc">deployed releases</div>
        </div>

        <div className="deployment-card">
          <div className="deployment-card-header">
            <Component.Icon material="folder" />
            <span>Namespaces</span>
          </div>
          <div className="deployment-card-value">{Object.keys(clustersByNamespace).length}</div>
          <div className="deployment-card-desc">with clusters</div>
        </div>

        {Object.keys(clustersByNamespace).length > 0 && (
          <div className="deployment-card full-width">
            <div className="deployment-card-header">
              <Component.Icon material="view_list" />
              <span>Clusters by Namespace</span>
            </div>
            <div className="namespace-list">
              {Object.entries(clustersByNamespace).map(([ns, count]) => (
                <div key={ns} className="namespace-item">
                  <span className="namespace-name">{ns || "default"}</span>
                  <span className="namespace-count">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
