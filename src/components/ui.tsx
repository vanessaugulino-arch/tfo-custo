import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, LabelHTMLAttributes, ReactNode } from "react";

export function Card({ children, className = "", ...rest }: { children: ReactNode; className?: string } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} className={`rounded-xl border border-border bg-card text-card-foreground p-5 ${className}`}>
      {children}
    </div>
  );
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-serif text-foreground">{title}</h1>
      {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
  ...rest
}: { label: string; children: ReactNode; hint?: ReactNode } & LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label {...rest} className={`flex flex-col gap-1.5 text-sm ${rest.className ?? ""}`}>
      <span className="font-medium text-foreground flex items-center gap-1.5">
        {label}
        {hint}
      </span>
      {children}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:border-secondary focus:ring-1 focus:ring-secondary ${props.className ?? ""}`}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:border-secondary focus:ring-1 focus:ring-secondary ${props.className ?? ""}`}
    />
  );
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  const styles: Record<string, string> = {
    primary: "bg-primary text-primary-foreground hover:opacity-90",
    secondary: "bg-card border border-border hover:bg-muted",
    danger: "bg-destructive text-destructive-foreground hover:opacity-90",
    ghost: "hover:bg-muted",
  };
  return (
    <button
      {...props}
      className={`rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
    />
  );
}

export function Badge({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "success" | "danger" | "muted" }) {
  const styles: Record<string, string> = {
    default: "bg-accent text-accent-foreground",
    success: "bg-success/10 text-success",
    danger: "bg-destructive/10 text-destructive",
    muted: "bg-muted text-muted-foreground",
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[tone]}`}>{children}</span>;
}

export function ExtraLabel(props: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label {...props} className={`text-xs text-muted-foreground ${props.className ?? ""}`} />;
}

export function Checkbox({
  label,
  checked,
  onChange,
  hint,
}: {
  label: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: ReactNode;
}) {
  return (
    <label className="flex items-start gap-2 text-sm cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-border text-secondary focus:ring-secondary"
      />
      <span className="flex items-center gap-1.5 font-medium text-foreground">
        {label}
        {hint}
      </span>
    </label>
  );
}
