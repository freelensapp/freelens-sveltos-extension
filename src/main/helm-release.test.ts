import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { findHelmReleaseRequest } from "../common/helm-release";
import { decodeHelmRelease, parseKubeconfig, parseManifestResources, toHelmReleaseInfo } from "./helm-release";

const kubeconfig = `
apiVersion: v1
kind: Config
current-context: workload
contexts:
  - name: other
    context: { cluster: other, user: other }
  - name: workload
    context: { cluster: workload, user: admin }
clusters:
  - name: other
    cluster: { server: https://other:6443 }
  - name: workload
    cluster:
      server: https://workload:6443/
      certificate-authority-data: ${Buffer.from("ca").toString("base64")}
users:
  - name: other
    user: { token: other }
  - name: admin
    user: { token: secret-token }
`;

function encodeRelease(release: unknown): string {
  const helm = gzipSync(Buffer.from(JSON.stringify(release))).toString("base64");

  return Buffer.from(helm).toString("base64");
}

describe("findHelmReleaseRequest", () => {
  it("skips the Electron event", () => {
    const request = { kubeconfig: "a", namespace: "b", name: "c" };

    expect(findHelmReleaseRequest([{ sender: {} }, request])).toBe(request);
    expect(findHelmReleaseRequest([{ kubeconfig: "a" }])).toBeUndefined();
  });
});

describe("parseKubeconfig", () => {
  it("uses the current context", () => {
    const connection = parseKubeconfig(kubeconfig);

    expect(connection.server).toBe("https://workload:6443");
    expect(connection.token).toBe("secret-token");
    expect(connection.ca?.toString()).toBe("ca");
    expect(connection.insecure).toBe(false);
  });

  it("rejects exec plugins", () => {
    const config = `
clusters: [{ name: c, cluster: { server: https://c } }]
users: [{ name: u, user: { exec: { command: aws } } }]
contexts: [{ name: x, context: { cluster: c, user: u } }]
`;

    expect(() => parseKubeconfig(config)).toThrow(/exec/);
  });

  it("requires a server", () => {
    expect(() => parseKubeconfig("clusters: []")).toThrow(/server/);
  });
});

describe("decodeHelmRelease", () => {
  it("unwraps the Secret and Helm encodings", () => {
    expect(decodeHelmRelease(encodeRelease({ name: "kyverno", version: 3 }))).toEqual({ name: "kyverno", version: 3 });
  });
});

describe("parseManifestResources", () => {
  it("lists the objects in the manifest", () => {
    const manifest = `---
# Source: chart/templates/sa.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: app
  namespace: apps
---
# Source: chart/templates/empty.yaml
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: app
`;

    expect(parseManifestResources(manifest)).toEqual([
      { apiVersion: "v1", kind: "ServiceAccount", name: "app", namespace: "apps" },
      { apiVersion: "rbac.authorization.k8s.io/v1", kind: "ClusterRole", name: "app", namespace: undefined },
    ]);
  });
});

describe("toHelmReleaseInfo", () => {
  it("renders the user-supplied values as YAML", () => {
    const info = toHelmReleaseInfo(
      {
        name: "kyverno",
        namespace: "kyverno",
        version: 2,
        info: { status: "deployed" },
        chart: { metadata: { name: "kyverno", version: "3.2.0", appVersion: "v1.12.0" } },
        config: { replicaCount: 3, admissionController: { enabled: true } },
        manifest: "",
      },
      { namespace: "kyverno", name: "kyverno" },
    );

    expect(info).toMatchObject({ revision: 2, status: "deployed", chart: "kyverno", chartVersion: "3.2.0" });
    expect(info.values).toBe("replicaCount: 3\nadmissionController:\n  enabled: true\n");
  });

  it("returns empty values when none were supplied", () => {
    expect(toHelmReleaseInfo({ config: null }, { namespace: "a", name: "b" }).values).toBe("");
  });
});
