import { LoginForm } from "@/components/LoginForm";
import { APP_INITIAL, APP_NAME } from "@/lib/brand";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col justify-center px-4 py-16">
      <div className="mb-8">
        <span
          aria-hidden
          className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[var(--text)] text-sm font-semibold text-white"
        >
          {APP_INITIAL}
        </span>
        <p className="mt-4 text-xl font-semibold tracking-tight">{APP_NAME}</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-2 text-[var(--muted)]">
          Staff accounts only. Ask the owner if you do not have a login.
        </p>
      </div>
      <div className="rounded-[24px] bg-[var(--surface)] p-6 shadow-[var(--shadow)] sm:p-8">
        <LoginForm />
      </div>
    </main>
  );
}
