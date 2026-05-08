// src/lib/emails/templates/emailLayout.ts
// Shared wrapper used by all email templates.
// IMPORTANT: This file runs server-side (Node.js). Do NOT use NEXT_PUBLIC_ env
// vars here — they are undefined at runtime outside the browser bundle.
// Use APP_URL (server-side env var) for absolute image URLs in emails.

// Add to your .env:  APP_URL=https://yourdomain.com
const BASE_URL = (
  process.env.APP_URL ??
  process.env.NEXTAUTH_URL ??
  process.env.NEXT_PUBLIC_BASE_URL ??
  ""
).replace(/\/$/, ""); // strip trailing slash

const COMPANY = process.env.NEXT_PUBLIC_COMPANY_NAME ?? "WheelRent";

const BRAND = "#0f5fa8";
const BRAND_LIGHT = "#e8f2fb";
const TEXT = "#0f172a";
const MUTED = "#64748b";
const BORDER = "#e2e8f0";
const BG = "#f8fafc";

export function emailLayout(content: string, footerNote?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${COMPANY}</title>
  <style>
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }

    @media only screen and (max-width: 620px) {
      .email-wrapper { padding: 16px 8px !important; }
      .email-card { border-radius: 12px !important; }
      .email-header { padding: 24px 20px 20px !important; }
      .email-header img { width: 160px !important; max-width: 80% !important; }
      .email-body { padding: 24px 20px 20px !important; font-size: 14px !important; }
      .email-footer { padding: 20px !important; }
      .info-table td { display: block !important; width: 100% !important; box-sizing: border-box; }
      .info-label { border-bottom: none !important; padding-bottom: 2px !important;
                    font-size: 11px !important; color: #94a3b8 !important; }
      .info-value { padding-top: 0 !important; padding-bottom: 12px !important; }
      .cta-btn { padding: 12px 20px !important; font-size: 14px !important; }
      h2 { font-size: 19px !important; }
      .amount-block { padding: 16px !important; }
      .amount-block .amount { font-size: 26px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${BG};font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
             -webkit-font-smoothing:antialiased;word-break:break-word;">

  <table class="email-wrapper" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background:${BG};padding:40px 16px;">
    <tr>
      <td align="center">

        <table class="email-card" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="max-width:600px;background:#ffffff;border-radius:16px;
                      box-shadow:0 1px 3px rgba(0,0,0,.07),0 4px 20px rgba(0,0,0,.07);
                      overflow:hidden;">

          <!-- LOGO HEADER -->
          <tr>
            <td class="email-header"
                style="background:${BRAND_LIGHT};padding:32px 48px 28px;text-align:center;
                       border-bottom:1px solid ${BORDER};">
              ${
                BASE_URL
                  ? `<img src="${BASE_URL}/logo-full.png"
                          alt="${COMPANY}"
                          width="220"
                          style="width:220px;max-width:80%;height:auto;display:block;margin:0 auto;" />`
                  : `<span style="font-size:22px;font-weight:700;color:${BRAND};">${COMPANY}</span>`
              }
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td class="email-body"
                style="padding:40px 48px 32px;color:${TEXT};font-size:15px;line-height:1.75;">
              ${content}
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td class="email-footer"
                style="background:${BG};border-top:1px solid ${BORDER};
                       padding:24px 48px;text-align:center;">
              <p style="margin:0 0 6px;font-size:13px;color:${MUTED};">
                ${footerNote ?? `You received this email because you have an account with ${COMPANY}.`}
              </p>
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                © ${new Date().getFullYear()} ${COMPANY}. All rights reserved.
                ${BASE_URL ? `&nbsp;·&nbsp;<a href="${BASE_URL}" style="color:${BRAND};text-decoration:none;">Visit website</a>` : ""}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function infoRow(label: string, value: string): string {
  return `
    <tr>
      <td class="info-label"
          style="padding:10px 14px;font-size:12px;color:#64748b;font-weight:600;
                 text-transform:uppercase;letter-spacing:.04em;white-space:nowrap;
                 vertical-align:top;width:140px;border-bottom:1px solid #f1f5f9;">
        ${label}
      </td>
      <td class="info-value"
          style="padding:10px 14px;font-size:14px;color:#0f172a;vertical-align:top;
                 word-break:break-word;border-bottom:1px solid #f1f5f9;">
        ${value}
      </td>
    </tr>`;
}

export function sectionHeading(title: string): string {
  return `
    <p style="margin:28px 0 10px;font-size:11px;font-weight:700;letter-spacing:.08em;
               text-transform:uppercase;color:#94a3b8;">${title}</p>`;
}

export function ctaButton(label: string, href: string): string {
  return `
    <table cellpadding="0" cellspacing="0" border="0" style="margin:28px 0;">
      <tr>
        <td style="background:${BRAND};border-radius:8px;">
          <a href="${href}" class="cta-btn"
             style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:700;
                    color:#ffffff;text-decoration:none;letter-spacing:.02em;">
            ${label}
          </a>
        </td>
      </tr>
    </table>`;
}

export function badge(text: string, color: string, bg: string): string {
  return `<span style="display:inline-block;padding:3px 10px;border-radius:20px;
                        font-size:12px;font-weight:700;letter-spacing:.04em;
                        color:${color};background:${bg};">${text}</span>`;
}
