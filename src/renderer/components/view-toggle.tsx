import { Renderer } from "@freelensapp/extensions";
import styles from "./dashboard.module.scss";

const {
  Component: { Icon },
} = Renderer;

export type ViewMode = "cards" | "table";

export interface ViewToggleProps {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
}

const options: { value: ViewMode; material: string; label: string }[] = [
  { value: "cards", material: "view_module", label: "Cards" },
  { value: "table", material: "view_list", label: "Table" },
];

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div className={styles.viewToggle}>
      {options.map((option) => (
        <button
          type="button"
          key={option.value}
          title={`${option.label} view`}
          className={`${styles.viewToggleButton} ${value === option.value ? styles.viewToggleButtonActive : ""}`}
          onClick={() => onChange(option.value)}
        >
          <Icon material={option.material} small />
          {option.label}
        </button>
      ))}
    </div>
  );
}
