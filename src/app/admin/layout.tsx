import { redirect } from "next/navigation";
import { isAdminEmail } from "@/lib/admin/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check if user is logged in as admin email
  const isAdmin = await isAdminEmail();

  if (!isAdmin) {
    // Not the admin user - redirect to admin login
    redirect("/admin/login");
  }

  return <>{children}</>;
}
