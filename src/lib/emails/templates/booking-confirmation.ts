import { formatAddressHtml } from "@/lib/invoice-format";

export function bookingConfirmationTemplate({
  customerName,
  phoneNumber,
  deliveryCity,
  deliveryWindow,
  deliveryAddress,
  deliveryNotes,
  wheelchairName,
  startDate,
  endDate,
  subtotal,
  deliveryFee,
  taxRate,
  taxAmount,
  totalAmount,
  bookingId,
  paymentMethod,
  paymentStatusLabel,
  companyName = process.env.NEXT_PUBLIC_COMPANY_NAME || "BioMobility",
}: {
  customerName: string;
  phoneNumber: string;
  deliveryCity: string;
  deliveryWindow: string;
  deliveryAddress: string;
  deliveryNotes?: string;
  wheelchairName: string;
  startDate: string;
  endDate: string;
  subtotal: string;
  deliveryFee: string;
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
        <li><strong>Delivery city:</strong> ${deliveryCity}</li>
        <li><strong>Delivery window:</strong> ${deliveryWindow}</li>
        <li><strong>Delivery address:</strong> <span style="white-space:pre-line;word-break:break-word">${formatAddressHtml(deliveryAddress)}</span></li>
        ${deliveryNotes ? `<li><strong>Delivery notes:</strong> ${deliveryNotes}</li>` : ""}
        <li><strong>Wheelchair:</strong> ${wheelchairName}</li>
        <li><strong>Start date:</strong> ${startDate}</li>
        <li><strong>End date:</strong> ${endDate}</li>
        <li><strong>Subtotal:</strong> AED ${subtotal}</li>
        <li><strong>Delivery fee:</strong> AED ${deliveryFee}</li>
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
