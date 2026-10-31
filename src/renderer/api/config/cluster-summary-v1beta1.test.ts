import { describe, expect, it } from "vitest";
import { ClusterSummary } from "./cluster-summary-v1beta1";

const buildSummary = (data: Partial<ClusterSummary>) =>
  new ClusterSummary({
    apiVersion: "config.projectsveltos.io/v1beta1",
    kind: "ClusterSummary",
    metadata: {
      name: "summary",
      namespace: "default",
      selfLink: "/apis/config.projectsveltos.io/v1beta1/namespaces/default/clustersummaries/summary",
    },
    ...data,
  });

describe("ClusterSummary", () => {
  it("finds the status of a single feature", () => {
    const summary = buildSummary({
      status: {
        featureSummaries: [
          { featureID: "Helm", status: "Provisioned" },
          { featureID: "Resources", status: "Provisioning" },
        ],
      },
    });

    expect(ClusterSummary.getFeatureStatus(summary, "Helm")).toBe("Provisioned");
    expect(ClusterSummary.getFeatureStatus(summary, "Kustomize")).toBeUndefined();
  });

  it("reports the worst feature status as the overall status", () => {
    expect(
      ClusterSummary.getOverallStatus(
        buildSummary({
          status: {
            featureSummaries: [
              { featureID: "Helm", status: "Provisioned" },
              { featureID: "Resources", status: "Failed" },
            ],
          },
        }),
      ),
    ).toBe("Failed");

    expect(
      ClusterSummary.getOverallStatus(
        buildSummary({ status: { featureSummaries: [{ featureID: "Helm", status: "Provisioned" }] } }),
      ),
    ).toBe("Provisioned");

    expect(ClusterSummary.getOverallStatus(buildSummary({ status: {} }))).toBeUndefined();
  });

  it("reports a fresh summary that declares add-ons as provisioning", () => {
    const summary = buildSummary({
      spec: {
        clusterNamespace: "default",
        clusterName: "workload",
        clusterType: "Sveltos",
        clusterProfileSpec: {
          helmCharts: [{ repositoryURL: "https://charts.example.com", releaseName: "nginx", releaseNamespace: "web" }],
        },
      },
      status: {},
    });

    expect(ClusterSummary.getOverallStatus(summary)).toBe("Provisioning");
  });

  it("reports summaries waiting for their dependencies as blocked", () => {
    expect(
      ClusterSummary.getOverallStatus(
        buildSummary({
          status: {
            featureSummaries: [
              { featureID: "Helm", status: "Blocked" },
              { featureID: "Resources", status: "Provisioned" },
            ],
          },
        }),
      ),
    ).toBe("Blocked");
  });

  it("resolves the owning profile name", () => {
    const summary = buildSummary({});
    summary.metadata.ownerReferences = [
      { apiVersion: "v1", kind: "ConfigMap", name: "other", uid: "1" },
      { apiVersion: "config.projectsveltos.io/v1beta1", kind: "ClusterProfile", name: "kyverno", uid: "2" },
    ];

    expect(ClusterSummary.getProfileName(summary)).toBe("kyverno");
  });
});
