import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { can, homePath, type Action } from "./permissions";

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session.user as {
    id: string;
    name?: string | null;
    email?: string | null;
    role: Role;
  };
}

export async function requirePermission(action: Action) {
  const user = await requireSession();
  if (!can(user.role, action)) {
    redirect(homePath(user.role));
  }
  return user;
}

/** For form actions: return an error instead of redirecting (redirects crash useActionState). */
export async function actionUser(permission: Action) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Sign in again, then retry." as const };
  }
  const user = session.user as {
    id: string;
    name?: string | null;
    email?: string | null;
    role: Role;
  };
  if (!can(user.role, permission)) {
    return { error: "You cannot do that." as const };
  }
  return { user };
}
