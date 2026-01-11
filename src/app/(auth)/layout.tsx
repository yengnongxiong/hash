export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth redirection is handled by middleware
  return <>{children}</>;
}
