import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { registerTrustedDevice } from "@/lib/auth/device";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ADMIN_EMAIL,
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_DURATION_HOURS,
} from "@/lib/constants";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const isAdmin = searchParams.get("admin") === "true";
  const trustDevice = searchParams.get("trust_device") === "true";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const adminClient = createAdminClient();

      // Handle admin login
      if (isAdmin) {
        // Verify this is the admin email
        if (data.user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
          // Create admin session
          const sessionExpiresAt = new Date(
            Date.now() + ADMIN_SESSION_DURATION_HOURS * 60 * 60 * 1000
          );

          const { data: session, error: sessionError } = await adminClient
            .from("admin_sessions")
            .insert({
              user_id: data.user.id,
              expires_at: sessionExpiresAt.toISOString(),
            })
            .select()
            .single();

          if (!sessionError && session) {
            // Set session cookie
            const cookieStore = await cookies();
            cookieStore.set(ADMIN_SESSION_COOKIE, session.id, {
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
              expires: sessionExpiresAt,
              path: "/",
            });

            // Log admin login
            await adminClient.from("admin_activity_log").insert({
              action_type: "admin_login_magic_link",
              actor_email: ADMIN_EMAIL,
              metadata: { session_id: session.id, method: "magic_link" },
            });

            return NextResponse.redirect(`${origin}/admin`);
          } else {
            console.error("Failed to create admin session:", sessionError);
            return NextResponse.redirect(
              `${origin}/admin/login?error=Failed to create admin session`
            );
          }
        } else {
          // Not the admin email
          return NextResponse.redirect(
            `${origin}/admin/login?error=Invalid admin email`
          );
        }
      }

      // Handle device trust
      if (trustDevice) {
        const result = await registerTrustedDevice(data.user.id);
        if (!result.success) {
          console.warn("Failed to register trusted device:", result.error);
          // Continue anyway - don't block the user
        }
        return NextResponse.redirect(`${origin}${next}`);
      }

      // Regular auth callback - create user profile if it doesn't exist
      // Check if user profile already exists
      const { data: existingProfile } = await adminClient
        .from("users")
        .select("id")
        .eq("id", data.user.id)
        .single();

      if (!existingProfile) {
        // Get org info from user metadata (set during signup)
        const metadata = data.user.user_metadata;
        const organizationId = metadata?.organization_id;
        const name = metadata?.name || data.user.email?.split("@")[0] || "User";

        if (organizationId) {
          // Create user profile now that email is verified
          const { error: profileError } = await adminClient.from("users").insert({
            id: data.user.id,
            organization_id: organizationId,
            email: data.user.email!,
            name: name,
            role: "member",
          });

          if (profileError) {
            console.error("Failed to create user profile:", profileError);
            return NextResponse.redirect(
              `${origin}/login?error=Profile creation failed. Please contact support.`
            );
          }
        } else {
          // No org info - this might be admin or existing user logging in via magic link
          // Check if this is the admin email
          if (data.user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
            // Admin user - redirect to admin login to get proper session
            return NextResponse.redirect(`${origin}/admin/login`);
          }

          // For regular users without org info, just let them through
          // They might be an existing user
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate user`);
}
