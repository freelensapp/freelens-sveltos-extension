import { describe, expect, it } from "vitest";
import { filterAddons, getAddons, isProvisioning } from "./addons";
import { ClusterConfiguration } from "./config/cluster-configuration-v1beta1";
import { ClusterSummary } from "./config/cluster-summary-v1beta1";

const buildConfiguration = (
  charts: { releaseName: string; namespace: string; icon?: string; version?: string; appVersion?: string }[],
) =>
  new ClusterConfiguration({
    apiVersion: "config.projectsveltos.io/v1beta1",
    kind: "ClusterConfiguration",
    metadata: {
      name: "sveltos--workload",
      namespace: "mgmt",
      labels: { "projectsveltos.io/cluster-name": "workload" },
      selfLink: "/apis/config.projectsveltos.io/v1beta1/namespaces/mgmt/clusterconfigurations/sveltos--workload",
    },
    status: {
      clusterProfileResources: [
        {
          clusterProfileName: "kyverno",
          Features: [
            {
              featureID: "Helm",
              charts: charts.map((chart) => ({
                repoURL: "https://charts.example.com",
                releaseName: chart.releaseName,
                namespace: chart.namespace,
                chartVersion: chart.version ?? "1.0.0",
                appVersion: chart.appVersion,
                icon: chart.icon,
                lastAppliedTime: "2026-01-01T10:00:00Z",
              })),
            },
          ],
        },
      ],
    },
  });

const buildSummary = (data: Partial<ClusterSummary>) =>
  new ClusterSummary({
    apiVersion: "config.projectsveltos.io/v1beta1",
    kind: "ClusterSummary",
    metadata: {
      name: "summary",
      namespace: "mgmt",
      selfLink: "/apis/config.projectsveltos.io/v1beta1/namespaces/mgmt/clustersummaries/summary",
      ownerReferences: [
        { apiVersion: "config.projectsveltos.io/v1beta1", kind: "ClusterProfile", name: "kyverno", uid: "1" },
      ],
    },
    spec: { clusterNamespace: "mgmt", clusterName: "workload", clusterType: "Sveltos" },
    ...data,
  });

describe("getAddons", () => {
  it("maps helm release summaries to add-ons", () => {
    const addons = getAddons([
      buildSummary({
        status: {
          featureSummaries: [{ featureID: "Helm", status: "Provisioned" }],
          helmReleaseSummaries: [
            {
              releaseName: "kyverno-latest",
              releaseNamespace: "kyverno",
              status: "Managing",
              chartVersion: "3.1.4",
              repoURL: "https://kyverno.github.io/kyverno",
            },
          ],
        },
      }),
    ]);

    expect(addons).toHaveLength(1);
    expect(addons[0]).toMatchObject({
      type: "Helm",
      name: "kyverno-latest",
      namespace: "kyverno",
      version: "3.1.4",
      clusterName: "workload",
      profile: "kyverno",
      status: "Provisioned",
    });
  });

  it("completes a release summary with the chart declared in the profile", () => {
    const [addon] = getAddons([
      buildSummary({
        spec: {
          clusterNamespace: "mgmt",
          clusterName: "workload",
          clusterType: "Sveltos",
          clusterProfileSpec: {
            helmCharts: [
              {
                repositoryURL: "https://kiali.org/helm-charts",
                repositoryName: "kiali",
                chartName: "kiali-server",
                releaseName: "kiali",
                releaseNamespace: "istio-system",
                chartVersion: "2.31.0",
              },
            ],
          },
        },
        status: {
          featureSummaries: [{ featureID: "Helm", status: "Provisioned" }],
          // Older Sveltos releases omit chartName, repoURL and chartVersion here.
          helmReleaseSummaries: [{ releaseName: "kiali", releaseNamespace: "istio-system", status: "Managing" }],
        },
      }),
    ]);

    expect(addon).toMatchObject({
      name: "kiali",
      chartName: "kiali-server",
      repositoryURL: "https://kiali.org/helm-charts",
      version: "2.31.0",
      status: "Provisioned",
    });
  });

  it("takes the chart logo and rollout time from the ClusterConfiguration", () => {
    const [addon] = getAddons(
      [
        buildSummary({
          status: {
            featureSummaries: [{ featureID: "Helm", status: "Provisioned" }],
            helmReleaseSummaries: [{ releaseName: "kiali", releaseNamespace: "istio-system", status: "Managing" }],
          },
        }),
      ],
      [
        buildConfiguration([
          {
            releaseName: "kiali",
            namespace: "istio-system",
            icon: "https://example.com/kiali.svg",
            appVersion: "1.2.3",
          },
        ]),
      ],
    );

    expect(addon).toMatchObject({
      name: "kiali",
      icon: "https://example.com/kiali.svg",
      version: "1.0.0",
      appVersion: "1.2.3",
      lastAppliedTime: "2026-01-01T10:00:00Z",
    });
  });

  it("leaves the logo unset when no chart matches the release", () => {
    const [addon] = getAddons(
      [
        buildSummary({
          status: {
            featureSummaries: [{ featureID: "Helm", status: "Provisioned" }],
            helmReleaseSummaries: [{ releaseName: "kiali", releaseNamespace: "istio-system", status: "Managing" }],
          },
        }),
      ],
      [buildConfiguration([{ releaseName: "other", namespace: "default", icon: "https://example.com/other.svg" }])],
    );

    expect(addon.icon).toBeUndefined();
  });

  it("flags releases with a newer chart published upstream", () => {
    const addons = getAddons([
      buildSummary({
        status: {
          featureSummaries: [{ featureID: "Helm", status: "Provisioned" }],
          helmReleaseSummaries: [
            { releaseName: "a", releaseNamespace: "ns", status: "Managing", latestVersion: "2.0.0" },
            { releaseName: "b", releaseNamespace: "ns", status: "Managing", latestPatchVersion: "1.0.1" },
            { releaseName: "c", releaseNamespace: "ns", status: "Managing", lastCheckedTime: "2026-01-01T10:00:00Z" },
            { releaseName: "d", releaseNamespace: "ns", status: "Managing" },
            { releaseName: "e", releaseNamespace: "ns", status: "Conflict", latestVersion: "2.0.0" },
          ],
        },
      }),
    ]);

    expect(addons.map((addon) => addon.updateAvailable)).toEqual([true, true, false, undefined, undefined]);
    expect(filterAddons(addons, "All", "update: outdated")).toHaveLength(2);
  });

  it("surfaces a conflicting release with its message", () => {
    const [addon] = getAddons([
      buildSummary({
        status: {
          featureSummaries: [{ featureID: "Helm", status: "Provisioned" }],
          helmReleaseSummaries: [
            {
              releaseName: "nginx",
              releaseNamespace: "web",
              status: "Conflict",
              conflictMessage: "managed by another profile",
            },
          ],
        },
      }),
    ]);

    expect(addon.status).toBe("Conflict");
    expect(addon.message).toBe("managed by another profile");
  });

  it("reports charts declared in the profile but not deployed yet", () => {
    const [addon] = getAddons([
      buildSummary({
        spec: {
          clusterNamespace: "mgmt",
          clusterName: "workload",
          clusterType: "Sveltos",
          clusterProfileSpec: {
            helmCharts: [
              {
                repositoryURL: "https://charts.example.com",
                releaseName: "pending",
                releaseNamespace: "default",
                chartVersion: "1.0.0",
              },
            ],
          },
        },
      }),
    ]);

    expect(addon).toMatchObject({ type: "Helm", name: "pending", status: "Provisioning" });
  });

  it("reports a chart added to an already provisioned profile as provisioning", () => {
    const addons = getAddons([
      buildSummary({
        spec: {
          clusterNamespace: "mgmt",
          clusterName: "workload",
          clusterType: "Sveltos",
          clusterProfileSpec: {
            helmCharts: [
              { repositoryURL: "https://charts.example.com", releaseName: "nginx", releaseNamespace: "web" },
              { repositoryURL: "https://charts.example.com", releaseName: "redis", releaseNamespace: "data" },
            ],
          },
        },
        status: {
          featureSummaries: [{ featureID: "Helm", status: "Provisioned", lastAppliedTime: "2026-01-01T10:00:00Z" }],
          helmReleaseSummaries: [{ releaseName: "nginx", releaseNamespace: "web", status: "Managing" }],
        },
      }),
    ]);

    expect(addons.map(({ name, status }) => ({ name, status }))).toEqual([
      { name: "nginx", status: "Provisioned" },
      { name: "redis", status: "Provisioning" },
    ]);
    expect(addons[1].lastAppliedTime).toBeUndefined();
  });

  it("reports a release without a feature status yet as provisioning", () => {
    const [addon] = getAddons([
      buildSummary({
        status: { helmReleaseSummaries: [{ releaseName: "nginx", releaseNamespace: "web", status: "Managing" }] },
      }),
    ]);

    expect(addon.status).toBe("Provisioning");
    expect(isProvisioning(addon.status)).toBe(true);
  });

  it("explains add-ons blocked by dependsOn with the dependency message", () => {
    const [addon] = getAddons([
      buildSummary({
        spec: {
          clusterNamespace: "mgmt",
          clusterName: "workload",
          clusterType: "Sveltos",
          clusterProfileSpec: {
            dependsOn: ["cert-manager"],
            helmCharts: [{ repositoryURL: "https://charts.example.com", releaseName: "app", releaseNamespace: "app" }],
          },
        },
        status: {
          dependencies: "ClusterProfile cert-manager is not provisioned yet",
          featureSummaries: [{ featureID: "Helm", status: "Blocked" }],
        },
      }),
    ]);

    expect(addon).toMatchObject({
      status: "Blocked",
      message: "ClusterProfile cert-manager is not provisioned yet",
    });
    expect(isProvisioning(addon.status)).toBe(true);
  });

  it("skips declared charts whose release name is still a template", () => {
    const addons = getAddons([
      buildSummary({
        spec: {
          clusterNamespace: "mgmt",
          clusterName: "workload",
          clusterType: "Sveltos",
          clusterProfileSpec: {
            helmCharts: [
              {
                repositoryURL: "https://charts.example.com",
                releaseName: "uptime-kuma",
                releaseNamespace: '{{ index .Cluster.metadata.annotations "namespace" }}',
                chartVersion: "{{ .Cluster.metadata.labels.version }}",
              },
            ],
          },
        },
        status: {
          featureSummaries: [{ featureID: "Helm", status: "Provisioned" }],
          helmReleaseSummaries: [
            { releaseName: "uptime-kuma", releaseNamespace: "monitoring", status: "Managing", chartVersion: "4.1.0" },
          ],
        },
      }),
    ]);

    expect(addons).toHaveLength(1);
    expect(addons[0]).toMatchObject({ name: "uptime-kuma", namespace: "monitoring", version: "4.1.0" });
  });

  it("hides the summaries left behind by a cluster that no longer exists", () => {
    const summaries = [
      buildSummary({
        status: {
          featureSummaries: [{ featureID: "Helm", status: "Provisioned" }],
          helmReleaseSummaries: [{ releaseName: "nginx", releaseNamespace: "web", status: "Managing" }],
        },
      }),
    ];

    expect(getAddons(summaries, [], new Set(["mgmt/workload"]))).toHaveLength(1);
    expect(getAddons(summaries, [], new Set(["mgmt/other"]))).toHaveLength(0);
    // An empty set means the clusters have not loaded yet, so nothing is hidden.
    expect(getAddons(summaries, [], new Set())).toHaveLength(1);
  });

  it("hides a summary that is being deleted", () => {
    const summary = buildSummary({
      metadata: {
        name: "summary",
        namespace: "mgmt",
        selfLink: "/apis/config.projectsveltos.io/v1beta1/namespaces/mgmt/clustersummaries/summary",
        deletionTimestamp: "2026-01-01T10:00:00Z",
      },
      status: {
        featureSummaries: [{ featureID: "Helm", status: "Removing" }],
        helmReleaseSummaries: [{ releaseName: "nginx", releaseNamespace: "web", status: "Managing" }],
      },
    });

    expect(getAddons([summary])).toHaveLength(0);
  });

  it("maps deployed group version kinds to resource add-ons", () => {
    const addons = getAddons([
      buildSummary({
        status: {
          featureSummaries: [{ featureID: "Resources", status: "Provisioned" }],
          deployedGVKs: [{ featureID: "Resources", deployedGroupVersionKind: ["Deployment.v1.apps", "Service.v1."] }],
        },
      }),
    ]);

    expect(addons.map((addon) => addon.name)).toEqual(["Deployment.v1.apps", "Service.v1."]);
    expect(addons.every((addon) => addon.type === "Resources")).toBe(true);
  });

  it("falls back to policy refs when nothing is deployed yet", () => {
    const [addon] = getAddons([
      buildSummary({
        spec: {
          clusterNamespace: "mgmt",
          clusterName: "workload",
          clusterType: "Sveltos",
          clusterProfileSpec: {
            policyRefs: [{ kind: "ConfigMap", namespace: "default", name: "policies", path: "" }],
          },
        },
      }),
    ]);

    expect(addon).toMatchObject({
      type: "Resources",
      name: "policies",
      namespace: "default",
      status: "Provisioning",
    });
  });
});

describe("filterAddons", () => {
  const addons = getAddons([
    buildSummary({
      status: {
        featureSummaries: [{ featureID: "Helm", status: "Provisioned" }],
        helmReleaseSummaries: [{ releaseName: "kyverno", releaseNamespace: "kyverno", status: "Managing" }],
        deployedGVKs: [{ featureID: "Resources", deployedGroupVersionKind: ["Deployment.v1.apps"] }],
      },
    }),
  ]);

  it("filters by type", () => {
    expect(filterAddons(addons, "Helm", "")).toHaveLength(1);
    expect(filterAddons(addons, "Kustomize", "")).toHaveLength(0);
    expect(filterAddons(addons, "All", "")).toHaveLength(2);
  });

  it("filters by free text on every displayed field", () => {
    // Both add-ons share the "kyverno" profile, only one is the kyverno release.
    expect(filterAddons(addons, "All", "kyverno")).toHaveLength(2);
    expect(filterAddons(addons, "Helm", "kyverno")).toHaveLength(1);
    expect(filterAddons(addons, "All", "deployment")).toHaveLength(1);
    expect(filterAddons(addons, "All", "missing")).toHaveLength(0);
  });
});
