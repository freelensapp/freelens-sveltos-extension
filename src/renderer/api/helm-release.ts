import { Renderer } from "@freelensapp/extensions";

import type { HelmReleaseInfo, HelmReleaseRequest, HelmReleaseResult } from "../../common/helm-release";
import type { Addon } from "./addons";
import type { SveltosClusterSpec } from "./lib/sveltos-cluster-v1beta1";

export type HelmReleaseFetcher = (request: HelmReleaseRequest) => Promise<HelmReleaseResult>;

let fetcher: HelmReleaseFetcher | undefined;

export function setHelmReleaseFetcher(value: HelmReleaseFetcher): void {
  fetcher = value;
}

export interface KubeconfigSecretRef {
  namespace: string;
  name: string;
  key?: string;
}

/** Same Secret the Sveltos controllers use to reach the managed cluster. */
export function getKubeconfigSecretRef(
  addon: Pick<Addon, "clusterType" | "clusterNamespace" | "clusterName">,
  spec?: SveltosClusterSpec,
): KubeconfigSecretRef {
  if (addon.clusterType === "Capi") {
    return { namespace: addon.clusterNamespace, name: `${addon.clusterName}-kubeconfig`, key: "value" };
  }

  return {
    namespace: addon.clusterNamespace,
    name: spec?.kubeconfigName || `${addon.clusterName}-sveltos-kubeconfig`,
    key: spec?.kubeconfigKeyName || undefined,
  };
}

/** Without an explicit key Sveltos takes whatever the Secret holds, prefer the conventional names. */
export function pickKubeconfig(data: Partial<Record<string, string>>, key?: string): string | undefined {
  if (key) return data[key];

  return data.value ?? data.kubeconfig ?? Object.values(data).find(Boolean);
}

export async function loadHelmRelease(
  ref: KubeconfigSecretRef,
  namespace: string,
  name: string,
): Promise<HelmReleaseInfo> {
  if (!fetcher) throw new Error("the Helm release fetcher is not registered yet");

  const secret = await Renderer.K8sApi.secretsApi.get({ name: ref.name, namespace: ref.namespace });

  if (!secret) throw new Error(`kubeconfig Secret ${ref.namespace}/${ref.name} not found`);

  const kubeconfig = pickKubeconfig(secret.data ?? {}, ref.key);

  if (!kubeconfig) throw new Error(`kubeconfig Secret ${ref.namespace}/${ref.name} has no kubeconfig data`);

  const result = await fetcher({ kubeconfig, namespace, name });

  if (!result.release) throw new Error(result.error ?? "unknown error");

  return result.release;
}
