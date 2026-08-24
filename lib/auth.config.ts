import type { Role } from "@prisma/client";
import type { NextAuthConfig } from "next-auth";
import { homePath } from "./permissions";

export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = Boolean(auth?.user);
      const { pathname } = request.nextUrl;
      // Server actions must get an RSC payload. An HTML redirect here
      // surfaces as "An unexpected response was received from the server."
      const isServerAction = request.headers.has("next-action");
      const isPublic =
        pathname.startsWith("/login") || pathname.startsWith("/api/auth");

      if (isPublic) {
        if (isLoggedIn && pathname.startsWith("/login") && !isServerAction) {
          const role = (auth?.user as { role?: Role } | undefined)?.role;
          const home = role ? homePath(role) : "/dashboard";
          return Response.redirect(new URL(home, request.nextUrl));
        }
        return true;
      }

      if (!isLoggedIn) {
        if (isServerAction) return true;
        return false;
      }

      const role = (auth?.user as { role?: Role } | undefined)?.role;
      if (!isServerAction && pathname === "/dashboard" && role) {
        const home = homePath(role);
        if (home !== "/dashboard") {
          return Response.redirect(new URL(home, request.nextUrl));
        }
      }

      return true;
    },
    jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
