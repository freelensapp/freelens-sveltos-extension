import { Renderer } from "@freelensapp/extensions";
import svgIcon from "./sveltos.svg?raw";

const {
  Component: { Icon },
} = Renderer;

export function SveltosIcon(props: Renderer.Component.IconProps) {
  return <Icon {...props} svg={svgIcon} />;
}

export function OverviewIcon(props: Renderer.Component.IconProps) {
  return <Icon {...props} material="dashboard" />;
}

export function ClustersIcon(props: Renderer.Component.IconProps) {
  return <Icon {...props} material="dns" />;
}

export function ProfilesIcon(props: Renderer.Component.IconProps) {
  return <Icon {...props} material="assignment" />;
}

export function DependenciesIcon(props: Renderer.Component.IconProps) {
  return <Icon {...props} material="account_tree" />;
}

export function AddonsIcon(props: Renderer.Component.IconProps) {
  return <Icon {...props} material="extension" />;
}

export function DryRunIcon(props: Renderer.Component.IconProps) {
  return <Icon {...props} material="play_circle_outline" />;
}

export function EventsIcon(props: Renderer.Component.IconProps) {
  return <Icon {...props} material="flash_on" />;
}

export function ClassifiersIcon(props: Renderer.Component.IconProps) {
  return <Icon {...props} material="label" />;
}
