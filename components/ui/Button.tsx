"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl px-4 text-sm font-medium transition-colors duration-[var(--motion)] ease-[var(--ease)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text)] disabled:cursor-not-allowed disabled:opacity-50";
  const styles =
    variant === "primary"
      ? "bg-[var(--text)] text-white hover:bg-[var(--text-hover)]"
      : variant === "danger"
        ? "border border-[var(--danger)] bg-[var(--surface)] text-[var(--danger)] hover:bg-[var(--tint-danger)]"
        : "border border-[var(--line)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--ground)]";
  return (
    <button className={`${base} ${styles} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "ghost";
}) {
  const base =
    "inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl px-4 text-sm font-medium transition-colors duration-[var(--motion)] ease-[var(--ease)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text)]";
  const styles =
    variant === "primary"
      ? "bg-[var(--text)] text-white hover:bg-[var(--text-hover)]"
      : "border border-[var(--line)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--ground)]";
  return (
    <Link href={href} className={`${base} ${styles}`}>
      {children}
    </Link>
  );
}

export function SubmitButton({
  children,
  variant = "primary",
  pendingLabel = "Saving…",
}: {
  children: React.ReactNode;
  variant?: "primary" | "ghost" | "danger";
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending} aria-busy={pending}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
