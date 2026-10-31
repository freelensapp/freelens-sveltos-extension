import { Renderer } from "@freelensapp/extensions";
import styles from "./dashboard.module.scss";

const {
  Component: { ReactiveDuration },
} = Renderer;

export interface LastUpdateProps {
  timestamp?: string;
  placeholder?: string;
}

export function LastUpdate({ timestamp, placeholder = "-" }: LastUpdateProps) {
  if (!timestamp) return <>{placeholder}</>;

  return (
    <span className={styles.lastUpdate} title={new Date(timestamp).toLocaleString()}>
      <ReactiveDuration timestamp={timestamp} /> ago
    </span>
  );
}
