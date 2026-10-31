import { describe, expect, it } from "vitest";
import { getKubeconfigSecretRef, pickKubeconfig } from "./helm-release";

const addon = { clusterNamespace: "mgmt", clusterName: "workload" };

describe("getKubeconfigSecretRef", () => {
  it("uses the CAPI kubeconfig Secret", () => {
    expect(getKubeconfigSecretRef({ ...addon, clusterType: "Capi" })).toEqual({
      namespace: "mgmt",
      name: "workload-kubeconfig",
      key: "value",
    });
  });

  it("uses the Sveltos default Secret", () => {
    expect(getKubeconfigSecretRef({ ...addon, clusterType: "Sveltos" })).toEqual({
      namespace: "mgmt",
      name: "workload-sveltos-kubeconfig",
      key: undefined,
    });
  });

  it("honours the SveltosCluster overrides", () => {
    expect(
      getKubeconfigSecretRef(
        { ...addon, clusterType: "Sveltos" },
        { kubeconfigName: "custom", kubeconfigKeyName: "k" },
      ),
    ).toEqual({ namespace: "mgmt", name: "custom", key: "k" });
  });
});

describe("pickKubeconfig", () => {
  it("prefers the explicit key, then the conventional names", () => {
    expect(pickKubeconfig({ a: "1", value: "2" }, "a")).toBe("1");
    expect(pickKubeconfig({ a: "1", kubeconfig: "3" })).toBe("3");
    expect(pickKubeconfig({ a: "1" })).toBe("1");
    expect(pickKubeconfig({})).toBeUndefined();
  });
});
