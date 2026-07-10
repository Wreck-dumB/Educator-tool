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

export interface MaterialAlertPayload {
  to: string;
  serviceName: string;
  notInInventory: string[];
  lowStock: string[];
  leadDays: number;
  horizon: string;
}

export function materialOrderAlertEmail(p: MaterialAlertPayload): EmailPayload {
  const total = p.notInInventory.length + p.lowStock.length;
  const missing = p.notInInventory.map((m) => `<li style="color:#c0392b">🛒 <strong>${m}</strong> — not in inventory</li>`).join("");
  const low = p.lowStock.map((m) => `<li style="color:#e67e22">⚠ <strong>${m}</strong> — low stock</li>`).join("");

  return {
    to: p.to,
    subject: `Action required: ${total} material(s) needed before activities at ${p.serviceName}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <h2 style="color:#E8614A;margin-bottom:8px">Materials needed — order soon</h2>
        <p style="color:#444;line-height:1.6">
          You have upcoming activities at <strong>${p.serviceName}</strong> that require materials
          not currently in stock. Activities are planned within the next <strong>${p.leadDays} days</strong>
          (by <strong>${p.horizon}</strong>).
        </p>
        <h3 style="margin-top:20px;color:#333">Items to source (${total} total)</h3>
        <ul style="line-height:2;padding-left:20px">
          ${missing}${low}
        </ul>
        <a href="${SITE_URL}/materials"
           style="display:inline-block;margin-top:20px;background:#E8614A;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:600">
          Update inventory →
        </a>
        <a href="${SITE_URL}/programs"
           style="display:inline-block;margin-top:12px;margin-left:12px;background:#5C8C6A;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:600">
          View programs →
        </a>
        <p style="margin-top:24px;color:#999;font-size:12px">
          SparkPlay · Automated material readiness alert for ${p.serviceName}.
          You can adjust the lead time in Service Settings.
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
