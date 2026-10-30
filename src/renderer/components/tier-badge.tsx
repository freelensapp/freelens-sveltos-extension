import { Renderer } from "@freelensapp/extensions";
import styles from "./dashboard.module.scss";

const {
  Component: { Icon },
} = Renderer;

const defaultTier = 100;

export interface TierBadgeProps {
  tier?: number;
}

/** In Sveltos the lowest tier wins when two profiles claim the same resource. */
export function TierBadge({ tier }: TierBadgeProps) {
  const value = tier ?? defaultTier;

  if (value < defaultTier) {
    return (
      <span className={`${styles.tierBadge} ${styles.tierBadgeHigh}`} title={`Tier ${value} - wins over the default`}>
        <Icon material="arrow_upward" smallest />
        {value}
      </span>
    );
  }

  if (value > defaultTier) {
    return (
      <span className={`${styles.tierBadge} ${styles.tierBadgeLow}`} title={`Tier ${value} - yields to the default`}>
        <Icon material="arrow_downward" smallest />
        {value}
      </span>
    );
  }

  return (
    <span className={`${styles.tierBadge} ${styles.tierBadgeDefault}`} title="Default tier">
      <Icon material="remove" smallest />
      {value}
    </span>
  );
}
