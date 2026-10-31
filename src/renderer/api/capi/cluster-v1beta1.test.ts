import { describe, expect, it } from "vitest";
import { getReady, isCapi } from "../clusters";
import { CapiCluster } from "./cluster-v1beta1";

const buildCluster = (data: Partial<CapiCluster>) =>
  new CapiCluster({
    apiVersion: "cluster.x-k8s.io/v1beta1",
    kind: "Cluster",
    metadata: {
      name: "workload",
      namespace: "default",
      selfLink: "/apis/cluster.x-k8s.io/v1beta1/namespaces/default/clusters/workload",
    },
    ...data,
  });

describe("CapiCluster", () => {
  it("prefers the Ready condition, falls back to control plane and infrastructure", () => {
    expect(
      CapiCluster.getReady(
        buildCluster({ status: { controlPlaneReady: true, conditions: [{ type: "Ready", status: "False" }] } }),
      ),
    ).toBe(false);
    expect(CapiCluster.getReady(buildCluster({ status: { controlPlaneReady: true, infrastructureReady: true } }))).toBe(
      true,
    );
    expect(CapiCluster.getReady(buildCluster({ status: { controlPlaneReady: true } }))).toBe(false);
  });

  it("is dispatched by the shared cluster helpers", () => {
    const cluster = buildCluster({ status: { conditions: [{ type: "Ready", status: "True" }] } });

    expect(isCapi(cluster)).toBe(true);
    expect(getReady(cluster)).toBe(true);
  });
});
