import { Renderer } from "@freelensapp/extensions";
import React from "react";
import { buildDependencyGraph, profileHealth, relatedNodes } from "../api/dependency-graph";
import styles from "./dashboard.module.scss";

import type { DependencyInput, DependencyNode, ProfileHealth } from "../api/dependency-graph";
import type { ProfileSpec, ProfileStatus } from "../api/types";

const {
  Component: { Icon },
  Navigation: { showDetails },
} = Renderer;

type ProfileLike = Renderer.K8sApi.KubeObject<Renderer.K8sApi.KubeObjectMetadata, ProfileStatus, ProfileSpec>;

export function toDependencyInputs(profiles: ProfileLike[]): DependencyInput[] {
  return profiles.map((profile) => ({
    name: profile.getName(),
    namespace: profile.getNs(),
    dependsOn: profile.spec?.dependsOn,
    selfLink: profile.selfLink,
    health: profileHealth(profile.status),
    matchingClusters: profile.status?.matchingClusters?.length ?? 0,
  }));
}

export const healthLabels: Record<ProfileHealth, string> = {
  ok: "Deployed",
  progress: "Updating",
  error: "Failed",
  idle: "No matching cluster",
};

export const healthClasses: Record<ProfileHealth, string> = {
  ok: styles.healthOk,
  progress: styles.healthProgress,
  error: styles.healthError,
  idle: styles.healthIdle,
};

const nodeWidth = 210;
const nodeHeight = 54;
const columnGap = 80;
const rowGap = 16;
const headerHeight = 30;

const x = (level: number) => level * (nodeWidth + columnGap);
const y = (row: number) => headerHeight + row * (nodeHeight + rowGap);

let graphCounter = 0;

function nodeClass(node: DependencyNode, dimmed: boolean, active: boolean): string {
  return [
    styles.graphNode,
    node.missing ? styles.graphNodeMissing : healthClasses[node.health ?? "idle"],
    node.inCycle ? styles.graphNodeCycle : "",
    dimmed ? styles.graphDimmed : "",
    active ? styles.graphNodeActive : "",
  ].join(" ");
}

function nodeMeta(node: DependencyNode): string {
  if (node.missing) return "profile not found";

  const clusters = `${node.matchingClusters ?? 0} cluster${node.matchingClusters === 1 ? "" : "s"}`;

  return [node.namespace, clusters].filter(Boolean).join(" · ");
}

function nodeTooltip(node: DependencyNode): string {
  if (node.missing) return `${node.id} does not exist, the profiles depending on it never deploy`;

  return [
    node.id,
    healthLabels[node.health ?? "idle"],
    node.inCycle ? "Part of a dependency cycle, Sveltos cannot deploy it" : undefined,
  ]
    .filter(Boolean)
    .join("\n");
}

function Legend() {
  return (
    <div className={styles.graphLegend}>
      {(Object.keys(healthLabels) as ProfileHealth[]).map((health) => (
        <span key={health} className={styles.graphLegendItem}>
          <span className={`${styles.healthDot} ${healthClasses[health]}`} />
          {healthLabels[health]}
        </span>
      ))}
      <span className={styles.graphLegendItem}>
        <span className={`${styles.healthDot} ${styles.healthMissing}`} />
        Missing
      </span>
      <span className={styles.graphLegendItem}>
        <Icon material="arrow_forward" small />
        deployed before
      </span>
    </div>
  );
}

export interface DependencyGraphViewProps {
  title: string;
  profiles: DependencyInput[];
}

/** Layered left-to-right DAG: coordinates come from the stage/row grid, so nothing has to be measured. */
export function DependencyGraphView({ title, profiles }: DependencyGraphViewProps) {
  const [hovered, setHovered] = React.useState<string>();
  const [markerId] = React.useState(() => `sveltos-dependency-arrow-${++graphCounter}`);
  const { nodes, edges, isolated, levels } = React.useMemo(() => buildDependencyGraph(profiles), [profiles]);
  const highlighted = React.useMemo(() => (hovered ? relatedNodes(edges, hovered) : undefined), [edges, hovered]);

  const header = (
    <div className={styles.sectionHeader}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      <span className={styles.sectionSubtitle}>
        {nodes.length > 0
          ? `${nodes.length} linked in ${levels} stage${levels === 1 ? "" : "s"}${isolated.length > 0 ? `, ${isolated.length} standalone` : ""}`
          : `${profiles.length} profile${profiles.length === 1 ? "" : "s"}`}
      </span>
      <div className={styles.spacer} />
      {nodes.length > 0 ? <Legend /> : null}
    </div>
  );

  if (nodes.length === 0) {
    return (
      <div className={styles.section}>
        {header}
        <div className={styles.empty}>No profile declares a dependency on another one.</div>
        <StandaloneProfiles profiles={isolated} />
      </div>
    );
  }

  const positions = new Map(nodes.map((node) => [node.id, node]));
  const width = x(levels) - columnGap;
  const height = y(Math.max(...nodes.map((node) => node.row)) + 1) - rowGap;
  const missing = nodes.filter((node) => node.missing);
  const cycle = nodes.filter((node) => node.inCycle);

  return (
    <div className={styles.section}>
      {header}

      {cycle.length > 0 ? (
        <div className={styles.errorCard}>
          <Icon className={styles.errorIcon} material="sync_problem" />
          <div className={styles.errorBody}>
            {`Dependency cycle between ${cycle.map((node) => node.id).join(", ")}: Sveltos cannot deploy these profiles.`}
          </div>
        </div>
      ) : null}
      {missing.length > 0 ? (
        <div className={styles.warningCard}>
          <Icon className={styles.warningIcon} material="link_off" />
          <div className={styles.errorBody}>
            {`dependsOn names profiles that do not exist: ${missing.map((node) => node.id).join(", ")}. The profiles depending on them stay blocked.`}
          </div>
        </div>
      ) : null}

      <div className={styles.graphScroll}>
        <div className={styles.graphCanvas} style={{ width, height }}>
          {Array.from({ length: levels }, (_, level) => (
            <span key={level} className={styles.graphStage} style={{ left: x(level), width: nodeWidth }}>
              Stage {level + 1}
            </span>
          ))}
          <svg className={styles.graphEdges} width={width} height={height}>
            <title>{title}</title>
            <defs>
              {(["", "Active", "Missing"] as const).map((variant) => (
                <marker
                  key={variant}
                  id={`${markerId}${variant}`}
                  markerWidth="8"
                  markerHeight="8"
                  refX="7"
                  refY="4"
                  orient="auto"
                >
                  <path className={styles[`graphArrow${variant}`]} d="M0,1 L7,4 L0,7 z" />
                </marker>
              ))}
            </defs>
            {edges.map((edge) => {
              const from = positions.get(edge.from);
              const to = positions.get(edge.to);

              if (!from || !to) return null;

              const x1 = x(from.level) + nodeWidth;
              const y1 = y(from.row) + nodeHeight / 2;
              const x2 = x(to.level);
              const y2 = y(to.row) + nodeHeight / 2;
              const curve = Math.max(24, Math.abs(x2 - x1) / 2);
              const active = highlighted?.has(edge.from) && highlighted.has(edge.to);
              const variant = active ? "Active" : from.missing ? "Missing" : "";

              return (
                <path
                  key={`${edge.from}->${edge.to}`}
                  className={[
                    styles.graphEdge,
                    active ? styles.graphEdgeActive : "",
                    from.missing ? styles.graphEdgeMissing : "",
                    highlighted && !active ? styles.graphDimmed : "",
                  ].join(" ")}
                  d={`M${x1},${y1} C${x1 + curve},${y1} ${x2 - curve},${y2} ${x2},${y2}`}
                  markerEnd={`url(#${markerId}${variant})`}
                >
                  <title>{`${edge.from} is deployed before ${edge.to}`}</title>
                </path>
              );
            })}
          </svg>
          {nodes.map((node) => (
            <button
              type="button"
              key={node.id}
              className={nodeClass(node, Boolean(highlighted && !highlighted.has(node.id)), hovered === node.id)}
              style={{ left: x(node.level), top: y(node.row), width: nodeWidth, height: nodeHeight }}
              disabled={!node.selfLink}
              onClick={() => node.selfLink && showDetails(node.selfLink)}
              onMouseEnter={() => setHovered(node.id)}
              onMouseLeave={() => setHovered(undefined)}
              onFocus={() => setHovered(node.id)}
              onBlur={() => setHovered(undefined)}
              title={nodeTooltip(node)}
            >
              <span className={styles.graphNodeName}>
                {node.inCycle ? <Icon material="sync_problem" small /> : null}
                {node.missing ? <Icon material="link_off" small /> : null}
                {node.name}
              </span>
              <span className={styles.graphNodeMeta}>{nodeMeta(node)}</span>
            </button>
          ))}
        </div>
      </div>

      <StandaloneProfiles profiles={isolated} />
    </div>
  );
}

function StandaloneProfiles({ profiles }: { profiles: DependencyInput[] }) {
  if (profiles.length === 0) return null;

  return (
    <div className={styles.graphIsolated}>
      <span className={styles.sectionSubtitle}>Standalone</span>
      {profiles.map((profile) => (
        <button
          type="button"
          key={`${profile.namespace ?? ""}/${profile.name}`}
          className={`${styles.chip} ${styles.chipButton}`}
          title={healthLabels[profile.health ?? "idle"]}
          disabled={!profile.selfLink}
          onClick={() => profile.selfLink && showDetails(profile.selfLink)}
        >
          <span className={`${styles.healthDot} ${healthClasses[profile.health ?? "idle"]}`} />
          {profile.name}
        </button>
      ))}
    </div>
  );
}
