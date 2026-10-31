import { describe, expect, it } from "vitest";
import { filterHelmResources, groupHelmResources } from "./helm-resources";

const resources = [
  { apiVersion: "apps/v1", kind: "Deployment", name: "web", namespace: "app" },
  { apiVersion: "v1", kind: "Service", name: "web", namespace: "app" },
  { apiVersion: "v1", kind: "ServiceAccount", name: "web", namespace: "app" },
  { apiVersion: "rbac.authorization.k8s.io/v1", kind: "ClusterRole", name: "web" },
  { apiVersion: "apiextensions.k8s.io/v1", kind: "CustomResourceDefinition", name: "widgets.example.com" },
  { apiVersion: "monitoring.coreos.com/v1", kind: "ServiceMonitor", name: "web", namespace: "app" },
  { apiVersion: "apps/v1", kind: "Deployment", name: "api", namespace: "app" },
  { apiVersion: "v1", kind: "ConfigMap", name: "settings", namespace: "app" },
];

describe("groupHelmResources", () => {
  it("groups resources by category in install order", () => {
    const groups = groupHelmResources(resources);

    expect(groups.map((group) => group.id)).toEqual(["crds", "rbac", "config", "network", "workloads", "custom"]);
    expect(groups.map((group) => group.count)).toEqual([1, 2, 1, 1, 2, 1]);
  });

  it("orders kinds inside a category and sorts resources by name", () => {
    const groups = groupHelmResources(resources);
    const rbac = groups.find((group) => group.id === "rbac");
    const workloads = groups.find((group) => group.id === "workloads");

    expect(rbac?.kinds.map((kind) => kind.kind)).toEqual(["ServiceAccount", "ClusterRole"]);
    expect(workloads?.kinds[0]).toMatchObject({ kind: "Deployment", apiVersions: ["apps/v1"] });
    expect(workloads?.kinds[0].resources.map((resource) => resource.name)).toEqual(["api", "web"]);
  });

  it("puts unknown kinds under custom resources", () => {
    const custom = groupHelmResources(resources).find((group) => group.id === "custom");

    expect(custom?.kinds.map((kind) => kind.kind)).toEqual(["ServiceMonitor"]);
  });

  it("returns nothing for an empty manifest", () => {
    expect(groupHelmResources([])).toEqual([]);
  });
});

describe("filterHelmResources", () => {
  it("matches every word against kind, name and namespace", () => {
    expect(filterHelmResources(resources, "deployment web").map((resource) => resource.name)).toEqual(["web"]);
    expect(filterHelmResources(resources, "APP settings")).toHaveLength(1);
    expect(filterHelmResources(resources, "  ")).toBe(resources);
  });
});
