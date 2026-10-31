/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Renderer } from "@freelensapp/extensions";
import {
  chartIconChannel,
  helmReleaseChannel,
  latestReleaseChannel,
  metadataFilterChannel,
  uiSettingsChannel,
} from "../common/ipc-channels";
import { SveltosPreferencesStore } from "../common/store";
import { setChartIconFetcher } from "./api/chart-icon";
import { ClusterConfiguration } from "./api/config/cluster-configuration-v1beta1";
import { ClusterProfile } from "./api/config/cluster-profile-v1beta1";
import { ClusterReport } from "./api/config/cluster-report-v1beta1";
import { ClusterSummary } from "./api/config/cluster-summary-v1beta1";
import { Profile } from "./api/config/profile-v1beta1";
import { setHelmReleaseFetcher } from "./api/helm-release";
import { Classifier } from "./api/lib/classifier-v1beta1";
import { EventSource } from "./api/lib/event-source-v1beta1";
import { SveltosCluster } from "./api/lib/sveltos-cluster-v1beta1";
import { setMetadataFilterFetcher } from "./api/metadata-filter";
import { setUiSettingsFetcher } from "./api/ui-settings";
import { EventTrigger } from "./api/utils/event-trigger-v1beta1";
import { createAvailableVersionPage } from "./components/available-version";
import { ClassifierDetails } from "./details/classifier-details";
import { ClusterConfigurationDetails } from "./details/cluster-configuration-details";
import { ClusterReportDetails } from "./details/cluster-report-details";
import { ClusterSummaryDetails } from "./details/cluster-summary-details";
import { EventSourceDetails } from "./details/event-source-details";
import { EventTriggerDetails } from "./details/event-trigger-details";
import { ProfileDetails } from "./details/profile-details";
import { SveltosClusterDetails } from "./details/sveltos-cluster-details";
import {
  AddonsIcon,
  ClassifiersIcon,
  ClustersIcon,
  DependenciesIcon,
  DryRunIcon,
  EventsIcon,
  OverviewIcon,
  ProfilesIcon,
  SveltosIcon,
} from "./icons";
import {
  SveltosClusterPauseMenuItem,
  type SveltosClusterPauseMenuItemProps,
} from "./menus/sveltos-cluster-pause-menu-item";
import { ClassifiersPage } from "./pages/classifiers-page";
import { ClusterProfilesPage } from "./pages/cluster-profiles-page";
import { ClusterReportsPage } from "./pages/cluster-reports-page";
import { ClusterSummariesPage } from "./pages/cluster-summaries-page";
import { EventSourcesPage } from "./pages/event-sources-page";
import { EventTriggersPage } from "./pages/event-triggers-page";
import { OverviewPage } from "./pages/overview-page";
import { ProfileDependenciesPage } from "./pages/profile-dependencies-page";
import { ProfilesPage } from "./pages/profiles-page";
import { SveltosClustersPage } from "./pages/sveltos-clusters-page";
import { MetadataFilterPreferenceHint, MetadataFilterPreferenceInput } from "./preferences/metadata-filter-preference";
import { InsecureTlsPreferenceHint, InsecureTlsPreferenceInput } from "./preferences/tls-preference";

class SveltosIpcRenderer extends Renderer.Ipc {}

export default class SveltosRenderer extends Renderer.LensExtension {
  async onActivate() {
    SveltosPreferencesStore.getInstanceOrCreate<SveltosPreferencesStore>().loadExtension(this);
    SveltosIpcRenderer.createInstance(this);
    setChartIconFetcher((iconUrl) => SveltosIpcRenderer.getInstance().invoke(chartIconChannel, { iconUrl }));
    setMetadataFilterFetcher(() => SveltosIpcRenderer.getInstance().invoke(metadataFilterChannel));
    setHelmReleaseFetcher((request) => SveltosIpcRenderer.getInstance().invoke(helmReleaseChannel, request));
    setUiSettingsFetcher((request) => SveltosIpcRenderer.getInstance().invoke(uiSettingsChannel, request));
  }

  async onDeactivate() {
    SveltosIpcRenderer.resetInstance();
  }

  appPreferences = [
    {
      title: "Sveltos",
      components: {
        Input: () => <InsecureTlsPreferenceInput />,
        Hint: () => <InsecureTlsPreferenceHint />,
      },
    },
    {
      title: "Sveltos metadata filter",
      components: {
        Input: () => <MetadataFilterPreferenceInput />,
        Hint: () => <MetadataFilterPreferenceHint />,
      },
    },
  ];

  /** The renderer cannot reach the internet reliably, so main performs the request. */
  private getLatestRelease = async (force = false): Promise<string | undefined> =>
    SveltosIpcRenderer.getInstance().invoke(latestReleaseChannel, { force });

  kubeObjectDetailItems = [
    {
      kind: SveltosCluster.kind,
      apiVersions: SveltosCluster.crd.apiVersions,
      priority: 10,
      components: {
        Details: (props: Renderer.Component.KubeObjectDetailsProps<any>) => (
          <SveltosClusterDetails {...props} extension={this} />
        ),
      },
    },
    {
      kind: ClusterProfile.kind,
      apiVersions: ClusterProfile.crd.apiVersions,
      priority: 10,
      components: {
        Details: (props: Renderer.Component.KubeObjectDetailsProps<any>) => (
          <ProfileDetails {...props} extension={this} />
        ),
      },
    },
    {
      kind: Profile.kind,
      apiVersions: Profile.crd.apiVersions,
      priority: 10,
      components: {
        Details: (props: Renderer.Component.KubeObjectDetailsProps<any>) => (
          <ProfileDetails {...props} extension={this} />
        ),
      },
    },
    {
      kind: ClusterSummary.kind,
      apiVersions: ClusterSummary.crd.apiVersions,
      priority: 10,
      components: {
        Details: (props: Renderer.Component.KubeObjectDetailsProps<any>) => (
          <ClusterSummaryDetails {...props} extension={this} />
        ),
      },
    },
    {
      kind: ClusterReport.kind,
      apiVersions: ClusterReport.crd.apiVersions,
      priority: 10,
      components: {
        Details: (props: Renderer.Component.KubeObjectDetailsProps<any>) => (
          <ClusterReportDetails {...props} extension={this} />
        ),
      },
    },
    {
      kind: ClusterConfiguration.kind,
      apiVersions: ClusterConfiguration.crd.apiVersions,
      priority: 10,
      components: {
        Details: (props: Renderer.Component.KubeObjectDetailsProps<any>) => (
          <ClusterConfigurationDetails {...props} extension={this} />
        ),
      },
    },
    {
      kind: EventSource.kind,
      apiVersions: EventSource.crd.apiVersions,
      priority: 10,
      components: {
        Details: (props: Renderer.Component.KubeObjectDetailsProps<any>) => (
          <EventSourceDetails {...props} extension={this} />
        ),
      },
    },
    {
      kind: EventTrigger.kind,
      apiVersions: EventTrigger.crd.apiVersions,
      priority: 10,
      components: {
        Details: (props: Renderer.Component.KubeObjectDetailsProps<any>) => (
          <EventTriggerDetails {...props} extension={this} />
        ),
      },
    },
    {
      kind: Classifier.kind,
      apiVersions: Classifier.crd.apiVersions,
      priority: 10,
      components: {
        Details: (props: Renderer.Component.KubeObjectDetailsProps<any>) => (
          <ClassifierDetails {...props} extension={this} />
        ),
      },
    },
  ];

  clusterPages = [
    {
      id: "sveltos-overview",
      components: {
        Page: () => <OverviewPage extension={this} getLatestRelease={this.getLatestRelease} />,
      },
    },
    {
      id: "sveltos-clusters",
      components: {
        Page: createAvailableVersionPage("Sveltos Clusters", [
          { kubeObjectClass: SveltosCluster, PageComponent: SveltosClustersPage, version: "v1beta1" },
        ]),
      },
    },
    {
      id: "sveltos-cluster-profiles",
      components: {
        Page: createAvailableVersionPage("Cluster Profiles", [
          { kubeObjectClass: ClusterProfile, PageComponent: ClusterProfilesPage, version: "v1beta1" },
        ]),
      },
    },
    {
      id: "sveltos-profiles",
      components: {
        Page: createAvailableVersionPage("Profiles", [
          { kubeObjectClass: Profile, PageComponent: ProfilesPage, version: "v1beta1" },
        ]),
      },
    },
    {
      id: "sveltos-dependencies",
      components: {
        Page: createAvailableVersionPage("Dependencies", [
          { kubeObjectClass: ClusterProfile, PageComponent: ProfileDependenciesPage, version: "v1beta1" },
        ]),
      },
    },
    {
      id: "sveltos-addons",
      components: {
        Page: createAvailableVersionPage("Add-ons", [
          { kubeObjectClass: ClusterSummary, PageComponent: ClusterSummariesPage, version: "v1beta1" },
        ]),
      },
    },
    {
      id: "sveltos-dry-run",
      components: {
        Page: createAvailableVersionPage("Dry Run", [
          { kubeObjectClass: ClusterReport, PageComponent: ClusterReportsPage, version: "v1beta1" },
        ]),
      },
    },
    {
      id: "sveltos-event-sources",
      components: {
        Page: createAvailableVersionPage("Event Sources", [
          { kubeObjectClass: EventSource, PageComponent: EventSourcesPage, version: "v1beta1" },
        ]),
      },
    },
    {
      id: "sveltos-event-triggers",
      components: {
        Page: createAvailableVersionPage("Event Triggers", [
          { kubeObjectClass: EventTrigger, PageComponent: EventTriggersPage, version: "v1beta1" },
        ]),
      },
    },
    {
      id: "sveltos-classifiers",
      components: {
        Page: createAvailableVersionPage("Classifiers", [
          { kubeObjectClass: Classifier, PageComponent: ClassifiersPage, version: "v1beta1" },
        ]),
      },
    },
  ];

  clusterPageMenus = [
    {
      id: "sveltos",
      title: "Sveltos",
      components: {
        Icon: SveltosIcon,
      },
    },
    {
      id: "sveltos-overview",
      parentId: "sveltos",
      title: "Overview",
      target: { pageId: "sveltos-overview" },
      components: {
        Icon: OverviewIcon,
      },
    },
    {
      id: "sveltos-clusters",
      parentId: "sveltos",
      title: SveltosCluster.crd.title,
      target: { pageId: "sveltos-clusters" },
      components: {
        Icon: ClustersIcon,
      },
    },
    {
      id: "sveltos-cluster-profiles",
      parentId: "sveltos",
      title: ClusterProfile.crd.title,
      target: { pageId: "sveltos-cluster-profiles" },
      components: {
        Icon: ProfilesIcon,
      },
    },
    {
      id: "sveltos-profiles",
      parentId: "sveltos",
      title: Profile.crd.title,
      target: { pageId: "sveltos-profiles" },
      components: {
        Icon: ProfilesIcon,
      },
    },
    {
      id: "sveltos-dependencies",
      parentId: "sveltos",
      title: "Dependencies",
      target: { pageId: "sveltos-dependencies" },
      components: {
        Icon: DependenciesIcon,
      },
    },
    {
      id: "sveltos-addons",
      parentId: "sveltos",
      title: ClusterSummary.crd.title,
      target: { pageId: "sveltos-addons" },
      components: {
        Icon: AddonsIcon,
      },
    },
    {
      id: "sveltos-dry-run",
      parentId: "sveltos",
      title: ClusterReport.crd.title,
      target: { pageId: "sveltos-dry-run" },
      components: {
        Icon: DryRunIcon,
      },
    },
    {
      id: "sveltos-event-sources",
      parentId: "sveltos",
      title: EventSource.crd.title,
      target: { pageId: "sveltos-event-sources" },
      components: {
        Icon: EventsIcon,
      },
    },
    {
      id: "sveltos-event-triggers",
      parentId: "sveltos",
      title: EventTrigger.crd.title,
      target: { pageId: "sveltos-event-triggers" },
      components: {
        Icon: EventsIcon,
      },
    },
    {
      id: "sveltos-classifiers",
      parentId: "sveltos",
      title: Classifier.crd.title,
      target: { pageId: "sveltos-classifiers" },
      components: {
        Icon: ClassifiersIcon,
      },
    },
  ];

  kubeObjectMenuItems = [
    {
      kind: SveltosCluster.kind,
      apiVersions: SveltosCluster.crd.apiVersions,
      components: {
        MenuItem: (props: SveltosClusterPauseMenuItemProps) => (
          <SveltosClusterPauseMenuItem {...props} extension={this} />
        ),
      },
    },
  ];
}
