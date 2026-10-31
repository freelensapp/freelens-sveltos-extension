import type { ProfileStatus } from "./types";

/** Rollout state of a profile across its matching clusters. */
export type ProfileHealth = "ok" | "progress" | "error" | "idle";

/** `dependsOn` holds plain names, resolved inside the namespace of the profile that declares them. */
export interface DependencyInput {
  name: string;
  namespace?: string;
  dependsOn?: string[];
  selfLink?: string;
  health?: ProfileHealth;
  matchingClusters?: number;
}

export interface DependencyNode extends DependencyInput {
  id: string;
  level: number;
  row: number;
  /** Named in a `dependsOn` but no such profile exists, Sveltos keeps the dependent profile blocked. */
  missing?: boolean;
  /** Part of a dependency cycle, which Sveltos can never satisfy. */
  inCycle?: boolean;
}

export interface DependencyEdge {
  from: string;
  to: string;
}

export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  /** Profiles that neither depend on nor are depended upon, kept out of the canvas. */
  isolated: DependencyInput[];
  /** Number of deployment stages, a profile is deployed after everything in the stages before it. */
  levels: number;
}

export function nodeId(namespace: string | undefined, name: string): string {
  return namespace ? `${namespace}/${name}` : name;
}

export function profileHealth(status: ProfileStatus | undefined): ProfileHealth {
  if (status?.failedClusters?.length) return "error";
  if (status?.updatingClusters?.clusters?.length) return "progress";
  if (!status?.matchingClusters?.length) return "idle";

  return "ok";
}

/** Longest path from the roots, capped so a dependency cycle cannot loop forever. */
function computeLevels(ids: string[], dependencies: Map<string, string[]>): Map<string, number> {
  const levels = new Map(ids.map((id) => [id, 0]));

  for (let pass = 0; pass < ids.length; pass++) {
    let changed = false;

    for (const id of ids) {
      for (const dependency of dependencies.get(id) ?? []) {
        const candidate = (levels.get(dependency) ?? 0) + 1;

        if (candidate > (levels.get(id) ?? 0)) {
          levels.set(id, candidate);
          changed = true;
        }
      }
    }

    if (!changed) break;
  }

  return levels;
}

/** Tarjan strongly connected components, every component with more than one node is a cycle. */
function findCycles(ids: string[], dependencies: Map<string, string[]>): Set<string> {
  const index = new Map<string, number>();
  const lowLink = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const inCycle = new Set<string>();
  let counter = 0;

  const visit = (id: string) => {
    index.set(id, counter);
    lowLink.set(id, counter);
    counter++;
    stack.push(id);
    onStack.add(id);

    for (const dependency of dependencies.get(id) ?? []) {
      if (!index.has(dependency)) {
        visit(dependency);
        lowLink.set(id, Math.min(lowLink.get(id) ?? 0, lowLink.get(dependency) ?? 0));
      } else if (onStack.has(dependency)) {
        lowLink.set(id, Math.min(lowLink.get(id) ?? 0, index.get(dependency) ?? 0));
      }
    }

    if (lowLink.get(id) !== index.get(id)) return;

    const component: string[] = [];
    let member: string | undefined;

    do {
      member = stack.pop();
      if (member === undefined) break;
      onStack.delete(member);
      component.push(member);
    } while (member !== id);

    if (component.length > 1) for (const node of component) inCycle.add(node);
  };

  for (const id of ids) if (!index.has(id)) visit(id);

  return inCycle;
}

export function buildDependencyGraph(profiles: DependencyInput[]): DependencyGraph {
  const byId = new Map<string, DependencyInput & { missing?: boolean }>(
    profiles.map((profile) => [nodeId(profile.namespace, profile.name), profile]),
  );
  const edges: DependencyEdge[] = [];
  const dependencies = new Map<string, string[]>();

  for (const profile of profiles) {
    const id = nodeId(profile.namespace, profile.name);
    const resolved = [...new Set(profile.dependsOn ?? [])]
      .map((name) => ({ name, id: nodeId(profile.namespace, name) }))
      .filter((dependency) => dependency.id !== id);

    for (const dependency of resolved) {
      if (!byId.has(dependency.id)) {
        byId.set(dependency.id, { name: dependency.name, namespace: profile.namespace, missing: true });
      }
    }

    dependencies.set(
      id,
      resolved.map((dependency) => dependency.id),
    );
    edges.push(...resolved.map((dependency) => ({ from: dependency.id, to: id })));
  }

  const connected = new Set(edges.flatMap((edge) => [edge.from, edge.to]));
  const ids = [...byId.keys()].filter((id) => connected.has(id)).sort();
  const levels = computeLevels(ids, dependencies);
  const cycles = findCycles(ids, dependencies);
  const rows = new Map<string, number>();
  const byLevel = new Map<number, string[]>();

  for (const id of ids) {
    const level = levels.get(id) ?? 0;

    byLevel.set(level, [...(byLevel.get(level) ?? []), id]);
  }

  // Barycenter ordering: each node sits near the average row of its dependencies, which keeps edges short.
  const levelCount = byLevel.size === 0 ? 0 : Math.max(...byLevel.keys()) + 1;

  for (let level = 0; level < levelCount; level++) {
    const placed = (byLevel.get(level) ?? [])
      .map((id) => {
        const parentRows = (dependencies.get(id) ?? [])
          .map((dependency) => rows.get(dependency))
          .filter((row): row is number => row !== undefined);
        const weight = parentRows.length
          ? parentRows.reduce((sum, row) => sum + row, 0) / parentRows.length
          : Number.POSITIVE_INFINITY;

        return { id, weight };
      })
      .sort((a, b) => a.weight - b.weight || a.id.localeCompare(b.id));

    placed.forEach(({ id }, row) => rows.set(id, row));
  }

  const nodes = ids
    .map((id) => {
      const { missing, ...input } = byId.get(id) as DependencyInput & { missing?: boolean };

      return {
        ...input,
        id,
        level: levels.get(id) ?? 0,
        row: rows.get(id) ?? 0,
        ...(missing ? { missing } : {}),
        ...(cycles.has(id) ? { inCycle: true } : {}),
      };
    })
    .sort((a, b) => a.level - b.level || a.row - b.row);

  return {
    nodes,
    edges,
    isolated: profiles.filter((profile) => !connected.has(nodeId(profile.namespace, profile.name))),
    levels: levelCount,
  };
}

/** The node itself, everything it needs and everything that needs it, used to highlight a chain. */
export function relatedNodes(edges: DependencyEdge[], id: string): Set<string> {
  const related = new Set([id]);
  const walk = (from: "from" | "to", to: "from" | "to") => {
    const queue = [id];

    while (queue.length > 0) {
      const current = queue.shift() as string;

      for (const edge of edges) {
        if (edge[to] === current && !related.has(edge[from])) {
          related.add(edge[from]);
          queue.push(edge[from]);
        }
      }
    }
  };

  walk("from", "to");
  walk("to", "from");

  return related;
}

/** Profiles whose `dependsOn` names the given profile, in the same namespace. */
export function getDependents(profiles: DependencyInput[], name: string, namespace?: string): DependencyInput[] {
  return profiles.filter(
    (profile) => profile.namespace === namespace && profile.name !== name && profile.dependsOn?.includes(name),
  );
}
