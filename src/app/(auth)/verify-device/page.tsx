"use client";

import { useState, useEffect, useTransition } from "react";
import { resendVerificationLink, getPendingVerificationEmail } from "./actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { CheckCircle, RefreshCw, Smartphone, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function VerifyDevicePage() {
  const [email, setEmail] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [isResending, startResendTransition] = useTransition();

  useEffect(() => {
    getPendingVerificationEmail().then(setEmail);
  }, []);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  function handleResend() {
    startResendTransition(async () => {
      const result = await resendVerificationLink();
      if (result.success) {
        setCountdown(60);
        toast.success("New magic link sent! Check your email.");
      } else {
        toast.error(result.error || "Failed to resend link");
      }
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">
            Check Your Email
          </CardTitle>
          <CardDescription>
            Click the magic link in your email to verify this device
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {email && (
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground mb-2">
                We sent a magic link to:
              </p>
              <p className="font-medium">{email}</p>
            </div>
          )}

          <div className="text-center text-sm text-muted-foreground">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Smartphone className="h-4 w-4" />
              <span>New device detected</span>
            </div>
            <p>Click the link in your email to verify and trust this device.</p>
            <p className="mt-1">The link will expire in 1 hour.</p>
          </div>

          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Didn&apos;t receive the email?
            </p>
            <Button
              variant="outline"
              onClick={handleResend}
              disabled={countdown > 0 || isResending}
              className="w-full"
            >
              {isResending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : countdown > 0 ? (
                `Resend in ${countdown}s`
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Resend Magic Link
                </>
              )}
            </Button>
          </div>

          <div className="pt-4 border-t">
            <Link href="/login">
              <Button variant="ghost" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to login
              </Button>
            </Link>
          </div>

          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground text-center">
              Once verified, this device will be remembered for 30 days. You
              won&apos;t need to verify again unless you clear your browser
              data.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
