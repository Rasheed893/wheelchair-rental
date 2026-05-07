// src/lib/emails/templates/passwordResetTemplate.ts
import { emailLayout, ctaButton } from "./emailLayout";

export function passwordResetTemplate(name: string, resetLink: string): string {
  const companyName = process.env.NEXT_PUBLIC_COMPANY_NAME ?? "WheelRent";

  const content = `
    <!-- Lock icon -->
    <div style="width:52px;height:52px;border-radius:12px;background:#e8f2fb;
                display:flex;align-items:center;justify-content:center;
                margin-bottom:20px;font-size:26px;line-height:52px;text-align:center;">
      🔐
    </div>

    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">
      Password Reset Request
    </h2>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;">
      Hi <strong>${name}</strong>, we received a request to reset your ${companyName} account password.
    </p>

    <!-- CTA -->
    ${ctaButton("Reset My Password", resetLink)}

    <!-- Fallback link -->
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;
                padding:14px 16px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;font-weight:600;
                 letter-spacing:.06em;text-transform:uppercase;">Or copy this link</p>
      <p style="margin:0;font-size:12px;color:#0f5fa8;word-break:break-all;">
        <a href="${resetLink}" style="color:#0f5fa8;text-decoration:none;">${resetLink}</a>
      </p>
    </div>

    <!-- Warning -->
    <div style="border-left:3px solid #f59e0b;padding:10px 16px;background:#fffbeb;
                border-radius:0 6px 6px 0;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#92400e;">
        ⏰ <strong>This link expires in 1 hour.</strong>
        If you didn't request a reset, you can safely ignore this email.
      </p>
    </div>

    <p style="margin:0;font-size:14px;color:#475569;">
      Need help? Contact our support team by replying to this email.
    </p>
  `;

  return emailLayout(
    content,
    "This is an automated security email. Please do not reply.",
  );
}

// ── Arabic variant ────────────────────────────────────────────────────────────

export function passwordResetTemplateAr(
  name: string,
  resetLink: string,
): string {
  const companyName = process.env.NEXT_PUBLIC_COMPANY_NAME ?? "WheelRent";
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "";

  // Arabic template uses its own inline layout (RTL)
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${companyName}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;direction:rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0"
               style="max-width:600px;width:100%;background:#fff;border-radius:16px;
                      box-shadow:0 1px 3px rgba(0,0,0,.06),0 4px 16px rgba(0,0,0,.06);overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:#e8f2fb;padding:32px 48px 28px;text-align:center;
                        border-bottom:1px solid #e2e8f0;">
              <img src="${baseUrl}/logo.png" alt="${companyName}"
                   width="220"
                   style="width:220px;max-width:100%;height:auto;display:block;margin:0 auto;" />
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 48px 32px;color:#0f172a;font-size:15px;line-height:1.7;
                        text-align:right;">
              <div style="width:52px;height:52px;border-radius:12px;background:#e8f2fb;
                          font-size:26px;line-height:52px;text-align:center;margin-bottom:20px;">
                🔐
              </div>

              <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">
                طلب إعادة تعيين كلمة المرور
              </h2>
              <p style="margin:0 0 24px;font-size:15px;color:#475569;">
                مرحباً <strong>${name}</strong>، تلقّينا طلباً لإعادة تعيين كلمة مرور حسابك في ${companyName}.
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
                <tr>
                  <td style="background:#0f5fa8;border-radius:8px;">
                    <a href="${resetLink}"
                       style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:700;
                              color:#fff;text-decoration:none;">
                      إعادة تعيين كلمة المرور
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback -->
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;
                          padding:14px 16px;margin-bottom:24px;">
                <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;font-weight:600;">أو انسخ الرابط التالي</p>
                <p style="margin:0;font-size:12px;color:#0f5fa8;word-break:break-all;">
                  <a href="${resetLink}" style="color:#0f5fa8;text-decoration:none;">${resetLink}</a>
                </p>
              </div>

              <!-- Warning -->
              <div style="border-right:3px solid #f59e0b;border-left:none;padding:10px 16px;
                          background:#fffbeb;border-radius:6px 0 0 6px;margin-bottom:24px;">
                <p style="margin:0;font-size:13px;color:#92400e;">
                  ⏰ <strong>ينتهي هذا الرابط خلال ساعة واحدة.</strong>
                  إذا لم تطلب إعادة التعيين، تجاهل هذا البريد.
                </p>
              </div>

              <p style="margin:0;font-size:14px;color:#475569;">
                للمساعدة، يمكنك الرد على هذا البريد الإلكتروني.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;
                        padding:24px 48px;text-align:center;">
              <p style="margin:0 0 6px;font-size:13px;color:#64748b;">
                هذا بريد إلكتروني آلي متعلق بأمان حسابك.
              </p>
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                © ${new Date().getFullYear()} ${companyName}. جميع الحقوق محفوظة.
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

// // src/lib/emails/templates/passwordResetTemplate.ts
// export function passwordResetTemplate(name: string, resetLink: string): string {
//   return `
//     <!DOCTYPE html>
//     <html>
//       <head>
//         <meta charset="UTF-8">
//         <style>
//           body { font-family: Arial, sans-serif; color: #333; }
//           .container { max-width: 600px; margin: 0 auto; padding: 20px; }
//           .header { background-color: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center; }
//           .content { padding: 20px 0; }
//           .button { display: inline-block; background-color: #0066cc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
//           .footer { color: #999; font-size: 12px; text-align: center; padding-top: 20px; border-top: 1px solid #eee; }
//           .warning { background-color: #fff3cd; padding: 12px; border-radius: 4px; margin: 20px 0; }
//         </style>
//       </head>
//       <body>
//         <div class="container">
//           <div class="header">
//             <h1>🔐 Password Reset Request</h1>
//           </div>

//           <div class="content">
//             <p>Hi ${name},</p>

//             <p>We received a request to reset your WheelRent account password. Click the button below to create a new password:</p>

//             <div style="text-align: center;">
//               <a href="${resetLink}" class="button">Reset Password</a>
//             </div>

//             <p style="text-align: center; color: #666;">
//               Or copy and paste this link in your browser:<br>
//               <a href="${resetLink}" style="word-break: break-all; color: #0066cc;">
//                 ${resetLink}
//               </a>
//             </p>

//             <div class="warning">
//               <strong>⏰ Important:</strong> This link will expire in 1 hour for security reasons.
//             </div>

//             <p>If you didn't request a password reset, please ignore this email or contact our support team.</p>

//             <p>Best regards,<br>WheelRent Team</p>
//           </div>

//           <div class="footer">
//             <p>© 2026 WheelRent. All rights reserved.</p>
//             <p>This is an automated email, please do not reply.</p>
//           </div>
//         </div>
//       </body>
//     </html>
//   `;
// }

// export function passwordResetTemplateAr(
//   name: string,
//   resetLink: string,
// ): string {
//   return `
//     <!DOCTYPE html>
//     <html dir="rtl">
//       <head>
//         <meta charset="UTF-8">
//         <style>
//           body { font-family: Arial, sans-serif; color: #333; }
//           .container { max-width: 600px; margin: 0 auto; padding: 20px; }
//           .header { background-color: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center; }
//           .content { padding: 20px 0; }
//           .button { display: inline-block; background-color: #0066cc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
//           .footer { color: #999; font-size: 12px; text-align: center; padding-top: 20px; border-top: 1px solid #eee; }
//           .warning { background-color: #fff3cd; padding: 12px; border-radius: 4px; margin: 20px 0; }
//         </style>
//       </head>
//       <body>
//         <div class="container">
//           <div class="header">
//             <h1>🔐 طلب إعادة تعيين كلمة المرور</h1>
//           </div>

//           <div class="content">
//             <p>مرحباً ${name},</p>

//             <p>لقد تلقينا طلباً لإعادة تعيين كلمة مرور حسابك في ويل رينت. انقر على الزر أدناه لإنشاء كلمة مرور جديدة:</p>

//             <div style="text-align: center;">
//               <a href="${resetLink}" class="button">إعادة تعيين كلمة المرور</a>
//             </div>

//             <p style="text-align: center; color: #666;">
//               أو انسخ والصق هذا الرابط في متصفحك:<br>
//               <a href="${resetLink}" style="word-break: break-all; color: #0066cc;">
//                 ${resetLink}
//               </a>
//             </p>

//             <div class="warning">
//               <strong>⏰ مهم:</strong> سينتهي صلاحية هذا الرابط خلال ساعة واحدة لأسباب أمنية.
//             </div>

//             <p>إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذا البريد أو الاتصال بفريق الدعم لدينا.</p>

//             <p>مع أطيب التحيات،<br>فريق ويل رينت</p>
//           </div>

//           <div class="footer">
//             <p>© 2026 WheelRent. جميع الحقوق محفوظة.</p>
//             <p>هذا بريد إلكتروني آلي، يرجى عدم الرد عليه.</p>
//           </div>
//         </div>
//       </body>
//     </html>
//   `;
// }
