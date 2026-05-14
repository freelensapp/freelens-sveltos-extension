/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Renderer } from "@freelensapp/extensions";
// transpiled .tsx code must have `React` symbol in the scope
// @ts-ignore
import React from "react";
import { SveltosPreferencesStore } from "../common/store";
import { createAvailableVersionPage } from "./components/available-version";
import { SveltosDetails as SveltosDetailsV1alpha1 } from "./details/sveltos-details-v1alpha1";
import { SveltosDetails as SveltosDetailsV1alpha2 } from "./details/sveltos-details-v1alpha2";
import { SveltosIcon } from "./icons";
import { Sveltos as SveltosV1alpha1 } from "./k8s/sveltos/sveltos-v1alpha1";
import { Sveltos as SveltosV1alpha2 } from "./k8s/sveltos/sveltos-v1alpha2";
import {
  SveltosActiveToggleMenuItem as SveltosActiveToggleMenuItem_v1alpha1,
  type SveltosActiveToggleMenuItemProps as SveltosActiveToggleMenuItemProps_v1alpha1,
} from "./menus/sveltos-active-toggle-menu-item-v1alpha1";
import {
  SveltosActiveToggleMenuItem as SveltosActiveToggleMenuItem_v1alpha2,
  type SveltosActiveToggleMenuItemProps as SveltosActiveToggleMenuItemProps_v1alpha2,
} from "./menus/sveltos-active-toggle-menu-item-v1alpha2";
import { ClustersPage } from "./modules/clusters";
import { Overview } from "./modules/overview";
import { ProfilesPage } from "./modules/profiles";
import { SveltosPage as SveltosPageV1alpha1 } from "./pages/sveltos-page-v1alpha1";
import { SveltosPage as SveltosPageV1alpha2 } from "./pages/sveltos-page-v1alpha2";
import { SveltosPreferenceHint, SveltosPreferenceInput } from "./preferences/sveltos-preference";

export default class SveltosRenderer extends Renderer.LensExtension {
  async onActivate() {
    SveltosPreferencesStore.getInstanceOrCreate().loadExtension(this);
  }

  appPreferences = [
    {
      title: "Sveltos Preferences",
      components: {
        Input: () => <SveltosPreferenceInput />,
        Hint: () => <SveltosPreferenceHint />,
      },
    },
  ];

  kubeObjectDetailItems = [
    {
      kind: SveltosV1alpha1.kind,
      apiVersions: SveltosV1alpha1.crd.apiVersions,
      priority: 10,
      components: {
        Details: (props: Renderer.Component.KubeObjectDetailsProps<any>) => (
          <SveltosDetailsV1alpha1 {...props} extension={this} />
        ),
      },
    },
    {
      kind: SveltosV1alpha2.kind,
      apiVersions: SveltosV1alpha2.crd.apiVersions,
      priority: 10,
      components: {
        Details: (props: Renderer.Component.KubeObjectDetailsProps<any>) => (
          <SveltosDetailsV1alpha2 {...props} extension={this} />
        ),
      },
    },
  ];

  clusterPages = [
    {
      id: "sveltos",
      components: {
        Page: () => <SveltosPageV1alpha1 extension={this} />,
      },
    },
    {
      id: "sveltos",
      components: {
        Page: () => <SveltosPageV1alpha2 extension={this} />,
      },
    },
    {
      id: "sveltos",
      components: {
        Page: createAvailableVersionPage("Sveltos", [
          { kubeObjectClass: SveltosV1alpha2, PageComponent: SveltosPageV1alpha2, version: "v1alpha2" },
          { kubeObjectClass: SveltosV1alpha1, PageComponent: SveltosPageV1alpha1, version: "v1alpha1" },
        ]),
      },
    },
    {
      id: "sveltos-overview",
      components: {
        Page: () => <Overview extension={this} />,
      },
    },
    {
      id: "sveltos-clusters",
      components: {
        Page: () => <ClustersPage extension={this} />,
      },
    },
    {
      id: "sveltos-profiles",
      components: {
        Page: () => <ProfilesPage extension={this} />,
      },
    },
  ];

  clusterPageMenus = [
    {
      id: "sveltos",
      title: SveltosV1alpha1.crd.title,
      target: { pageId: "sveltos-overview" },
      components: {
        Icon: SveltosIcon,
      },
    },
    {
      id: "sveltos-overview",
      parentId: "sveltos",
      title: "Overview",
      target: { pageId: "sveltos-overview" },
      components: {},
    },
    {
      id: "sveltos-clusters",
      parentId: "sveltos",
      title: "Clusters",
      target: { pageId: "sveltos-clusters" },
      components: {},
    },
    {
      id: "sveltos-profiles",
      parentId: "sveltos",
      title: "Profiles",
      target: { pageId: "sveltos-profiles" },
      components: {},
    },
  ];

  kubeObjectMenuItems = [
    {
      kind: SveltosV1alpha1.kind,
      apiVersions: SveltosV1alpha1.crd.apiVersions,
      components: {
        MenuItem: (props: SveltosActiveToggleMenuItemProps_v1alpha1) => (
          <SveltosActiveToggleMenuItem_v1alpha1 {...props} extension={this} />
        ),
      },
    },
    {
      kind: SveltosV1alpha2.kind,
      apiVersions: SveltosV1alpha2.crd.apiVersions,
      components: {
        MenuItem: (props: SveltosActiveToggleMenuItemProps_v1alpha2) => (
          <SveltosActiveToggleMenuItem_v1alpha2 {...props} extension={this} />
        ),
      },
    },
  ];
}
