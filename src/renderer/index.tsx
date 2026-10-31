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
import { EventTrigger } from "./api/lib/event-trigger-v1beta1";
import { SveltosCluster } from "./api/lib/sveltos-cluster-v1beta1";
import { setMetadataFilterFetcher } from "./api/metadata-filter";
import { setUiSettingsFetcher } from "./api/ui-settings";
import { createAvailableVersionPage } from "./components/available-version";
import {
  withDetailsErrorBoundary,
  withMenuItemErrorBoundary,
  withPageErrorBoundary,
} from "./components/error-boundary";
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
import { SveltosClusterPauseMenuItem } from "./menus/sveltos-cluster-pause-menu-item";
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

// Each page is created once: the host passes a cluster page only `params`, so the registration renders it with the
// extension.
const SveltosClustersVersionPage = createAvailableVersionPage("Sveltos Clusters", [
  { kubeObjectClass: SveltosCluster, PageComponent: SveltosClustersPage, version: "v1beta1" },
]);
const ClusterProfilesVersionPage = createAvailableVersionPage("Cluster Profiles", [
  { kubeObjectClass: ClusterProfile, PageComponent: ClusterProfilesPage, version: "v1beta1" },
]);
const ProfilesVersionPage = createAvailableVersionPage("Profiles", [
  { kubeObjectClass: Profile, PageComponent: ProfilesPage, version: "v1beta1" },
]);
const DependenciesVersionPage = createAvailableVersionPage("Dependencies", [
  { kubeObjectClass: ClusterProfile, PageComponent: ProfileDependenciesPage, version: "v1beta1" },
]);
const AddonsVersionPage = createAvailableVersionPage("Add-ons", [
  { kubeObjectClass: ClusterSummary, PageComponent: ClusterSummariesPage, version: "v1beta1" },
]);
const DryRunVersionPage = createAvailableVersionPage("Dry Run", [
  { kubeObjectClass: ClusterReport, PageComponent: ClusterReportsPage, version: "v1beta1" },
]);
const EventSourcesVersionPage = createAvailableVersionPage("Event Sources", [
  { kubeObjectClass: EventSource, PageComponent: EventSourcesPage, version: "v1beta1" },
]);
const EventTriggersVersionPage = createAvailableVersionPage("Event Triggers", [
  { kubeObjectClass: EventTrigger, PageComponent: EventTriggersPage, version: "v1beta1" },
]);
const ClassifiersVersionPage = createAvailableVersionPage("Classifiers", [
  { kubeObjectClass: Classifier, PageComponent: ClassifiersPage, version: "v1beta1" },
]);

class SveltosIpcRenderer extends Renderer.Ipc {}

// Every page, details panel and menu item renders inside an error boundary, so that an error it throws stays in its
// place: the host has none around the details drawer or a menu item, and its boundary around the cluster frame would
// replace the whole cluster view. Each registration field is mapped through its wrapper, so an entry added to it is
// wrapped too.
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

  kubeObjectDetailItems: Renderer.LensExtension["kubeObjectDetailItems"] = [
    Renderer.K8sApi.detailsFor(SveltosCluster, { priority: 10, Details: SveltosClusterDetails }),
    Renderer.K8sApi.detailsFor(ClusterProfile, { priority: 10, Details: ProfileDetails }),
    Renderer.K8sApi.detailsFor(Profile, { priority: 10, Details: ProfileDetails }),
    Renderer.K8sApi.detailsFor(ClusterSummary, { priority: 10, Details: ClusterSummaryDetails }),
    Renderer.K8sApi.detailsFor(ClusterReport, { priority: 10, Details: ClusterReportDetails }),
    Renderer.K8sApi.detailsFor(ClusterConfiguration, { priority: 10, Details: ClusterConfigurationDetails }),
    Renderer.K8sApi.detailsFor(EventSource, { priority: 10, Details: EventSourceDetails }),
    Renderer.K8sApi.detailsFor(EventTrigger, { priority: 10, Details: EventTriggerDetails }),
    Renderer.K8sApi.detailsFor(Classifier, { priority: 10, Details: ClassifierDetails }),
  ].map((registration) => withDetailsErrorBoundary(this, registration));

  clusterPages: Renderer.LensExtension["clusterPages"] = [
    {
      id: "sveltos-overview",
      components: {
        Page: () => <OverviewPage extension={this} getLatestRelease={this.getLatestRelease} />,
      },
    },
    {
      id: "sveltos-clusters",
      components: {
        Page: () => <SveltosClustersVersionPage extension={this} />,
      },
    },
    {
      id: "sveltos-cluster-profiles",
      components: {
        Page: () => <ClusterProfilesVersionPage extension={this} />,
      },
    },
    {
      id: "sveltos-profiles",
      components: {
        Page: () => <ProfilesVersionPage extension={this} />,
      },
    },
    {
      id: "sveltos-dependencies",
      components: {
        Page: () => <DependenciesVersionPage extension={this} />,
      },
    },
    {
      id: "sveltos-addons",
      components: {
        Page: () => <AddonsVersionPage extension={this} />,
      },
    },
    {
      id: "sveltos-dry-run",
      components: {
        Page: () => <DryRunVersionPage extension={this} />,
      },
    },
    {
      id: "sveltos-event-sources",
      components: {
        Page: () => <EventSourcesVersionPage extension={this} />,
      },
    },
    {
      id: "sveltos-event-triggers",
      components: {
        Page: () => <EventTriggersVersionPage extension={this} />,
      },
    },
    {
      id: "sveltos-classifiers",
      components: {
        Page: () => <ClassifiersVersionPage extension={this} />,
      },
    },
  ].map((registration) => withPageErrorBoundary(this, registration));

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

  // The kinds the extension presents in pages of its own, so the Custom Resources tree of the cluster sidebar does not
  // list them a second time. ClusterConfiguration only gets a details panel, and the ClusterAPI Cluster belongs to
  // ClusterAPI: both stay in the tree.
  customResources = [
    SveltosCluster,
    ClusterProfile,
    Profile,
    ClusterSummary,
    ClusterReport,
    EventSource,
    EventTrigger,
    Classifier,
  ];

  kubeObjectMenuItems: Renderer.LensExtension["kubeObjectMenuItems"] = [
    Renderer.K8sApi.menuItemFor(SveltosCluster, { MenuItem: SveltosClusterPauseMenuItem }),
  ].map((registration) => withMenuItemErrorBoundary(this, registration));
}
