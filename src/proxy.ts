import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = ["/login", "/signup", "/auth/callback", "/auth/confirm"];
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Admin routes are handled separately with their own 2FA
  const isAdminRoute = pathname.startsWith("/admin");

  // If user is not authenticated and trying to access protected route
  // Admin routes have their own 2FA auth, so they handle redirection themselves
  if (!user && !isPublicRoute && !isAdminRoute && pathname !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // If admin user is trying to access dashboard routes, redirect to admin panel
  const adminEmail = process.env.ADMIN_EMAIL || "";
  const isDashboardRoute = !isPublicRoute && !isAdminRoute && pathname !== "/";
  if (user && isDashboardRoute && user.email?.toLowerCase() === adminEmail.toLowerCase()) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  // If user is authenticated and trying to access auth pages
  if (user && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    // Check if this is the admin user - redirect to admin panel instead
    const adminEmail = process.env.ADMIN_EMAIL || "";
    if (user.email?.toLowerCase() === adminEmail.toLowerCase()) {
      url.pathname = "/admin";
    } else {
      url.pathname = "/dashboard";
    }
    return NextResponse.redirect(url);
  }

  // Redirect root to appropriate location based on auth status
  if (pathname === "/") {
    const url = request.nextUrl.clone();
    if (user) {
      // Check if admin user
      const adminEmail = process.env.ADMIN_EMAIL || "";
      url.pathname = user.email?.toLowerCase() === adminEmail.toLowerCase() ? "/admin" : "/dashboard";
    } else {
      url.pathname = "/login";
    }
    return NextResponse.redirect(url);
  }

  // Add cache-control headers to prevent bfcache on all app routes
  // This ensures the browser doesn't show cached versions when using back button
  // Critical for security: prevents unauthenticated users from seeing cached dashboard
  supabaseResponse.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
  );
  supabaseResponse.headers.set("Pragma", "no-cache");
  supabaseResponse.headers.set("Expires", "0");

  return supabaseResponse;
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
