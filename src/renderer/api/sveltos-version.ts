export interface SveltosComponent {
  name: string;
  namespace: string;
  image: string;
  version?: string;
  /** `--shard-key` of a controller the shard-controller deployed for one shard. */
  shard?: string;
}

interface DeploymentLike {
  metadata: { name: string; namespace?: string };
  spec?: { template?: { spec?: { containers?: { image?: string; args?: string[] }[] } } };
}

function argValue(args: string[], flag: string): string | undefined {
  for (const [index, arg] of args.entries()) {
    if (arg.startsWith(`${flag}=`)) return arg.slice(flag.length + 1) || undefined;
    if (arg === flag) return args[index + 1] || undefined;
  }

  return undefined;
}

/** Returns the tag of an image reference, ignoring registries with a port and digests. */
export function imageTag(image: string): string | undefined {
  const withoutDigest = image.split("@")[0];
  const colon = withoutDigest.lastIndexOf(":");
  const slash = withoutDigest.lastIndexOf("/");

  return colon > slash ? withoutDigest.slice(colon + 1) : undefined;
}

/** The tag of an image reference, or its short digest (`sha256:879d47e`) when it is pinned by digest only. */
export function imageLabel(image: string): string {
  const digest = image.split("@")[1];

  return imageTag(image) ?? (digest ? digest.slice(0, digest.indexOf(":") + 8) : "?");
}

/** What a controller chip shows: the release from the tag or `--version`, otherwise the short digest or `?`. */
export function versionLabel(component: SveltosComponent): string {
  return component.version ?? imageLabel(component.image);
}

export function getSveltosComponents(deployments: DeploymentLike[]): SveltosComponent[] {
  return deployments.flatMap((deployment) => {
    const container = (deployment.spec?.template?.spec?.containers ?? []).find((candidate) =>
      candidate.image?.includes("projectsveltos/"),
    );

    if (!container?.image) return [];

    const args = container.args ?? [];

    return [
      {
        name: deployment.metadata.name,
        namespace: deployment.metadata.namespace ?? "",
        image: container.image,
        // Shard deployments pin the image by digest, the release is only in `--version`.
        version: imageTag(container.image) ?? argValue(args, "--version"),
        shard: argValue(args, "--shard-key"),
      },
    ];
  });
}

/** Name of a shard controller without its `-<shard>` suffix, `addon-controller-aws` is `addon-controller`. */
export function baseName(component: SveltosComponent): string {
  const suffix = component.shard ? `-${component.shard}` : "";

  return suffix && component.name.endsWith(suffix) ? component.name.slice(0, -suffix.length) : component.name;
}

/** The version shared by most Sveltos controllers, which is the release the cluster runs. */
export function getSveltosVersion(components: SveltosComponent[]): string | undefined {
  const counts = new Map<string, number>();

  for (const component of components) {
    if (!component.version) continue;
    counts.set(component.version, (counts.get(component.version) ?? 0) + 1);
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}
