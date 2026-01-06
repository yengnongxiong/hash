"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Loader2, Mail, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { sendVerificationCode, verifyCode } from "../actions";

export default function AdminVerifyPage() {
  const router = useRouter();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [isPending, startTransition] = useTransition();
  const [codeSent, setCodeSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input on mount
  useEffect(() => {
    if (codeSent) {
      inputRefs.current[0]?.focus();
    }
  }, [codeSent]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleSendCode = () => {
    startTransition(async () => {
      const result = await sendVerificationCode();
      if (result.success) {
        setCodeSent(true);
        setResendCooldown(60); // 60 second cooldown
        toast.success("Verification code sent to your email");
      } else {
        toast.error("Failed to send code", { description: result.error });
      }
    });
  };

  const handleCodeChange = (index: number, value: string) => {
    // Only allow numeric input
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (newCode.every((d) => d !== "") && value) {
      handleVerify(newCode.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pastedData.length === 6) {
      const newCode = pastedData.split("");
      setCode(newCode);
      handleVerify(pastedData);
    }
  };

  const handleVerify = (codeString: string) => {
    startTransition(async () => {
      const result = await verifyCode(codeString);
      if (result.success) {
        toast.success("Verification successful");
        router.push("/admin");
      } else {
        toast.error("Verification failed", { description: result.error });
        setCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <Card className="w-full max-w-md border-slate-700 bg-slate-800/50 backdrop-blur">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl text-white">Admin Verification</CardTitle>
          <CardDescription className="text-slate-400">
            {codeSent
              ? "Enter the 6-digit code sent to your email"
              : "Request a verification code to access the admin panel"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!codeSent ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-slate-700/50 p-4 text-center">
                <Mail className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                <p className="text-sm text-slate-300">
                  A verification code will be sent to your admin email
                </p>
              </div>
              <Button
                onClick={handleSendCode}
                className="w-full"
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Verification Code
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Code input */}
              <div className="flex justify-center gap-2" onPaste={handlePaste}>
                {code.map((digit, index) => (
                  <Input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-12 h-14 text-center text-2xl font-mono bg-slate-700 border-slate-600 text-white focus:border-primary"
                    disabled={isPending}
                  />
                ))}
              </div>

              {/* Verify button */}
              <Button
                onClick={() => handleVerify(code.join(""))}
                className="w-full"
                disabled={isPending || code.some((d) => d === "")}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify Code"
                )}
              </Button>

              {/* Resend button */}
              <div className="text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSendCode}
                  disabled={isPending || resendCooldown > 0}
                  className="text-slate-400 hover:text-white"
                >
                  {resendCooldown > 0 ? (
                    <>Resend code in {resendCooldown}s</>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Resend Code
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
