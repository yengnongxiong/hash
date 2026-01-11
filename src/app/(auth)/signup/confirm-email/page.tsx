import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, ArrowRight } from "lucide-react";

interface ConfirmEmailPageProps {
  searchParams: Promise<{ email?: string }>;
}

export default async function ConfirmEmailPage({ searchParams }: ConfirmEmailPageProps) {
  const params = await searchParams;
  const email = params.email || "your email";

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
          <CardDescription>
            We sent a confirmation link to
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="font-medium text-lg break-all">{decodeURIComponent(email)}</p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground space-y-2">
            <p>Click the link in the email to confirm your account and start using Hash.</p>
            <p>The link will expire in 24 hours.</p>
          </div>

          <div className="space-y-3">
            <Link href="/login" className="block">
              <Button className="w-full" variant="default">
                Continue to Login
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>

            <p className="text-center text-xs text-muted-foreground">
              Didn&apos;t receive the email? Check your spam folder or try logging in to resend.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
