// src/lib/emails/templates/emailLayout.ts
// Shared wrapper used by all email templates.
// Renders the logo header, a content slot, and a branded footer.

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "";
const COMPANY = process.env.NEXT_PUBLIC_COMPANY_NAME ?? "WheelRent";

/** Accent blue used throughout — matches your primary-700 */
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
  <title>${COMPANY}</title>
</head>
<body style="margin:0;padding:0;background:${BG};font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BG};padding:40px 16px;">
    <tr>
      <td align="center">

        <!-- Card -->
        <table width="600" cellpadding="0" cellspacing="0" border="0"
               style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;
                      box-shadow:0 1px 3px rgba(0,0,0,.06),0 4px 16px rgba(0,0,0,.06);
                      overflow:hidden;">

          <!-- ── HEADER / LOGO ── -->
          <tr>
            <td style="background:${BRAND_LIGHT};padding:32px 48px 28px;text-align:center;
                        border-bottom:1px solid ${BORDER};">
              <img
                src="${BASE_URL}/logo.png"
                alt="${COMPANY}"
                width="220"
                style="width:220px;max-width:100%;height:auto;display:block;margin:0 auto;"
              />
            </td>
          </tr>

          <!-- ── BODY CONTENT ── -->
          <tr>
            <td style="padding:40px 48px 32px;color:${TEXT};font-size:15px;line-height:1.7;">
              ${content}
            </td>
          </tr>

          <!-- ── FOOTER ── -->
          <tr>
            <td style="background:${BG};border-top:1px solid ${BORDER};
                        padding:24px 48px;text-align:center;">
              <p style="margin:0 0 6px;font-size:13px;color:${MUTED};">
                ${footerNote ?? `You received this email because you have an account with ${COMPANY}.`}
              </p>
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                © ${new Date().getFullYear()} ${COMPANY}. All rights reserved. &nbsp;·&nbsp;
                <a href="${BASE_URL}" style="color:${BRAND};text-decoration:none;">Visit website</a>
              </p>
            </td>
          </tr>

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Small helpers shared across templates ────────────────────────────────────

export function infoRow(label: string, value: string): string {
  return `
    <tr>
      <td style="padding:10px 14px;font-size:13px;color:#64748b;font-weight:600;
                  white-space:nowrap;vertical-align:top;width:160px;">${label}</td>
      <td style="padding:10px 14px;font-size:13px;color:#0f172a;vertical-align:top;
                  word-break:break-word;">${value}</td>
    </tr>`;
}

export function sectionHeading(title: string): string {
  return `
    <p style="margin:28px 0 12px;font-size:11px;font-weight:700;letter-spacing:.08em;
               text-transform:uppercase;color:#94a3b8;">${title}</p>`;
}

export function ctaButton(label: string, href: string): string {
  return `
    <table cellpadding="0" cellspacing="0" border="0" style="margin:28px 0;">
      <tr>
        <td style="background:${BRAND};border-radius:8px;">
          <a href="${href}"
             style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:700;
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
