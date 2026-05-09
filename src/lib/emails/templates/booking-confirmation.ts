// src/lib/emails/templates/booking-confirmation.ts
import { formatAddressHtml } from "@/lib/invoice-format";
import {
  emailLayout,
  infoRow,
  sectionHeading,
  badge,
  wrapValue,
} from "./emailLayout";

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
  const paymentBadge =
    paymentMethod === "ONLINE"
      ? badge("Paid Online", "#166534", "#dcfce7")
      : badge("Cash on Delivery", "#92400e", "#fef3c7");

  const content = `
    <!-- Greeting -->
    <h2 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#0f172a;">
      Booking Confirmed 🎉
    </h2>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;">
      Hello <strong>${customerName}</strong>, your wheelchair rental is all set.
    </p>

    <!-- Booking ID pill -->
    <div class="mobile-full" style="background:#f1f5f9;border-radius:8px;padding:12px 16px;
                margin-bottom:28px;display:inline-block;max-width:100%;">
      <span style="font-size:12px;color:#64748b;font-weight:600;letter-spacing:.06em;
                   text-transform:uppercase;">Booking ID</span>&nbsp;&nbsp;
      <span style="font-size:14px;font-weight:700;color:#0f172a;
                   font-family:monospace;word-break:break-all;overflow-wrap:anywhere;">${bookingId}</span>
    </div>

    ${sectionHeading("Delivery details")}
    <table class="info-table stack-on-mobile" width="100%" cellpadding="0" cellspacing="0" border="0"
           style="border:1px solid #e2e8f0;border-radius:10px;border-collapse:separate;
                  border-spacing:0;overflow:hidden;">
      <tbody>
        ${infoRow("Customer", wrapValue(customerName))}
        ${infoRow("Phone", wrapValue(phoneNumber))}
        ${infoRow("City", wrapValue(deliveryCity))}
        ${infoRow("Delivery window", wrapValue(deliveryWindow))}
        ${infoRow("Address", `<span style="white-space:pre-line;word-break:break-word">${formatAddressHtml(deliveryAddress)}</span>`)}
        ${deliveryNotes ? infoRow("Notes", wrapValue(deliveryNotes)) : ""}
      </tbody>
    </table>

    ${sectionHeading("Rental details")}
    <table class="info-table stack-on-mobile" width="100%" cellpadding="0" cellspacing="0" border="0"
           style="border:1px solid #e2e8f0;border-radius:10px;border-collapse:separate;
                  border-spacing:0;overflow:hidden;">
      <tbody>
        ${infoRow("Wheelchair", wrapValue(wheelchairName))}
        ${infoRow("Start date", wrapValue(startDate))}
        ${infoRow("End date", wrapValue(endDate))}
      </tbody>
    </table>

    ${sectionHeading("Charges")}
    <table class="info-table stack-on-mobile" width="100%" cellpadding="0" cellspacing="0" border="0"
           style="border:1px solid #e2e8f0;border-radius:10px;border-collapse:separate;
                  border-spacing:0;overflow:hidden;">
      <tbody>
        ${infoRow("Subtotal", `AED ${subtotal}`)}
        ${infoRow("Delivery fee", `AED ${deliveryFee}`)}
        ${infoRow(`VAT (${taxRate})`, `AED ${taxAmount}`)}
        <tr style="background:#f8fafc;">
          <td style="padding:12px 14px;font-size:14px;color:#0f172a;font-weight:700;
                      border-top:1px solid #e2e8f0;width:160px;">Total</td>
          <td style="padding:12px 14px;font-size:14px;color:#0f172a;font-weight:700;
                      border-top:1px solid #e2e8f0;word-break:break-word;overflow-wrap:anywhere;">AED ${totalAmount}</td>
        </tr>
      </tbody>
    </table>

    ${sectionHeading("Payment")}
    <p style="margin:0;">${paymentBadge}&nbsp;&nbsp;${paymentStatusLabel}</p>

    <p style="margin:32px 0 0;font-size:14px;color:#475569;">
      Thank you for choosing <strong>${companyName}</strong>. We'll be in touch before your delivery.
    </p>
  `;

  return emailLayout(
    content,
    `You received this confirmation because you made a booking with ${companyName}.`,
  );
}

// import { formatAddressHtml } from "@/lib/invoice-format";

// export function bookingConfirmationTemplate({
//   customerName,
//   phoneNumber,
//   deliveryCity,
//   deliveryWindow,
//   deliveryAddress,
//   deliveryNotes,
//   wheelchairName,
//   startDate,
//   endDate,
//   subtotal,
//   deliveryFee,
//   taxRate,
//   taxAmount,
//   totalAmount,
//   bookingId,
//   paymentMethod,
//   paymentStatusLabel,
//   companyName = process.env.NEXT_PUBLIC_COMPANY_NAME || "BioMobility",
// }: {
//   customerName: string;
//   phoneNumber: string;
//   deliveryCity: string;
//   deliveryWindow: string;
//   deliveryAddress: string;
//   deliveryNotes?: string;
//   wheelchairName: string;
//   startDate: string;
//   endDate: string;
//   subtotal: string;
//   deliveryFee: string;
//   taxRate: string;
//   taxAmount: string;
//   totalAmount: string;
//   bookingId: string;
//   paymentMethod: "ONLINE" | "CASH";
//   paymentStatusLabel: string;
//   companyName?: string;
// }) {
//   return `
//     <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
//       <h2>Your booking is confirmed 🎉</h2>

//       <p>Hello ${customerName},</p>

//       <p>Your wheelchair booking has been successfully confirmed.</p>

//       <ul>
//         <li><strong>Booking ID:</strong> ${bookingId}</li>
//         <li><strong>Customer:</strong> ${customerName}</li>
//         <li><strong>Phone:</strong> ${phoneNumber}</li>
//         <li><strong>Delivery city:</strong> ${deliveryCity}</li>
//         <li><strong>Delivery window:</strong> ${deliveryWindow}</li>
//         <li><strong>Delivery address:</strong> <span style="white-space:pre-line;word-break:break-word">${formatAddressHtml(deliveryAddress)}</span></li>
//         ${deliveryNotes ? `<li><strong>Delivery notes:</strong> ${deliveryNotes}</li>` : ""}
//         <li><strong>Wheelchair:</strong> ${wheelchairName}</li>
//         <li><strong>Start date:</strong> ${startDate}</li>
//         <li><strong>End date:</strong> ${endDate}</li>
//         <li><strong>Subtotal:</strong> AED ${subtotal}</li>
//         <li><strong>Delivery fee:</strong> AED ${deliveryFee}</li>
//         <li><strong>Tax rate:</strong> ${taxRate}</li>
//         <li><strong>Tax amount:</strong> AED ${taxAmount}</li>
//         <li><strong>Total amount:</strong> AED ${totalAmount}</li>
//         <li><strong>Payment method:</strong> ${paymentMethod === "ONLINE" ? "Online (Stripe)" : "Cash on Delivery"}</li>
//         <li><strong>Payment status:</strong> ${paymentStatusLabel}</li>
//       </ul>

//       <p>Thank you for booking with ${companyName}.</p>
//     </div>
//   `;
// }
