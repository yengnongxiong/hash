import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Email is now confirmed - create user profile if it doesn't exist
      const adminClient = createAdminClient();

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
          // No org info - this shouldn't happen for normal signups
          console.error("No organization_id in user metadata for:", data.user.id);
          return NextResponse.redirect(
            `${origin}/login?error=Missing organization. Please sign up again.`
          );
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate user`);
}
