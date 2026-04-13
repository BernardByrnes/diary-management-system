import { auth } from "@/lib/auth/auth";
import { NextResponse } from "next/server";
import type { Role } from "@prisma/client";

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const isLoggedIn = !!session?.user;
  const isOnLogin = nextUrl.pathname.startsWith("/auth/login");
  const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");

  // Redirect unauthenticated users to login
  if (isOnDashboard && !isLoggedIn) {
    return NextResponse.redirect(new URL("/auth/login", nextUrl));
  }

  // Redirect authenticated users away from login
  if (isOnLogin && isLoggedIn) {
    const mustChange = (session.user as { mustChangePassword?: boolean }).mustChangePassword;
    if (mustChange) {
      return NextResponse.redirect(new URL("/change-password", nextUrl));
    }
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  // Force password change
  if (isLoggedIn) {
    const mustChange = (session.user as { mustChangePassword?: boolean }).mustChangePassword;
    const isOnChangePw =
      nextUrl.pathname.startsWith("/change-password") ||
      nextUrl.pathname.startsWith("/dashboard/change-password");
    if (mustChange && !isOnChangePw) {
      return NextResponse.redirect(new URL("/change-password", nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
