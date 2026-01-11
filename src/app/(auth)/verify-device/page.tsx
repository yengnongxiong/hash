"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { verifyDevice, resendCode } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { ShieldCheck, RefreshCw, Smartphone } from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

export default function VerifyDevicePage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isResending, startResendTransition] = useTransition();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await verifyDevice(code);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else if (result?.success) {
      toast.success("Device verified successfully!");
      router.push("/dashboard");
    }
  }

  function handleResend() {
    startResendTransition(async () => {
      const result = await resendCode();
      if (result.success) {
        toast.success("New code sent! Check your email.");
        setCode("");
      } else {
        toast.error(result.error || "Failed to resend code");
      }
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Smartphone className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">
            Verify your device
          </CardTitle>
          <CardDescription>
            We sent a verification code to your email. Enter it below to
            confirm this device.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md text-center">
                {error}
              </div>
            )}

            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={code}
                onChange={(value) => setCode(value)}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || code.length !== 6}
            >
              {loading ? (
                "Verifying..."
              ) : (
                <>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Verify Device
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Didn&apos;t receive the code?
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResend}
              disabled={isResending}
            >
              {isResending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Resend code
                </>
              )}
            </Button>
          </div>

          <div className="mt-6 pt-4 border-t">
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
