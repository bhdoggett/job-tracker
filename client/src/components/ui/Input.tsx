import styles from "./Input.module.css";

interface FieldProps {
  label: string;
  error?: string;
}

interface InputProps
  extends FieldProps,
    React.InputHTMLAttributes<HTMLInputElement> {}

interface SelectProps
  extends FieldProps,
    React.SelectHTMLAttributes<HTMLSelectElement> {
  children: React.ReactNode;
}

interface TextareaProps
  extends FieldProps,
    React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export function Input({ label, error: _error, ...props }: InputProps) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      <input className={styles.input} {...props} />
    </div>
  );
}

export function Select({
  label,
  error: _error,
  children,
  ...props
}: SelectProps) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      <select className={styles.select} {...props}>
        {children}
      </select>
    </div>
  );
}

export function Textarea({ label, error: _error, ...props }: TextareaProps) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      <textarea className={styles.textarea} {...props} />
    </div>
  );
}
