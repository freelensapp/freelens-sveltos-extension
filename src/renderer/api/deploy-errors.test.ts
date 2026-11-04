import { describe, expect, it } from "vitest";
import { type DeployError, filterErrorsByAddon } from "./deploy-errors";

import type { Addon } from "./addons";

const error = (id: string, clusterName: string, feature: string, extra: Partial<DeployError> = {}): DeployError => ({
  id,
  clusterNamespace: "default",
  clusterName,
  profileKind: "ClusterProfile",
  profileName: "nginx",
  feature,
  message: id,
  ...extra,
});

const addon: Addon = {
  id: "addon",
  type: "Helm",
  name: "nginx",
  namespace: "web",
  clusterNamespace: "default",
  clusterName: "east",
  profile: "nginx",
};

describe("filterErrorsByAddon", () => {
  it("keeps the failures of the add-on on its own cluster, and the profile level error of its profile", () => {
    const errors = [
      error("own release", "east", "Helm", { resource: "web/nginx" }),
      error("own feature", "east", "Helm"),
      error("own profile", "east", "Profile"),
      error("other release", "east", "Helm", { resource: "web/redis" }),
      error("other feature", "east", "Resources"),
      error("other profile", "east", "Profile", { profileName: "redis" }),
      error("other cluster release", "west", "Helm", { resource: "web/nginx" }),
      error("other cluster feature", "west", "Helm"),
      error("other cluster profile", "west", "Profile"),
    ];

    expect(filterErrorsByAddon(errors, addon).map((item) => item.id)).toEqual([
      "own release",
      "own feature",
      "own profile",
    ]);
  });
});
