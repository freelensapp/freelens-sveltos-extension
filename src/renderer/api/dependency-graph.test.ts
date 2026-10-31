import { describe, expect, it } from "vitest";
import { buildDependencyGraph, getDependents, profileHealth, relatedNodes } from "./dependency-graph";

describe("buildDependencyGraph", () => {
  it("keeps only the profiles that take part in a dependency", () => {
    const graph = buildDependencyGraph([
      { name: "kyverno" },
      { name: "policies", dependsOn: ["kyverno"] },
      { name: "akhq" },
    ]);

    expect(graph.nodes.map((node) => node.id)).toEqual(["kyverno", "policies"]);
    expect(graph.edges).toEqual([{ from: "kyverno", to: "policies" }]);
    expect(graph.isolated.map((profile) => profile.name)).toEqual(["akhq"]);
  });

  it("places every profile one level after its deepest dependency", () => {
    const graph = buildDependencyGraph([
      { name: "c", dependsOn: ["a", "b"] },
      { name: "b", dependsOn: ["a"] },
      { name: "a" },
    ]);

    expect(graph.nodes.map((node) => [node.id, node.level])).toEqual([
      ["a", 0],
      ["b", 1],
      ["c", 2],
    ]);
  });

  it("numbers the rows within each level", () => {
    const graph = buildDependencyGraph([
      { name: "root" },
      { name: "left", dependsOn: ["root"] },
      { name: "right", dependsOn: ["root"] },
    ]);

    expect(graph.nodes.map((node) => [node.id, node.level, node.row])).toEqual([
      ["root", 0, 0],
      ["left", 1, 0],
      ["right", 1, 1],
    ]);
  });

  it("resolves names inside the namespace of the profile that declares them", () => {
    const graph = buildDependencyGraph([
      { name: "base", namespace: "team-a" },
      { name: "app", namespace: "team-a", dependsOn: ["base"] },
      { name: "app", namespace: "team-b", dependsOn: ["base"] },
    ]);

    expect(graph.edges).toEqual([
      { from: "team-a/base", to: "team-a/app" },
      { from: "team-b/base", to: "team-b/app" },
    ]);
    expect(graph.nodes.find((node) => node.id === "team-b/base")?.missing).toBe(true);
    expect(graph.nodes.find((node) => node.id === "team-a/base")?.missing).toBeUndefined();
  });

  it("ignores self references", () => {
    const graph = buildDependencyGraph([{ name: "a", dependsOn: ["a"] }]);

    expect(graph.nodes).toEqual([]);
    expect(graph.edges).toEqual([]);
    expect(graph.isolated.map((profile) => profile.name)).toEqual(["a"]);
  });

  it("shows dependencies on profiles that do not exist as missing nodes", () => {
    const graph = buildDependencyGraph([{ name: "app", dependsOn: ["cert-manager"] }]);

    expect(graph.nodes.map((node) => [node.id, node.level, node.missing ?? false])).toEqual([
      ["cert-manager", 0, true],
      ["app", 1, false],
    ]);
    expect(graph.levels).toBe(2);
  });

  it("places dependents next to their dependencies to keep edges short", () => {
    const graph = buildDependencyGraph([
      { name: "a" },
      { name: "b" },
      { name: "first", dependsOn: ["b"] },
      { name: "second", dependsOn: ["a"] },
    ]);

    expect(graph.nodes.map((node) => [node.id, node.row])).toEqual([
      ["a", 0],
      ["b", 1],
      ["second", 0],
      ["first", 1],
    ]);
  });

  it("terminates on a cycle", () => {
    const graph = buildDependencyGraph([
      { name: "a", dependsOn: ["b"] },
      { name: "b", dependsOn: ["a"] },
    ]);

    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges).toHaveLength(2);
    expect(graph.nodes.every((node) => node.inCycle)).toBe(true);
  });

  it("flags only the profiles inside a cycle", () => {
    const graph = buildDependencyGraph([
      { name: "root" },
      { name: "a", dependsOn: ["root", "b"] },
      { name: "b", dependsOn: ["a"] },
    ]);

    expect(graph.nodes.filter((node) => node.inCycle).map((node) => node.id)).toEqual(
      expect.arrayContaining(["a", "b"]),
    );
    expect(graph.nodes.find((node) => node.id === "root")?.inCycle).toBeUndefined();
  });
});

describe("relatedNodes", () => {
  it("collects every ancestor and descendant of a node", () => {
    const edges = [
      { from: "a", to: "b" },
      { from: "b", to: "c" },
      { from: "x", to: "y" },
      { from: "d", to: "b" },
    ];

    expect([...relatedNodes(edges, "b")].sort()).toEqual(["a", "b", "c", "d"]);
    expect([...relatedNodes(edges, "c")].sort()).toEqual(["a", "b", "c", "d"]);
    expect([...relatedNodes(edges, "a")].sort()).toEqual(["a", "b", "c"]);
  });
});

describe("getDependents", () => {
  it("finds the profiles that name a profile in dependsOn, in the same namespace", () => {
    const profiles = [
      { name: "base", namespace: "team" },
      { name: "app", namespace: "team", dependsOn: ["base"] },
      { name: "other", namespace: "elsewhere", dependsOn: ["base"] },
    ];

    expect(getDependents(profiles, "base", "team").map((profile) => profile.name)).toEqual(["app"]);
  });
});

describe("profileHealth", () => {
  it("summarizes the rollout state", () => {
    expect(profileHealth(undefined)).toBe("idle");
    expect(profileHealth({ matchingClusters: [{ name: "a" }] })).toBe("ok");
    expect(profileHealth({ matchingClusters: [{ name: "a" }], updatingClusters: { clusters: [{ name: "a" }] } })).toBe(
      "progress",
    );
    expect(
      profileHealth({ matchingClusters: [{ name: "a" }], failedClusters: [{ clusterRef: {}, failureMessage: "x" }] }),
    ).toBe("error");
  });
});
