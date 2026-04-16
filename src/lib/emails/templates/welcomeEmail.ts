export function welcomeTemplate(name?: string) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
      <h2 style="margin-bottom: 12px;">
        Welcome ${name ?? "there"} 👋
      </h2>

      <p>We're excited to have you on board.</p>

      <p>
        You can now explore and book wheelchairs easily and manage your bookings anytime.
      </p>

      <p style="margin: 20px 0;">
        <a href="https://yourdomain.com"
           style="background:#000;color:#fff;padding:12px 18px;border-radius:6px;text-decoration:none;">
           Go to Dashboard
        </a>
      </p>

      <p>If you need help, just reply to this email.</p>

      <p style="margin-top: 24px;">
        — The WheelRent Team
      </p>
    </div>
  `;
}
