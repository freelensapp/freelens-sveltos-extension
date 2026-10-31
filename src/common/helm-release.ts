export interface HelmReleaseRequest {
  /** Base64 kubeconfig, exactly as stored in the cluster secret. */
  kubeconfig: string;
  namespace: string;
  name: string;
}

export interface HelmReleaseResource {
  apiVersion?: string;
  kind: string;
  name: string;
  namespace?: string;
}

export interface HelmReleaseInfo {
  name: string;
  namespace: string;
  revision: number;
  status?: string;
  updated?: string;
  chart?: string;
  chartVersion?: string;
  appVersion?: string;
  /** User-supplied values as YAML, the output of `helm get values`. */
  values: string;
  /** Resources from the release manifest, the output of `helm get manifest`. */
  resources: HelmReleaseResource[];
}

export interface HelmReleaseResult {
  release?: HelmReleaseInfo;
  error?: string;
}

/** The IPC wrapper may or may not prepend the Electron event, so find the payload by shape. */
export function findHelmReleaseRequest(args: unknown[]): HelmReleaseRequest | undefined {
  return args.find((arg): arg is HelmReleaseRequest => {
    const value = arg as HelmReleaseRequest | null;

    return (
      typeof value === "object" &&
      value !== null &&
      typeof value.kubeconfig === "string" &&
      typeof value.namespace === "string" &&
      typeof value.name === "string"
    );
  });
}
