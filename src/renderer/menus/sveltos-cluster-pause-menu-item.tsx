import { Renderer } from "@freelensapp/extensions";
import { SveltosCluster } from "../api/lib/sveltos-cluster-v1beta1";

const {
  Component: { Icon, MenuItem },
} = Renderer;

export interface SveltosClusterPauseMenuItemProps extends Renderer.Component.KubeObjectMenuProps<SveltosCluster> {}

export const SveltosClusterPauseMenuItem = (props: SveltosClusterPauseMenuItemProps) => {
  const { object, toolbar } = props;

  if (!object) return <></>;

  const store = SveltosCluster.getStore<SveltosCluster>();
  const setPaused = async (paused: boolean) => {
    await store.patch(object, { spec: { paused } }, "merge");
  };

  if (object.spec?.paused) {
    return (
      <MenuItem onClick={() => setPaused(false)}>
        <Icon material="play_circle_outline" interactive={toolbar} title="Resume" />
        <span className="title">Resume</span>
      </MenuItem>
    );
  }

  return (
    <MenuItem onClick={() => setPaused(true)}>
      <Icon material="pause_circle_filled" interactive={toolbar} title="Pause" />
      <span className="title">Pause</span>
    </MenuItem>
  );
};
