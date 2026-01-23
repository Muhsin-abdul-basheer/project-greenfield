/**
 * Sends email. If RESEND_API_KEY and FROM_EMAIL are set, uses Resend.
 * Otherwise logs the reset link to console (for local dev).
 */
const RESEND_API = "https://api.resend.com/emails";
const FROM = process.env.FROM_EMAIL || "noreply@example.com";

export async function sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
  const html = `
    <p>You requested a password reset for Vessel Issue Reporting.</p>
    <p><a href="${resetLink}">Reset your password</a></p>
    <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>
  `;

  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    const r = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: FROM,
        to: [to],
        subject: "Reset your password – Vessel Issue Reporting",
        html,
      }),
    });
    if (!r.ok) {
      const err = await r.text();
      throw new Error(`Email send failed: ${err}`);
    }
    return;
  }

  // Dev fallback: log link to console
  console.log("[Email not configured – reset link]", { to, resetLink });
}
