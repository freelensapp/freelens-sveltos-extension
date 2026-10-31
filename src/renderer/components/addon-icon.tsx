import { useChartIcon } from "../api/chart-icon";
import { AddonTypeIcon } from "../icons/addon-type";
import styles from "./dashboard.module.scss";

import type { AddonType } from "../api/addons";

const typeColors: Record<AddonType, string> = {
  Helm: "#0f6ea8",
  Resources: "#326ce5",
  Kustomize: "#7b42bc",
};

export interface AddonIconProps {
  type: AddonType;
  iconUrl?: string;
  tooltip?: string;
  small?: boolean;
}

/** Shows the chart logo Sveltos reports, otherwise the icon of the add-on type. */
export function AddonIcon({ type, iconUrl, tooltip, small }: AddonIconProps) {
  const logo = useChartIcon(type === "Helm" ? iconUrl : undefined);
  const sizeClass = small ? styles.addonBadgeSmall : "";

  if (logo) {
    return <img className={`${styles.addonLogo} ${sizeClass}`} src={logo} alt={type} title={tooltip ?? type} />;
  }

  return (
    <span
      className={`${styles.addonBadge} ${sizeClass}`}
      style={{ backgroundColor: typeColors[type] }}
      title={tooltip ?? type}
    >
      <AddonTypeIcon type={type} small />
    </span>
  );
}
