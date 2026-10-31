import { Renderer } from "@freelensapp/extensions";
import * as MobxReact from "mobx-react";
import React from "react";
import { SveltosCluster } from "../api/lib/sveltos-cluster-v1beta1";
import { useMetadataFilter } from "../api/metadata-filter";
import styles from "../components/dashboard.module.scss";

const { observer } = MobxReact;

const {
  Component: { BadgeBoolean, Button, DrawerItem, DrawerTitle },
} = Renderer;

export interface SveltosClusterDetailsProps extends Renderer.Component.KubeObjectDetailsProps<SveltosCluster> {}

export const SveltosClusterDetails = observer((props: SveltosClusterDetailsProps) => {
  const { object } = props;

  return (
    <>
      <DrawerTitle>Status</DrawerTitle>
      <DrawerItem name="Ready">
        <BadgeBoolean value={object.status?.ready ?? false} />
      </DrawerItem>
      <DrawerItem name="Connection Status">{object.status?.connectionStatus ?? "N/A"}</DrawerItem>
      <DrawerItem name="Kubernetes Version">{object.status?.version ?? "N/A"}</DrawerItem>
      <DrawerItem name="Connection Failures">{object.status?.connectionFailures ?? 0}</DrawerItem>
      <DrawerItem name="Failure Message" hidden={!object.status?.failureMessage}>
        {object.status?.failureMessage}
      </DrawerItem>
      <DrawerItem name="Agent Last Report" hidden={!object.status?.agentLastReportTime}>
        {object.status?.agentLastReportTime}
      </DrawerItem>

      <DrawerTitle>Configuration</DrawerTitle>
      <DrawerItem name="Paused">
        <BadgeBoolean value={object.spec?.paused ?? false} />
      </DrawerItem>
      <DrawerItem name="Pull Mode">
        <BadgeBoolean value={object.spec?.pullMode ?? false} />
      </DrawerItem>
      <DrawerItem name="Kubeconfig Secret" hidden={!object.spec?.kubeconfigName}>
        {object.spec?.kubeconfigName}
      </DrawerItem>
      <DrawerItem name="Active Window" hidden={!object.spec?.activeWindow}>
        {object.spec?.activeWindow ? `from "${object.spec.activeWindow.from}" to "${object.spec.activeWindow.to}"` : ""}
      </DrawerItem>
      <DrawerItem name="Next Pause" hidden={!object.status?.nextPause}>
        {object.status?.nextPause}
      </DrawerItem>
      <DrawerItem name="Next Unpause" hidden={!object.status?.nextUnpause}>
        {object.status?.nextUnpause}
      </DrawerItem>

      <MetadataEditor object={object} />
    </>
  );
});

function MetadataEditor({ object }: { object: SveltosCluster }) {
  const [labels, setLabels] = React.useState<MetadataRow[]>(() => toRows(object.metadata.labels));
  const [annotations, setAnnotations] = React.useState<MetadataRow[]>(() => toRows(object.metadata.annotations));
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string>();

  React.useEffect(() => {
    setLabels(toRows(object.metadata.labels));
    setAnnotations(toRows(object.metadata.annotations));
    setError(undefined);
  }, [object]);

  const nextLabels = toMetadata(labels);
  const nextAnnotations = toMetadata(annotations);
  const dirty =
    !isSameMetadata(nextLabels, object.metadata.labels) ||
    !isSameMetadata(nextAnnotations, object.metadata.annotations);

  const save = async () => {
    setSaving(true);
    setError(undefined);

    try {
      // A PUT would replace the whole resource, so metadata is patched in place.
      await SveltosCluster.getStore<SveltosCluster>().patch(
        object,
        [
          { op: "add", path: "/metadata/labels", value: nextLabels },
          { op: "add", path: "/metadata/annotations", value: nextAnnotations },
        ],
        "json",
      );
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <DrawerTitle>Sveltos Metadata</DrawerTitle>
      <MetadataSection name="Labels" rows={labels} setRows={setLabels} />
      <MetadataSection name="Annotations" rows={annotations} setRows={setAnnotations} />
      <Button onClick={save} disabled={saving || !dirty}>
        {saving ? "Saving..." : "Save metadata"}
      </Button>
      {error ? <div className={styles.metadataError}>{error}</div> : null}
    </>
  );
}

interface MetadataRow {
  id: number;
  key: string;
  value: string;
  editing: boolean;
}

let lastRowId = 0;

function toRows(values: Partial<Record<string, string>> | undefined): MetadataRow[] {
  return Object.entries(values ?? {})
    .filter((entry): entry is [string, string] => entry[1] !== undefined)
    .map(([key, value]) => ({ id: ++lastRowId, key, value, editing: false }));
}

function toMetadata(rows: MetadataRow[]): Record<string, string> {
  return Object.fromEntries(rows.filter(({ key }) => key.trim()).map(({ key, value }) => [key.trim(), value]));
}

function isSameMetadata(next: Record<string, string>, current: Partial<Record<string, string>> | undefined): boolean {
  const entries = Object.entries(current ?? {}).filter((entry): entry is [string, string] => entry[1] !== undefined);

  return entries.length === Object.keys(next).length && entries.every(([key, value]) => next[key] === value);
}

const MetadataSection = observer(
  ({
    name,
    rows,
    setRows,
  }: {
    name: string;
    rows: MetadataRow[];
    setRows: React.Dispatch<React.SetStateAction<MetadataRow[]>>;
  }) => {
    const matches = useMetadataFilter();
    const update = (id: number, change: Partial<MetadataRow>) =>
      setRows((current) => current.map((row) => (row.id === id ? { ...row, ...change } : row)));
    // Rows hidden by the filter stay in state so that saving never drops them.
    const visible = rows.filter((row) => row.editing || matches(row.key));

    return (
      <DrawerItem name={name}>
        <div className={styles.metadataRows}>
          {visible.map((row) =>
            row.editing ? (
              <div
                className={styles.metadataRow}
                key={row.id}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) update(row.id, { editing: false });
                }}
              >
                <input
                  aria-label={`${name} key`}
                  className={styles.metadataInput}
                  value={row.key}
                  onChange={(event) => update(row.id, { key: event.target.value })}
                  placeholder="Key (empty removes it)"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") update(row.id, { editing: false });
                  }}
                />
                <input
                  aria-label={`${name} value`}
                  className={styles.metadataInput}
                  value={row.value}
                  onChange={(event) => update(row.id, { value: event.target.value })}
                  placeholder="Value"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") update(row.id, { editing: false });
                  }}
                />
              </div>
            ) : (
              <div
                className={styles.metadataStatic}
                key={row.id}
                role="button"
                tabIndex={0}
                title="Double-click to edit"
                onDoubleClick={() => update(row.id, { editing: true })}
                onKeyDown={(event) => {
                  if (event.key === "Enter") update(row.id, { editing: true });
                }}
              >
                <span className={styles.metadataKey}>{row.key}</span>
                <span className={styles.metadataValue}>{row.value}</span>
              </div>
            ),
          )}
          <button
            type="button"
            className={styles.metadataAdd}
            onClick={() => setRows((current) => [...current, { id: ++lastRowId, key: "", value: "", editing: true }])}
          >
            + Add {name.toLowerCase().slice(0, -1)}
          </button>
        </div>
      </DrawerItem>
    );
  },
);
