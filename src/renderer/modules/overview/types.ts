/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

export interface ClusterStats {
  capiTotal: number;
  capiReady: number;
  sveltosTotal: number;
  sveltosReady: number;
}

export interface HelmStats {
  totalReleases: number;
}

export interface EventStats {
  totalEvents: number;
  recentEvents: Array<{
    name: string;
    namespace: string;
    type: string;
    message: string;
    timestamp: string;
  }>;
}

export interface OverviewData {
  clusters: ClusterStats;
  helm: HelmStats;
  events: EventStats;
  clustersByNamespace: Record<string, number>;
  isLoading: boolean;
  error: Error | null;
}
