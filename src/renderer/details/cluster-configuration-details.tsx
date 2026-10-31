import { Renderer } from "@freelensapp/extensions";
import * as MobxReact from "mobx-react";
import { ClusterConfiguration } from "../api/config/cluster-configuration-v1beta1";
import { LastUpdate } from "../components/last-update";

const { observer } = MobxReact;

const {
  Component: { DrawerItem, DrawerTitle },
} = Renderer;

export interface ClusterConfigurationDetailsProps
  extends Renderer.Component.KubeObjectDetailsProps<ClusterConfiguration> {}

export const ClusterConfigurationDetails = observer((props: ClusterConfigurationDetailsProps) => {
  const { object } = props;
  const charts = ClusterConfiguration.getDeployedCharts(object);

  return (
    <>
      <DrawerTitle>Cluster</DrawerTitle>
      <DrawerItem name="Cluster">{ClusterConfiguration.getClusterName(object) ?? "N/A"}</DrawerItem>

      <DrawerTitle>Deployed Helm Charts</DrawerTitle>
      {charts.length === 0 ? <DrawerItem name="Charts">None</DrawerItem> : null}
      {charts.map(({ profileKind, profileName, chart }) => (
        <DrawerItem key={`${chart.namespace}/${chart.releaseName}`} name={`${chart.namespace}/${chart.releaseName}`}>
          {[chart.chartVersion, chart.appVersion, chart.repoURL, `${profileKind}/${profileName}`]
            .filter(Boolean)
            .join(" · ")}
          {" · "}
          <LastUpdate timestamp={chart.lastAppliedTime} placeholder="never applied" />
        </DrawerItem>
      ))}
    </>
  );
});
