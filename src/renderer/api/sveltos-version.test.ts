import { describe, expect, it } from "vitest";
import { getSveltosComponents, getSveltosVersion, imageTag } from "./sveltos-version";

const deployment = (name: string, image: string) => ({
  metadata: { name, namespace: "projectsveltos" },
  spec: { template: { spec: { containers: [{ image }] } } },
});

describe("imageTag", () => {
  it("reads the tag of an image reference", () => {
    expect(imageTag("docker.io/projectsveltos/addon-controller:v0.57.0")).toBe("v0.57.0");
  });

  it("ignores the port of a registry", () => {
    expect(imageTag("registry.local:5000/projectsveltos/addon-controller")).toBeUndefined();
  });

  it("ignores digests", () => {
    expect(imageTag("projectsveltos/addon-controller:v1.0.0@sha256:abcdef")).toBe("v1.0.0");
  });
});

describe("getSveltosComponents", () => {
  it("keeps only the containers published by projectsveltos", () => {
    const components = getSveltosComponents([
      deployment("addon-controller", "docker.io/projectsveltos/addon-controller:v0.57.0"),
      deployment("kube-rbac-proxy", "gcr.io/kubebuilder/kube-rbac-proxy:v0.16.0"),
    ]);

    expect(components).toEqual([
      {
        name: "addon-controller",
        namespace: "projectsveltos",
        image: "docker.io/projectsveltos/addon-controller:v0.57.0",
        version: "v0.57.0",
      },
    ]);
  });
});

describe("getSveltosVersion", () => {
  it("returns the version shared by most controllers", () => {
    const components = getSveltosComponents([
      deployment("addon-controller", "projectsveltos/addon-controller:v0.57.0"),
      deployment("sc-manager", "projectsveltos/sveltoscluster-manager:v0.57.0"),
      deployment("event-manager", "projectsveltos/event-manager:v0.56.0"),
    ]);

    expect(getSveltosVersion(components)).toBe("v0.57.0");
  });

  it("returns undefined when no version can be resolved", () => {
    expect(getSveltosVersion([])).toBeUndefined();
  });
});
