import styles from "./Badge.module.css";

interface BadgeProps {
  value: string;
}

export function Badge({ value }: BadgeProps) {
  const cls = styles[value as keyof typeof styles] ?? "";
  return <span className={`${styles.badge} ${cls}`}>{value.replace("_", " ")}</span>;
}
