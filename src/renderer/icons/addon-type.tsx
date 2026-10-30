import { Renderer } from "@freelensapp/extensions";
import kustomizeSvg from "./kustomize.svg?raw";
import resourcesSvg from "./resources.svg?raw";

import type { AddonType } from "../api/addons";

const {
  Component: { Icon },
} = Renderer;

/** Helm reuses the logo bundled with Freelens, the other two are shipped here. */
export function AddonTypeIcon({ type, ...props }: Renderer.Component.IconProps & { type: AddonType }) {
  switch (type) {
    case "Helm":
      return <Icon {...props} svg="helm" />;
    case "Kustomize":
      return <Icon {...props} svg={kustomizeSvg} />;
    default:
      return <Icon {...props} svg={resourcesSvg} />;
  }
}
