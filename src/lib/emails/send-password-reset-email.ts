// src/lib/emails/send-password-reset-email.ts
import { sendEmail } from "./resend-client";
import {
  passwordResetTemplate,
  passwordResetTemplateAr,
} from "./templates/passwordResetTemplate";

export async function sendPasswordResetEmail({
  to,
  name,
  resetLink,
  locale = "en",
}: {
  to: string;
  name: string;
  resetLink: string;
  locale?: "en" | "ar";
}) {
  const isAr = locale === "ar";
  const html = isAr
    ? passwordResetTemplateAr(name, resetLink)
    : passwordResetTemplate(name, resetLink);

  await sendEmail({
    to: [to],
    subject: isAr
      ? "طلب إعادة تعيين كلمة المرور 🔐"
      : "Password Reset Request 🔐",
    html,
  });
}
