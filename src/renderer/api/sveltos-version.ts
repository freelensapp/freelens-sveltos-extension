export interface SveltosComponent {
  name: string;
  namespace: string;
  image: string;
  version?: string;
}

interface DeploymentLike {
  metadata: { name: string; namespace?: string };
  spec?: { template?: { spec?: { containers?: { image?: string }[] } } };
}

/** Returns the tag of an image reference, ignoring registries with a port and digests. */
export function imageTag(image: string): string | undefined {
  const withoutDigest = image.split("@")[0];
  const colon = withoutDigest.lastIndexOf(":");
  const slash = withoutDigest.lastIndexOf("/");

  return colon > slash ? withoutDigest.slice(colon + 1) : undefined;
}

export function getSveltosComponents(deployments: DeploymentLike[]): SveltosComponent[] {
  return deployments.flatMap((deployment) => {
    const image = (deployment.spec?.template?.spec?.containers ?? [])
      .map((container) => container.image)
      .find((candidate) => candidate?.includes("projectsveltos/"));

    if (!image) return [];

    return [
      {
        name: deployment.metadata.name,
        namespace: deployment.metadata.namespace ?? "",
        image,
        version: imageTag(image),
      },
    ];
  });
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
