import { describe, expect, it } from "vitest";
import { SveltosCluster } from "./sveltos-cluster-v1beta1";

const buildCluster = (data: Partial<SveltosCluster>) =>
  new SveltosCluster({
    apiVersion: "lib.projectsveltos.io/v1beta1",
    kind: "SveltosCluster",
    metadata: {
      name: "workload",
      namespace: "default",
      selfLink: "/apis/lib.projectsveltos.io/v1beta1/namespaces/default/sveltosclusters/workload",
    },
    ...data,
  });

describe("SveltosCluster", () => {
  it("reports readiness from the status", () => {
    expect(SveltosCluster.getReady(buildCluster({ status: { ready: true } }))).toBe(true);
    expect(SveltosCluster.getReady(buildCluster({ status: {} }))).toBe(false);
    expect(SveltosCluster.getReady(buildCluster({}))).toBe(false);
  });

  it("exposes the connection status and version", () => {
    const cluster = buildCluster({ status: { connectionStatus: "Healthy", version: "v1.31.0" } });

    expect(SveltosCluster.getConnectionStatus(cluster)).toBe("Healthy");
    expect(SveltosCluster.getVersion(cluster)).toBe("v1.31.0");
  });

  it("defaults `paused` to false", () => {
    expect(SveltosCluster.getPaused(buildCluster({ spec: { paused: true } }))).toBe(true);
    expect(SveltosCluster.getPaused(buildCluster({ spec: {} }))).toBe(false);
  });
});
