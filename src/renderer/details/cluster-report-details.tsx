import { Renderer } from "@freelensapp/extensions";
import * as MobxReact from "mobx-react";
import { ClusterReport } from "../api/config/cluster-report-v1beta1";
import { withErrorPage } from "../components/error-page";

const { observer } = MobxReact;

const {
  Component: { DrawerItem, DrawerTitle },
} = Renderer;

export interface ClusterReportDetailsProps extends Renderer.Component.KubeObjectDetailsProps<ClusterReport> {
  extension: Renderer.LensExtension;
}

export const ClusterReportDetails = observer((props: ClusterReportDetailsProps) =>
  withErrorPage(props, () => {
    const { object } = props;
    const releaseReports = object.status?.releaseReports ?? [];
    const resourceReports = ClusterReport.getAllResourceReports(object);

    return (
      <>
        <DrawerTitle>Cluster</DrawerTitle>
        <DrawerItem name="Cluster">
          {`${object.spec?.clusterNamespace ?? ""}/${object.spec?.clusterName ?? ""}`}
        </DrawerItem>

        <DrawerTitle>Helm Changes</DrawerTitle>
        {releaseReports.length === 0 ? <DrawerItem name="Helm Changes">None</DrawerItem> : null}
        {releaseReports.map((report) => (
          <DrawerItem
            key={`${report.releaseNamespace}/${report.chartName}`}
            name={`${report.releaseNamespace}/${report.chartName}`}
          >
            {[report.action, report.chartVersion, report.message].filter(Boolean).join(" · ")}
          </DrawerItem>
        ))}

        <DrawerTitle>Resource Changes</DrawerTitle>
        {resourceReports.length === 0 ? <DrawerItem name="Resource Changes">None</DrawerItem> : null}
        {resourceReports.map((report, index) => (
          <DrawerItem
            key={`${report.resource.kind}-${report.resource.namespace}-${report.resource.name}-${index}`}
            name={`${report.resource.kind}: ${
              report.resource.namespace ? `${report.resource.namespace}/${report.resource.name}` : report.resource.name
            }`}
          >
            {[report.action, report.message].filter(Boolean).join(" · ")}
          </DrawerItem>
        ))}
      </>
    );
  }),
);
