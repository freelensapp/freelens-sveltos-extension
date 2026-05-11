import { Renderer } from "@freelensapp/extensions";
import * as MobxReact from "mobx-react";
import { SveltosPreferencesStore } from "../../common/store";
import { withErrorPage } from "../components/error-page";

import type { Sveltos } from "../k8s/sveltos/sveltos-v1alpha2";

const { observer } = MobxReact;

const {
  Component: { BadgeBoolean, DrawerItem, MarkdownViewer },
} = Renderer;

export interface SveltosDetailsProps extends Renderer.Component.KubeObjectDetailsProps<Sveltos> {
  extension: Renderer.LensExtension;
}

export const SveltosDetails = observer((props: SveltosDetailsProps) =>
  withErrorPage(props, () => {
    const { object } = props;
    const preferences = SveltosPreferencesStore.getInstance<SveltosPreferencesStore>();

    return (
      <>
        <DrawerItem name="Api Version">v1alpha2</DrawerItem>
        <DrawerItem name="Description">
          <MarkdownViewer markdown={object.spec.description ?? ""} />
        </DrawerItem>
        <DrawerItem name="Sveltos checkbox">
          <BadgeBoolean value={preferences.enabled} />
        </DrawerItem>
      </>
    );
  }),
);
