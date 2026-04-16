export async function sendBookingConfirmationEmail({
  to,
  customerName,
  wheelchairName,
  startDate,
  endDate,
  totalPrice,
  bookingId,
}: {
  to: string;
  customerName: string;
  wheelchairName: string;
  startDate: Date;
  endDate: Date;
  totalPrice: number;
  bookingId: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    console.warn("[Email] RESEND_API_KEY or EMAIL_FROM is not configured; skipping confirmation email.");
    return;
  }

  const formatDate = (value: Date) =>
    new Intl.DateTimeFormat("en-AE", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "Asia/Dubai",
    }).format(value);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `Booking confirmed: ${wheelchairName}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
          <h2 style="margin-bottom: 12px;">Your booking is confirmed</h2>
          <p>Hello ${customerName},</p>
          <p>Your wheelchair booking has been successfully confirmed.</p>
          <ul>
            <li><strong>Booking ID:</strong> ${bookingId}</li>
            <li><strong>Wheelchair:</strong> ${wheelchairName}</li>
            <li><strong>Start date:</strong> ${formatDate(startDate)}</li>
            <li><strong>End date:</strong> ${formatDate(endDate)}</li>
            <li><strong>Total price:</strong> AED ${totalPrice.toFixed(2)}</li>
          </ul>
          <p>Thank you for booking with WheelRent.</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to send confirmation email: ${body}`);
  }
}