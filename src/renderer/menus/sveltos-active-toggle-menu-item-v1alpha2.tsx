import { Renderer } from "@freelensapp/extensions";
import { withErrorPage } from "../components/error-page";
import { Sveltos } from "../k8s/sveltos/sveltos-v1alpha2";

const {
  Component: { MenuItem, Icon },
} = Renderer;

export interface SveltosActiveToggleMenuItemProps extends Renderer.Component.KubeObjectMenuProps<Sveltos> {
  extension: Renderer.LensExtension;
}

export const SveltosActiveToggleMenuItem = (props: SveltosActiveToggleMenuItemProps) =>
  withErrorPage(props, () => {
    const { object, toolbar } = props;

    if (!object) return <></>;

    const store = Sveltos.getStore<Sveltos>();

    const disable = async () => {
      await store.patch(
        object,
        {
          spec: {
            suspended: true,
          },
        },
        "merge",
      );
    };

    const enable = async () => {
      await store.patch(
        object,
        {
          spec: {
            suspended: false,
          },
        },
        "merge",
      );
    };

    if (object.spec.suspended) {
      return (
        <MenuItem onClick={enable}>
          <Icon material="play_circle_outline" interactive={toolbar} title="Resume" />
          <span className="title">Resume</span>
        </MenuItem>
      );
    } else {
      return (
        <MenuItem onClick={disable}>
          <Icon material="pause_circle_filled" interactive={toolbar} title="Suspend" />
          <span className="title">Suspend</span>
        </MenuItem>
      );
    }
  });
