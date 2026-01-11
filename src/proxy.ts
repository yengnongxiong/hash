import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_EMAIL } from "@/lib/constants";

export default async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired - this is the key auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Routes that bypass auth checks entirely
  const bypassRoutes = [
    "/auth/callback",
    "/auth/confirm",
    "/verify-device",
    "/reset-password",
    "/signup/confirm-email",
  ];
  const isBypassRoute = bypassRoutes.some((route) => pathname.startsWith(route));

  // If this is a bypass route, allow access regardless of auth state
  if (isBypassRoute) {
    return addSecurityHeaders(supabaseResponse);
  }

  // Public routes that don't require authentication
  const publicRoutes = ["/login", "/signup", "/forgot-password"];
  const isPublicRoute = publicRoutes.some((route) => pathname === route || pathname.startsWith(route + "/"));

  // Admin routes are handled separately with their own 2FA
  const isAdminRoute = pathname.startsWith("/admin");

  // Protected dashboard routes
  const protectedRoutes = ["/dashboard", "/people", "/dates", "/documents", "/tasks", "/settings"];
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));

  // Check if user has a profile (completed signup)
  let hasProfile = false;
  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("id")
      .eq("id", user.id)
      .single();
    hasProfile = !!profile;
  }

  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  // If user is not authenticated and trying to access protected route
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // If user is authenticated but has no profile (incomplete signup) and trying to access protected routes
  if (user && !hasProfile && isProtectedRoute && !isAdmin) {
    // User hasn't completed signup - let them access public routes to complete signup
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // If authenticated user (with profile) trying to access auth pages, redirect appropriately
  if (user && hasProfile && isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = isAdmin ? "/admin" : "/dashboard";
    return NextResponse.redirect(url);
  }

  // Admin user trying to access regular dashboard routes - redirect to admin panel
  if (user && isAdmin && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  // Admin routes - let their own layout handle 2FA
  // But redirect non-admin users away from admin routes (except login)
  if (isAdminRoute && !pathname.startsWith("/admin/login")) {
    if (!user || !isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = user ? "/dashboard" : "/login";
      return NextResponse.redirect(url);
    }
  }

  // Redirect root to appropriate location based on auth status
  if (pathname === "/") {
    const url = request.nextUrl.clone();
    if (user && hasProfile) {
      url.pathname = isAdmin ? "/admin" : "/dashboard";
    } else {
      url.pathname = "/login";
    }
    return NextResponse.redirect(url);
  }

  return addSecurityHeaders(supabaseResponse);
}

// Add security headers to prevent caching of authenticated pages
function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
  );
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
