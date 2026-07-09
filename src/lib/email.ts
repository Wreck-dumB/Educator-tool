// Transactional email via Resend (https://resend.com).
// If RESEND_API_KEY is not configured, emails are silently skipped —
// in-app notifications still work, email is a bonus layer.

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_ADDRESS = process.env.EMAIL_FROM ?? "SparkPlay <noreply@sparkplayapp.com.au>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  if (!RESEND_API_KEY) return;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
      }),
    });
    if (!res.ok) {
      console.error("Resend email failed:", await res.text());
    }
  } catch (err) {
    console.error("Email send error:", err);
  }
}

export function observationSharedEmail(parentEmail: string, childName: string): EmailPayload {
  return {
    to: parentEmail,
    subject: `New observation shared for ${childName}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#E8614A;margin-bottom:8px">New observation for ${childName}</h2>
        <p style="color:#444;line-height:1.6">
          Your educator has shared a new observation for ${childName} on SparkPlay.
          Log in to read it, see any photos, and view linked learning outcomes.
        </p>
        <a href="${SITE_URL}/parent/observations"
           style="display:inline-block;margin-top:16px;background:#E8614A;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:600">
          View observation
        </a>
        <p style="margin-top:24px;color:#999;font-size:12px">
          SparkPlay · You're receiving this because you're linked as a parent to ${childName}.
        </p>
      </div>`,
  };
}

export function newMessageEmail(parentEmail: string, childName: string): EmailPayload {
  return {
    to: parentEmail,
    subject: `New message about ${childName}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#E8614A;margin-bottom:8px">New message</h2>
        <p style="color:#444;line-height:1.6">
          You have a new message from your educator regarding ${childName}. Log in to read and reply.
        </p>
        <a href="${SITE_URL}/parent/messages"
           style="display:inline-block;margin-top:16px;background:#E8614A;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:600">
          Open messages
        </a>
        <p style="margin-top:24px;color:#999;font-size:12px">
          SparkPlay · You're receiving this because you're linked as a parent to ${childName}.
        </p>
      </div>`,
  };
}

export function permissionSlipEmail(parentEmail: string, childName: string, slipTitle: string): EmailPayload {
  return {
    to: parentEmail,
    subject: `Permission slip: ${slipTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#E8614A;margin-bottom:8px">Permission slip for ${childName}</h2>
        <p style="color:#444;line-height:1.6">
          Your educator has sent a permission slip for <strong>${slipTitle}</strong>. Please log in and sign it.
        </p>
        <a href="${SITE_URL}/parent/permission-slips"
           style="display:inline-block;margin-top:16px;background:#E8614A;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:600">
          View & sign
        </a>
        <p style="margin-top:24px;color:#999;font-size:12px">
          SparkPlay · You're receiving this because you're linked as a parent to ${childName}.
        </p>
      </div>`,
  };
}
