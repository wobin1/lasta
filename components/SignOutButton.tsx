"use client";

import { logoutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";

export function SignOutButton() {
  return (
    <form action={logoutAction}>
      <Button type="submit" variant="ghost">
        Sign out
      </Button>
    </form>
  );
}
