import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { gunzipSync } from "node:zlib";
import { parse, parseAllDocuments, stringify } from "yaml";
import type { IncomingMessage } from "node:http";

import type {
  HelmReleaseInfo,
  HelmReleaseRequest,
  HelmReleaseResource,
  HelmReleaseResult,
} from "../common/helm-release";

interface HelmRelease {
  name?: string;
  namespace?: string;
  version?: number;
  info?: { status?: string; last_deployed?: string };
  chart?: { metadata?: { name?: string; version?: string; appVersion?: string } };
  config?: Record<string, unknown> | null;
  manifest?: string;
}

interface Kubeconfig {
  "current-context"?: string;
  contexts?: { name?: string; context?: { cluster?: string; user?: string } }[];
  clusters?: {
    name?: string;
    cluster?: {
      server?: string;
      "certificate-authority-data"?: string;
      "insecure-skip-tls-verify"?: boolean;
      "tls-server-name"?: string;
    };
  }[];
  users?: {
    name?: string;
    user?: {
      token?: string;
      "client-certificate-data"?: string;
      "client-key-data"?: string;
      username?: string;
      password?: string;
      exec?: unknown;
      "auth-provider"?: unknown;
    };
  }[];
}

interface ClusterConnection {
  server: string;
  ca?: Buffer;
  cert?: Buffer;
  key?: Buffer;
  token?: string;
  username?: string;
  password?: string;
  insecure: boolean;
  servername?: string;
}

const requestTimeout = 20_000;
const maxResponseBytes = 64 * 1024 * 1024;

function decodeBase64(value: string | undefined): Buffer | undefined {
  return value ? Buffer.from(value, "base64") : undefined;
}

export function parseKubeconfig(text: string): ClusterConnection {
  const config = (parse(text) ?? {}) as Kubeconfig;
  const contexts = config.contexts ?? [];
  const context = (contexts.find((entry) => entry.name === config["current-context"]) ?? contexts[0])?.context;
  const clusters = config.clusters ?? [];
  const users = config.users ?? [];
  const cluster = (clusters.find((entry) => entry.name === context?.cluster) ?? clusters[0])?.cluster;
  const user = (users.find((entry) => entry.name === context?.user) ?? users[0])?.user;

  if (!cluster?.server) throw new Error("the kubeconfig does not define a cluster server");
  if (user?.exec || user?.["auth-provider"]) {
    throw new Error("the kubeconfig uses an exec or auth-provider plugin, which is not supported");
  }

  return {
    server: cluster.server.replace(/\/+$/, ""),
    ca: decodeBase64(cluster["certificate-authority-data"]),
    cert: decodeBase64(user?.["client-certificate-data"]),
    key: decodeBase64(user?.["client-key-data"]),
    token: user?.token,
    username: user?.username,
    password: user?.password,
    insecure: cluster["insecure-skip-tls-verify"] === true,
    servername: cluster["tls-server-name"],
  };
}

function authorization(connection: ClusterConnection): string | undefined {
  if (connection.token) return `Bearer ${connection.token}`;
  if (connection.username && connection.password !== undefined) {
    return `Basic ${Buffer.from(`${connection.username}:${connection.password}`).toString("base64")}`;
  }

  return undefined;
}

/**
 * A GET to the API server of a managed cluster with the credentials of its Sveltos kubeconfig. The cluster is not
 * in the Freelens catalog, so `Main.K8sApi.forCluster` does not reach it, and `Main.Util.fetch` takes no client
 * certificate, CA or TLS options: the Node client is kept for this one case. Credentials must never follow
 * redirects, so this does not handle them.
 */
function kubeGet(connection: ClusterConnection, path: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const url = `${connection.server}${path}`;
    const send = url.startsWith("http://") ? httpRequest : httpsRequest;
    const auth = authorization(connection);
    const outgoing = send(
      url,
      {
        method: "GET",
        headers: { accept: "application/json", ...(auth ? { authorization: auth } : {}) },
        ca: connection.ca,
        cert: connection.cert,
        key: connection.key,
        servername: connection.servername,
        rejectUnauthorized: !connection.insecure,
        timeout: requestTimeout,
      },
      (response: IncomingMessage) => {
        const chunks: Buffer[] = [];
        let size = 0;

        response.on("data", (chunk: Buffer) => {
          size += chunk.length;

          if (size > maxResponseBytes) {
            outgoing.destroy(new Error(`response from ${connection.server} is too large`));
            return;
          }

          chunks.push(chunk);
        });
        response.on("error", reject);
        response.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          const status = response.statusCode ?? 0;
          let json: unknown;

          try {
            json = JSON.parse(body);
          } catch {
            json = undefined;
          }

          if (status !== 200) {
            const message = (json as { message?: string } | undefined)?.message ?? body.slice(0, 200);
            reject(new Error(`${connection.server} responded ${status}: ${message}`));
            return;
          }

          resolve(json);
        });
      },
    );

    outgoing.on("timeout", () => outgoing.destroy(new Error(`timeout connecting to ${connection.server}`)));
    outgoing.on("error", reject);
    outgoing.end();
  });
}

/** Helm stores the release as base64 of gzipped JSON, inside the Secret base64 encoding. */
export function decodeHelmRelease(data: string): HelmRelease {
  const encoded = Buffer.from(data, "base64").toString("utf8");
  const raw = Buffer.from(encoded, "base64");
  const json = raw[0] === 0x1f && raw[1] === 0x8b ? gunzipSync(raw, { maxOutputLength: maxResponseBytes }) : raw;

  return JSON.parse(json.toString("utf8")) as HelmRelease;
}

export function parseManifestResources(manifest: string): HelmReleaseResource[] {
  return parseAllDocuments(manifest).flatMap((document) => {
    if (document.errors.length > 0) return [];

    const object = document.toJS() as {
      apiVersion?: string;
      kind?: string;
      metadata?: { name?: string; namespace?: string };
    } | null;

    if (!object?.kind || !object.metadata?.name) return [];

    return [
      {
        apiVersion: object.apiVersion,
        kind: object.kind,
        name: object.metadata.name,
        namespace: object.metadata.namespace,
      },
    ];
  });
}

export function toHelmReleaseInfo(
  release: HelmRelease,
  fallback: { namespace: string; name: string },
): HelmReleaseInfo {
  const config = release.config ?? {};

  return {
    name: release.name ?? fallback.name,
    namespace: release.namespace ?? fallback.namespace,
    revision: release.version ?? 0,
    status: release.info?.status,
    updated: release.info?.last_deployed,
    chart: release.chart?.metadata?.name,
    chartVersion: release.chart?.metadata?.version,
    appVersion: release.chart?.metadata?.appVersion,
    values: Object.keys(config).length > 0 ? stringify(config) : "",
    resources: parseManifestResources(release.manifest ?? ""),
  };
}

interface SecretList {
  items?: { metadata?: { labels?: Record<string, string> }; data?: Record<string, string> }[];
}

/** Same release `helm get` picks: the highest revision, whatever its status. */
async function getLatestRelease(connection: ClusterConnection, namespace: string, name: string) {
  const selector = encodeURIComponent(`owner=helm,name=${name}`);
  const list = (await kubeGet(
    connection,
    `/api/v1/namespaces/${encodeURIComponent(namespace)}/secrets?labelSelector=${selector}`,
  )) as SecretList;
  const latest = (list.items ?? [])
    .filter((item) => item.data?.release)
    .sort((a, b) => Number(b.metadata?.labels?.version ?? 0) - Number(a.metadata?.labels?.version ?? 0))[0];

  if (!latest?.data?.release) throw new Error(`Helm release ${namespace}/${name} not found in the managed cluster`);

  return decodeHelmRelease(latest.data.release);
}

/** Reads the Helm release from the managed cluster, where Helm keeps its storage Secrets. */
export async function fetchHelmRelease(request: HelmReleaseRequest): Promise<HelmReleaseResult> {
  try {
    const connection = parseKubeconfig(Buffer.from(request.kubeconfig, "base64").toString("utf8"));
    const release = await getLatestRelease(connection, request.namespace, request.name);

    return { release: toHelmReleaseInfo(release, request) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}
