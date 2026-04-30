export function bookingConfirmationTemplate({
  customerName,
  phoneNumber,
  deliveryAddress,
  deliveryNotes,
  wheelchairName,
  startDate,
  endDate,
  subtotal,
  taxRate,
  taxAmount,
  totalAmount,
  bookingId,
  paymentMethod,
  paymentStatusLabel,
  companyName = process.env.NEXT_PUBLIC_COMPANY_NAME || "Your Company",
}: {
  customerName: string;
  phoneNumber: string;
  deliveryAddress: string;
  deliveryNotes?: string;
  wheelchairName: string;
  startDate: string;
  endDate: string;
  subtotal: string;
  taxRate: string;
  taxAmount: string;
  totalAmount: string;
  bookingId: string;
  paymentMethod: "ONLINE" | "CASH";
  paymentStatusLabel: string;
  companyName?: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
      <h2>Your booking is confirmed 🎉</h2>

      <p>Hello ${customerName},</p>

      <p>Your wheelchair booking has been successfully confirmed.</p>

      <ul>
        <li><strong>Booking ID:</strong> ${bookingId}</li>
        <li><strong>Customer:</strong> ${customerName}</li>
        <li><strong>Phone:</strong> ${phoneNumber}</li>
        <li><strong>Delivery address:</strong> ${deliveryAddress}</li>
        ${deliveryNotes ? `<li><strong>Delivery notes:</strong> ${deliveryNotes}</li>` : ""}
        <li><strong>Wheelchair:</strong> ${wheelchairName}</li>
        <li><strong>Start date:</strong> ${startDate}</li>
        <li><strong>End date:</strong> ${endDate}</li>
        <li><strong>Subtotal:</strong> AED ${subtotal}</li>
        <li><strong>Tax rate:</strong> ${taxRate}</li>
        <li><strong>Tax amount:</strong> AED ${taxAmount}</li>
        <li><strong>Total amount:</strong> AED ${totalAmount}</li>
        <li><strong>Payment method:</strong> ${paymentMethod === "ONLINE" ? "Online (Stripe)" : "Cash on Delivery"}</li>
        <li><strong>Payment status:</strong> ${paymentStatusLabel}</li>
      </ul>

      <p>Thank you for booking with ${companyName}.</p>
    </div>
  `;
}
