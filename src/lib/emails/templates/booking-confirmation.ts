export function bookingConfirmationTemplate({
  customerName,
  wheelchairName,
  startDate,
  endDate,
  totalPrice,
  bookingId,
}: {
  customerName: string;
  wheelchairName: string;
  startDate: string;
  endDate: string;
  totalPrice: string;
  bookingId: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
      <h2>Your booking is confirmed 🎉</h2>

      <p>Hello ${customerName},</p>

      <p>Your wheelchair booking has been successfully confirmed.</p>

      <ul>
        <li><strong>Booking ID:</strong> ${bookingId}</li>
        <li><strong>Wheelchair:</strong> ${wheelchairName}</li>
        <li><strong>Start date:</strong> ${startDate}</li>
        <li><strong>End date:</strong> ${endDate}</li>
        <li><strong>Total price:</strong> AED ${totalPrice}</li>
      </ul>

      <p>Thank you for booking with WheelRent.</p>
    </div>
  `;
}
