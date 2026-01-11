import { Resend } from "resend";

// Lazy-load Resend client to avoid build-time API key validation
let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

// Admin email from environment variable
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "yengnongxiong@gmail.com";

export async function sendAdminVerificationCode(code: string): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = getResendClient();
    const { error } = await resend.emails.send({
      from: "Hash Admin <noreply@resend.dev>", // Use your own domain after verifying with Resend
      to: ADMIN_EMAIL,
      subject: "Hash Admin Verification Code",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; padding: 40px 20px;">
            <div style="max-width: 400px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #18181b; font-size: 24px; margin: 0;">Hash Admin</h1>
                <p style="color: #71717a; font-size: 14px; margin-top: 8px;">Verification Code</p>
              </div>

              <div style="background: #f4f4f5; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <p style="color: #71717a; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">Your code</p>
                <p style="color: #18181b; font-size: 36px; font-weight: bold; margin: 0; letter-spacing: 8px; font-family: monospace;">${code}</p>
              </div>

              <p style="color: #71717a; font-size: 14px; text-align: center; margin-bottom: 24px;">
                This code will expire in <strong>10 minutes</strong>.
              </p>

              <div style="border-top: 1px solid #e4e4e7; padding-top: 20px;">
                <p style="color: #a1a1aa; font-size: 12px; text-align: center; margin: 0;">
                  If you didn't request this code, please ignore this email.
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to send email:", error);
    return { success: false, error: "Failed to send verification email" };
  }
}

export { ADMIN_EMAIL };
