import { CapiCluster } from "./capi/cluster-v1beta1";
import { SveltosCluster } from "./lib/sveltos-cluster-v1beta1";

/** Clusters Sveltos manages, `clusterType` matches `ClusterSummary.spec.clusterType`. */
export type AnyCluster = SveltosCluster | CapiCluster;
export type ClusterType = "Sveltos" | "Capi";

export const isCapi = (cluster: AnyCluster): cluster is CapiCluster => cluster.kind === CapiCluster.kind;

export const getReady = (cluster: AnyCluster) =>
  isCapi(cluster) ? CapiCluster.getReady(cluster) : SveltosCluster.getReady(cluster);

export const getConnectionStatus = (cluster: AnyCluster) =>
  isCapi(cluster) ? CapiCluster.getConnectionStatus(cluster) : SveltosCluster.getConnectionStatus(cluster);

export const getVersion = (cluster: AnyCluster) =>
  isCapi(cluster) ? CapiCluster.getVersion(cluster) : SveltosCluster.getVersion(cluster);

export const getPaused = (cluster: AnyCluster) =>
  isCapi(cluster) ? CapiCluster.getPaused(cluster) : SveltosCluster.getPaused(cluster);
