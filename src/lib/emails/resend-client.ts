/// <reference types="node" />

function maskEmail(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return "<empty>";
  }

  const atIndex = trimmed.indexOf("@");
  if (atIndex <= 0) {
    return "***";
  }

  const local = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1);
  return `${local.slice(0, Math.min(2, local.length))}***@${domain}`;
}

function maskSecret(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return "<empty>";
  }

  return `set(len=${trimmed.length})`;
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string[];
  subject: string;
  html: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const adminEmail = process.env.ADMIN_EMAIL;

  console.log("[EMAIL] Runtime config", {
    hasResendApiKey: Boolean(apiKey),
    resendApiKey: maskSecret(apiKey),
    emailFrom: maskEmail(from),
    adminEmail: maskEmail(adminEmail),
  });

  if (!apiKey || !from) {
    console.error("[EMAIL] Missing email provider configuration", {
      hasResendApiKey: Boolean(apiKey),
      hasEmailFrom: Boolean(from),
    });
    throw new Error("Missing RESEND_API_KEY or EMAIL_FROM");
  }

  console.log("[EMAIL] Sending via Resend...", {
    to,
    subject,
    from: maskEmail(from),
  });

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
    }),
  });

  const data = await response.text();

  console.log("[EMAIL] Resend response", {
    status: response.status,
    body: data,
  });

  if (!response.ok) {
    console.error("[EMAIL ERROR] Resend request failed", {
      to,
      subject,
      status: response.status,
      body: data,
    });
    throw new Error(`Resend email failed with status ${response.status}: ${data}`);
  }

  console.log("[EMAIL] Email sent successfully", {
    to: to.map((recipient) => maskEmail(recipient)),
    subject,
  });
}
