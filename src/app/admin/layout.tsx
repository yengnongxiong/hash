import { redirect } from "next/navigation";
import { isAdminUser, isAdminSessionValid } from "@/lib/admin/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check if user is the admin
  const { isAdmin } = await isAdminUser();

  if (!isAdmin) {
    // Not the admin email - redirect to dashboard
    redirect("/dashboard");
  }

  // Check if admin session is valid
  const isVerified = await isAdminSessionValid();

  // Get current path (we need to allow access to verify page)
  // The verify page will handle its own auth

  return <>{children}</>;
}
