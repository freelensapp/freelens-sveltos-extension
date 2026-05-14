/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { CapiCluster, CapiClusterApi } from "../k8s/clusterapi/cluster-v1beta1";
import { ClusterProfile, ClusterProfileApi } from "../k8s/projectsveltos/clusterprofile-v1beta1";
import {
  ClusterSummaryApi,
  ClusterSummary as ClusterSummaryResource,
} from "../k8s/projectsveltos/clustersummary-v1beta1";
import { EventTrigger, EventTriggerApi } from "../k8s/projectsveltos/eventtrigger-v1beta1";
import { Profile, ProfileApi } from "../k8s/projectsveltos/profile-v1beta1";
import { SveltosCluster, SveltosClusterApi } from "../k8s/projectsveltos/sveltoscluster-v1beta1";

let apisRegistered = false;

/**
 * Register all Sveltos and ClusterAPI KubeApi instances with the apiManager.
 * Must be called inside a cluster-frame context (e.g., inside a React component's useEffect or render body),
 * never at module-load time.
 */
export function ensureApisRegistered(): void {
  if (apisRegistered) return;

  new ClusterProfileApi({ objectConstructor: ClusterProfile });
  new ProfileApi({ objectConstructor: Profile });
  new ClusterSummaryApi({ objectConstructor: ClusterSummaryResource });
  new EventTriggerApi({ objectConstructor: EventTrigger });
  new SveltosClusterApi({ objectConstructor: SveltosCluster });
  new CapiClusterApi({ objectConstructor: CapiCluster });

  apisRegistered = true;
}
