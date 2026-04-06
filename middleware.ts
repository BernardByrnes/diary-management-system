import { auth } from "@/lib/auth/auth";

export const middleware = auth((req) => {
  // Allow login, change-password, and API routes
  if (
    req.nextUrl.pathname.startsWith("/login") ||
    req.nextUrl.pathname.startsWith("/change-password") ||
    req.nextUrl.pathname.startsWith("/api/")
  ) {
    return;
  }

  // Redirect to login if not authenticated
  if (!req.auth) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    return Response.redirect(loginUrl);
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
