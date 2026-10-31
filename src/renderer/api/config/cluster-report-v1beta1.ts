import { Renderer } from "@freelensapp/extensions";

import type { ResourceReport, SveltosKubeObjectCRD } from "../types";

export interface ReleaseReport {
  chartName: string;
  releaseNamespace: string;
  chartVersion: string;
  action?: string;
  message?: string;
}

export interface ClusterReportSpec {
  clusterNamespace: string;
  clusterName: string;
}

export interface ClusterReportStatus {
  releaseReports?: ReleaseReport[];
  helmResourceReports?: ResourceReport[];
  resourceReports?: ResourceReport[];
  kustomizeResourceReports?: ResourceReport[];
}

/** Dry run outcome: what Sveltos would change on a matching cluster. */
export class ClusterReport extends Renderer.K8sApi.LensExtensionKubeObject<
  Renderer.K8sApi.KubeObjectMetadata,
  ClusterReportStatus,
  ClusterReportSpec
> {
  static readonly kind = "ClusterReport";
  static readonly namespaced = true;
  static readonly apiBase = "/apis/config.projectsveltos.io/v1beta1/clusterreports";

  static readonly crd: SveltosKubeObjectCRD = {
    apiVersions: ["config.projectsveltos.io/v1beta1"],
    plural: "clusterreports",
    singular: "clusterreport",
    title: "Dry Run",
  };

  static getAllResourceReports(object: ClusterReport): ResourceReport[] {
    return [
      ...(object.status?.resourceReports ?? []),
      ...(object.status?.kustomizeResourceReports ?? []),
      ...(object.status?.helmResourceReports ?? []),
    ];
  }

  static getChangeCount(object: ClusterReport): number {
    return (object.status?.releaseReports ?? []).length + ClusterReport.getAllResourceReports(object).length;
  }
}

export class ClusterReportApi extends Renderer.K8sApi.KubeApi<ClusterReport> {}
export class ClusterReportStore extends Renderer.K8sApi.KubeObjectStore<ClusterReport, ClusterReportApi> {}
