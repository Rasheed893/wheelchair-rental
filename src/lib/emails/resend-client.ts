/// <reference types="node" />
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

  if (!apiKey || !from) {
    console.warn("[Email] Missing RESEND_API_KEY or EMAIL_FROM");
    return;
  }

  console.log("[Email] Sending email...", {
    to,
    subject,
    from,
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

  console.log("[Email] Resend response:", {
    status: response.status,
    body: data,
  });

  if (!response.ok) {
    throw new Error(`Email failed: ${data}`);
  }

  console.log("[Email] Email sent successfully ✅");
}
