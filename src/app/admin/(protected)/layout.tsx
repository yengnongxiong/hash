import { redirect } from "next/navigation";
import { isAdminSessionValid } from "@/lib/admin/auth";

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check if admin has valid session (created after OTP verification)
  const hasValidSession = await isAdminSessionValid();

  if (!hasValidSession) {
    // Need to log in with OTP
    redirect("/admin/login");
  }

  return <>{children}</>;
}
