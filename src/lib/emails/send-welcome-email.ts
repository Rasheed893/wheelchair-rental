import { sendEmail } from "./resend-client";
import { welcomeTemplate } from "./templates/welcomeEmail";

export async function sendWelcomeEmail({
  to,
  name,
}: {
  to: string;
  name?: string;
}) {
  await sendEmail({
    to: [to],
    subject: "Welcome to WheelRent 🎉",
    html: welcomeTemplate(name),
  });
}
