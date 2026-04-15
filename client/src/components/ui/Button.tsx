import styles from "./Button.module.css";

type Variant = "primary" | "secondary" | "danger";
type Size = "sm" | "md";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  const cls = [
    styles.btn,
    styles[variant],
    size === "sm" ? styles.sm : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button className={cls} {...props}>
      {children}
    </button>
  );
}
