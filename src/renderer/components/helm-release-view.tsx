import { Renderer } from "@freelensapp/extensions";
import * as MobxReact from "mobx-react";
import React from "react";
import { type KubeconfigSecretRef, loadHelmRelease } from "../api/helm-release";
import { filterHelmResources, groupHelmResources } from "../api/helm-resources";
import { isSectionCollapsed, setSectionCollapsed, syncUiSettings } from "../api/ui-settings";
import styles from "./dashboard.module.scss";
import { LastUpdate } from "./last-update";
import { StatusChip } from "./status-chip";

import type { HelmReleaseInfo, HelmReleaseResource } from "../../common/helm-release";

const { observer } = MobxReact;

const {
  Component: { Icon, MonacoEditor, SearchInput, Spinner },
} = Renderer;

type HelmReleaseTab = "values" | "resources";

// MonacoEditor sets its height inline, so it fills a fixed-size wrapper instead.
const fillParent = { height: "100%" };

/** Persisted, so a user who only cares about the add-on list keeps the details folded away. */
const collapsedSectionId = "helmRelease";

/** Long categories (CRDs, RBAC) start folded so the interesting resources stay in view. */
const autoCollapseAbove = 12;

const tabs: { value: HelmReleaseTab; material: string; label: string }[] = [
  { value: "values", material: "tune", label: "Values" },
  { value: "resources", material: "layers", label: "Resources" },
];

interface HelmReleaseState {
  loading: boolean;
  release?: HelmReleaseInfo;
  error?: string;
}

export interface HelmReleaseViewProps {
  secret: KubeconfigSecretRef;
  namespace: string;
  name: string;
  subtitle: string;
}

export const HelmReleaseView = observer(({ secret, namespace, name, subtitle }: HelmReleaseViewProps) => {
  const [tab, setTab] = React.useState<HelmReleaseTab>("values");
  const [state, setState] = React.useState<HelmReleaseState>({ loading: true });
  const [reload, setReload] = React.useState(0);
  const { namespace: secretNamespace, name: secretName, key: secretKey } = secret;
  const collapsed = isSectionCollapsed(collapsedSectionId);

  React.useEffect(() => syncUiSettings(), []);

  React.useEffect(() => {
    let active = true;

    setState({ loading: true });
    loadHelmRelease({ namespace: secretNamespace, name: secretName, key: secretKey }, namespace, name).then(
      (release) => {
        if (active) setState({ loading: false, release });
      },
      (error: unknown) => {
        if (active) setState({ loading: false, error: error instanceof Error ? error.message : String(error) });
      },
    );

    return () => {
      active = false;
    };
  }, [secretNamespace, secretName, secretKey, namespace, name, reload]);

  const { release } = state;

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <button
          type="button"
          className={styles.collapseButton}
          aria-expanded={!collapsed}
          title={collapsed ? "Show values and resources" : "Hide values and resources"}
          onClick={() => setSectionCollapsed(collapsedSectionId, !collapsed)}
        >
          <Icon material={collapsed ? "chevron_right" : "expand_more"} small />
          <span className={styles.sectionTitle}>Helm Release</span>
        </button>
        <span className={styles.sectionSubtitle}>
          {`${namespace}/${name}`} · {subtitle}
        </span>
        {release ? (
          <div className={styles.chips}>
            <StatusChip status={release.status} />
            <span className={styles.chip}>
              <span className={styles.chipLabel}>Revision</span>
              {release.revision}
            </span>
            {release.chart ? (
              <span className={styles.chip}>
                <span className={styles.chipLabel}>Chart</span>
                {release.chartVersion ? `${release.chart}-${release.chartVersion}` : release.chart}
              </span>
            ) : null}
            {release.updated ? (
              <span className={styles.chip}>
                <span className={styles.chipLabel}>Updated</span>
                <LastUpdate timestamp={release.updated} />
              </span>
            ) : null}
          </div>
        ) : null}
        <div className={styles.spacer} />
        <div className={styles.toolbar}>
          {collapsed ? null : (
            <div className={styles.viewToggle}>
              {tabs.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  className={`${styles.viewToggleButton} ${tab === option.value ? styles.viewToggleButtonActive : ""}`}
                  onClick={() => setTab(option.value)}
                >
                  <Icon material={option.material} small />
                  {option.label}
                  {option.value === "resources" && release ? ` (${release.resources.length})` : null}
                </button>
              ))}
            </div>
          )}
          <Icon
            material="refresh"
            interactive
            tooltip="Reload from the managed cluster"
            onClick={() => setReload((value) => value + 1)}
          />
        </div>
      </div>

      {collapsed ? null : state.loading ? (
        <div className={styles.empty}>
          <Spinner />
        </div>
      ) : state.error || !release ? (
        <div className={styles.errorCard}>
          <Icon className={styles.errorIcon} material="error" />
          <div className={styles.errorBody}>
            <div
              className={styles.errorMessage}
            >{`Cannot read the Helm release: ${state.error ?? "unknown error"}`}</div>
          </div>
        </div>
      ) : tab === "values" ? (
        release.values ? (
          <div className={styles.valuesEditor}>
            <MonacoEditor style={fillParent} language="yaml" readOnly value={release.values} />
          </div>
        ) : (
          <div className={styles.empty}>No user-supplied values.</div>
        )
      ) : release.resources.length === 0 ? (
        <div className={styles.empty}>The release manifest has no resources.</div>
      ) : (
        <HelmResourcesView resources={release.resources} />
      )}
    </div>
  );
});

function HelmResourcesView({ resources }: { resources: HelmReleaseResource[] }) {
  const [search, setSearch] = React.useState("");
  const allGroups = React.useMemo(() => groupHelmResources(resources), [resources]);
  const groups = React.useMemo(
    () => (search.trim() ? groupHelmResources(filterHelmResources(resources, search)) : allGroups),
    [resources, search, allGroups],
  );
  const [collapsed, setCollapsed] = React.useState(
    () => new Set(allGroups.filter((group) => group.count > autoCollapseAbove).map((group) => group.id)),
  );
  const searching = search.trim().length > 0;
  const kindCount = allGroups.reduce((total, group) => total + group.kinds.length, 0);
  const isOpen = (id: string) => searching || !collapsed.has(id);
  const toggle = (id: string) =>
    setCollapsed((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });

  return (
    <div className={styles.resourceGroups}>
      <div className={styles.resourceToolbar}>
        <div className={styles.chips}>
          {allGroups.map((group) => (
            <button
              type="button"
              key={group.id}
              className={`${styles.chip} ${styles.chipButton} ${isOpen(group.id) ? styles.chipButtonActive : ""}`}
              title={isOpen(group.id) ? `Fold ${group.title}` : `Unfold ${group.title}`}
              onClick={() => toggle(group.id)}
            >
              <Icon material={group.icon} small />
              {group.title}
              <span className={styles.chipLabel}>{group.count}</span>
            </button>
          ))}
        </div>
        <div className={styles.spacer} />
        <span className={styles.sectionSubtitle}>
          {resources.length} resources · {kindCount} kinds
        </span>
        <button
          type="button"
          className={styles.linkButton}
          onClick={() => setCollapsed(new Set())}
          disabled={searching || collapsed.size === 0}
        >
          Expand all
        </button>
        <button
          type="button"
          className={styles.linkButton}
          onClick={() => setCollapsed(new Set(allGroups.map((group) => group.id)))}
          disabled={searching || collapsed.size === allGroups.length}
        >
          Collapse all
        </button>
        <SearchInput
          className={styles.search}
          value={search}
          onChange={(value: string) => setSearch(value)}
          placeholder="Filter resources"
        />
      </div>

      {groups.length === 0 ? <div className={styles.empty}>No resource matches the filter.</div> : null}

      {groups.map((group) => (
        <div key={group.id} className={styles.resourceGroup}>
          <button
            type="button"
            className={styles.resourceGroupHeader}
            aria-expanded={isOpen(group.id)}
            onClick={() => toggle(group.id)}
            disabled={searching}
          >
            <Icon material={isOpen(group.id) ? "expand_more" : "chevron_right"} small />
            <Icon material={group.icon} small />
            <span className={styles.resourceGroupTitle}>{group.title}</span>
            <span className={styles.resourceGroupCount}>{group.count}</span>
            {isOpen(group.id) ? null : (
              <span className={styles.resourceGroupKinds}>
                {group.kinds.map((kind) => `${kind.kind} (${kind.resources.length})`).join(", ")}
              </span>
            )}
          </button>

          {isOpen(group.id)
            ? group.kinds.map((kind) => (
                <div key={kind.kind} className={styles.resourceKind}>
                  <div className={styles.resourceKindHeader}>
                    <span className={styles.resourceKindName}>{kind.kind}</span>
                    <span className={styles.resourceKindMeta}>{kind.apiVersions.join(", ")}</span>
                    <span className={styles.resourceGroupCount}>{kind.resources.length}</span>
                  </div>
                  <div className={styles.resourceList}>
                    {kind.resources.map((resource) => (
                      <div
                        key={`${resource.apiVersion ?? ""}/${resource.namespace ?? ""}/${resource.name}`}
                        className={styles.resourceRow}
                      >
                        <span className={styles.resourceName} title={resource.name}>
                          {resource.name}
                        </span>
                        {resource.namespace ? (
                          <span className={styles.resourceNamespace} title="Namespace">
                            <Icon material="folder_open" small />
                            {resource.namespace}
                          </span>
                        ) : (
                          <span className={styles.resourceNamespace} title="Cluster scoped">
                            <Icon material="public" small />
                            cluster
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            : null}
        </div>
      ))}
    </div>
  );
}
