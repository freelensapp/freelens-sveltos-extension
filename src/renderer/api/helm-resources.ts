import type { HelmReleaseResource } from "../../common/helm-release";

export interface HelmResourceKind {
  kind: string;
  apiVersions: string[];
  resources: HelmReleaseResource[];
}

export interface HelmResourceCategory {
  id: string;
  title: string;
  /** Material icon name. */
  icon: string;
  count: number;
  kinds: HelmResourceKind[];
}

interface CategoryDefinition {
  id: string;
  title: string;
  icon: string;
  kinds: string[];
}

/** Ordered roughly the way Helm installs them, cluster scoped foundations first and workloads last. */
const categories: CategoryDefinition[] = [
  { id: "cluster", title: "Cluster", icon: "dns", kinds: ["Namespace", "PriorityClass", "RuntimeClass"] },
  { id: "crds", title: "Custom Resource Definitions", icon: "extension", kinds: ["CustomResourceDefinition"] },
  {
    id: "rbac",
    title: "Access Control",
    icon: "security",
    kinds: ["ServiceAccount", "Role", "RoleBinding", "ClusterRole", "ClusterRoleBinding", "PodSecurityPolicy"],
  },
  { id: "config", title: "Configuration", icon: "settings", kinds: ["ConfigMap", "Secret"] },
  {
    id: "storage",
    title: "Storage",
    icon: "storage",
    kinds: ["PersistentVolumeClaim", "PersistentVolume", "StorageClass", "CSIDriver", "VolumeSnapshotClass"],
  },
  {
    id: "network",
    title: "Networking",
    icon: "settings_ethernet",
    kinds: [
      "Service",
      "Endpoints",
      "EndpointSlice",
      "Ingress",
      "IngressClass",
      "NetworkPolicy",
      "Gateway",
      "GatewayClass",
      "HTTPRoute",
      "GRPCRoute",
      "TCPRoute",
      "TLSRoute",
    ],
  },
  {
    id: "workloads",
    title: "Workloads",
    icon: "widgets",
    kinds: ["Deployment", "StatefulSet", "DaemonSet", "ReplicaSet", "Job", "CronJob", "Pod"],
  },
  {
    id: "scaling",
    title: "Scaling and Availability",
    icon: "trending_up",
    kinds: ["HorizontalPodAutoscaler", "VerticalPodAutoscaler", "PodDisruptionBudget", "LimitRange", "ResourceQuota"],
  },
  {
    id: "admission",
    title: "Admission",
    icon: "verified_user",
    kinds: [
      "ValidatingWebhookConfiguration",
      "MutatingWebhookConfiguration",
      "ValidatingAdmissionPolicy",
      "ValidatingAdmissionPolicyBinding",
      "APIService",
    ],
  },
];

const customCategory = { id: "custom", title: "Custom Resources", icon: "category" };

const categoryByKind = new Map(
  categories.flatMap((category) => category.kinds.map((kind) => [kind, category] as const)),
);

const kindOrder = new Map(categories.flatMap((category) => category.kinds).map((kind, index) => [kind, index]));

function compareResources(a: HelmReleaseResource, b: HelmReleaseResource): number {
  return (a.namespace ?? "").localeCompare(b.namespace ?? "") || a.name.localeCompare(b.name);
}

function compareKinds(a: HelmResourceKind, b: HelmResourceKind): number {
  const order = (kind: string) => kindOrder.get(kind) ?? Number.MAX_SAFE_INTEGER;

  return order(a.kind) - order(b.kind) || a.kind.localeCompare(b.kind);
}

/** Groups the release manifest by category, then by kind, so large charts read like an inventory. */
export function groupHelmResources(resources: HelmReleaseResource[]): HelmResourceCategory[] {
  const grouped = new Map<string, Map<string, HelmResourceKind>>();

  for (const resource of resources) {
    const categoryId = categoryByKind.get(resource.kind)?.id ?? customCategory.id;
    const kinds = grouped.get(categoryId) ?? new Map<string, HelmResourceKind>();
    const group = kinds.get(resource.kind) ?? { kind: resource.kind, apiVersions: [], resources: [] };

    if (resource.apiVersion && !group.apiVersions.includes(resource.apiVersion)) {
      group.apiVersions.push(resource.apiVersion);
    }
    group.resources.push(resource);
    kinds.set(resource.kind, group);
    grouped.set(categoryId, kinds);
  }

  return [...categories, customCategory].flatMap(({ id, title, icon }) => {
    const kinds = grouped.get(id);

    if (!kinds) return [];

    const sorted = [...kinds.values()]
      .map((group) => ({ ...group, resources: [...group.resources].sort(compareResources) }))
      .sort(compareKinds);

    return [
      {
        id,
        title,
        icon,
        count: sorted.reduce((total, group) => total + group.resources.length, 0),
        kinds: sorted,
      },
    ];
  });
}

/** Bare words match kind, name or namespace, case insensitive. */
export function filterHelmResources(resources: HelmReleaseResource[], search: string): HelmReleaseResource[] {
  const words = search.toLowerCase().split(/\s+/).filter(Boolean);

  if (words.length === 0) return resources;

  return resources.filter((resource) => {
    const haystack = [resource.kind, resource.name, resource.namespace ?? "", resource.apiVersion ?? ""]
      .join(" ")
      .toLowerCase();

    return words.every((word) => haystack.includes(word));
  });
}
