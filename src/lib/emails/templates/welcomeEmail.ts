// src/lib/emails/templates/welcomeEmail.ts
import { emailLayout, ctaButton } from "./emailLayout";

export function welcomeTemplate(name?: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  const companyName = process.env.NEXT_PUBLIC_COMPANY_NAME ?? "WheelRent";

  const content = `
    <h2 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#0f172a;">
      Welcome to ${companyName} 👋
    </h2>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;">
      Hi <strong>${name ?? "there"}</strong>, we're really glad you're here.
    </p>

    <!-- Feature tiles -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0"
           style="border:1px solid #e2e8f0;border-radius:10px;border-collapse:separate;
                  border-spacing:0;overflow:hidden;margin-bottom:28px;">
      <tbody>
        <tr style="background:#f8fafc;">
          <td style="padding:16px 20px;border-bottom:1px solid #e2e8f0;">
            <span style="font-size:20px;">♿</span>
            <strong style="display:block;font-size:14px;color:#0f172a;margin-top:4px;">Browse wheelchairs</strong>
            <span style="font-size:13px;color:#64748b;">Choose from our curated fleet for any need.</span>
          </td>
        </tr>
        <tr style="background:#ffffff;">
          <td style="padding:16px 20px;border-bottom:1px solid #e2e8f0;">
            <span style="font-size:20px;">📅</span>
            <strong style="display:block;font-size:14px;color:#0f172a;margin-top:4px;">Book in minutes</strong>
            <span style="font-size:13px;color:#64748b;">Pick your dates and confirm — we handle the rest.</span>
          </td>
        </tr>
        <tr style="background:#f8fafc;">
          <td style="padding:16px 20px;">
            <span style="font-size:20px;">🚚</span>
            <strong style="display:block;font-size:14px;color:#0f172a;margin-top:4px;">Doorstep delivery</strong>
            <span style="font-size:13px;color:#64748b;">We deliver and collect at your preferred time.</span>
          </td>
        </tr>
      </tbody>
    </table>

    ${ctaButton("Go to Dashboard", baseUrl)}

    <p style="margin:0;font-size:14px;color:#475569;">
      Questions? Just reply to this email — we're happy to help.
    </p>
  `;

  return emailLayout(
    content,
    `You received this email because you created an account with ${companyName}.`,
  );
}

// export function welcomeTemplate(name?: string) {
//   return `
//     <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
//       <h2 style="margin-bottom: 12px;">
//         Welcome ${name ?? "there"} 👋
//       </h2>

//       <p>We're excited to have you on board.</p>

//       <p>
//         You can now explore and book wheelchairs easily and manage your bookings anytime.
//       </p>

//       <p style="margin: 20px 0;">
//   <a href="${process.env.NEXT_PUBLIC_BASE_URL}"
//      style="background:#000;color:#fff;padding:12px 18px;border-radius:6px;text-decoration:none;">
//     Go to Dashboard
//   </a>
// </p>

//       <p>If you need help, just reply to this email.</p>

//       <p style="margin-top: 24px;">
//         — The WheelRent Team
//       </p>
//     </div>
//   `;
// }
