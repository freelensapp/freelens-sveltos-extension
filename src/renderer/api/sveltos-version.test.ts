import { describe, expect, it } from "vitest";
import { baseName, getSveltosComponents, getSveltosVersion, imageTag } from "./sveltos-version";

const deployment = (name: string, image: string, args?: string[]) => ({
  metadata: { name, namespace: "projectsveltos" },
  spec: { template: { spec: { containers: [{ image, args }] } } },
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
        shard: undefined,
      },
    ]);
  });

  it("reads shard key and version from the args of a shard controller pinned by digest", () => {
    const [component] = getSveltosComponents([
      deployment("addon-controller-eu-west", "docker.io/projectsveltos/addon-controller@sha256:95f3", [
        "--report-mode=0",
        "--shard-key=eu-west",
        "--version=v1.17.0",
      ]),
      deployment("addon-controller", "projectsveltos/addon-controller:v1.17.0", ["--shard-key="]),
    ]);

    expect(component).toMatchObject({ version: "v1.17.0", shard: "eu-west" });
    expect(baseName(component)).toBe("addon-controller");
  });

  it("treats an empty shard key as the default shard", () => {
    const [component] = getSveltosComponents([
      deployment("addon-controller", "projectsveltos/addon-controller:v1.17.0", ["--shard-key="]),
    ]);

    expect(component.shard).toBeUndefined();
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
