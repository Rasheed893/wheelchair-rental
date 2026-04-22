export function paymentReceivedTemplate({
  customerName,
  bookingId,
}: {
  customerName: string;
  bookingId: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
      <h2>Payment received ✅</h2>
      <p>Hello ${customerName},</p>
      <p>Your booking (ID: ${bookingId}) has been successfully paid.</p>
      <p>Thank you for choosing WheelRent.</p>
    </div>
  `;
}
