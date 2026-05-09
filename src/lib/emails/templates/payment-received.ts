// export function paymentReceivedTemplate({
//   customerName,
//   bookingId,
// }: {
//   customerName: string;
//   bookingId: string;
// }) {
//   return `
//     <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
//       <h2>Payment received ✅</h2>
//       <p>Hello ${customerName},</p>
//       <p>Your booking (ID: ${bookingId}) has been successfully paid.</p>
//       <p>Thank you for choosing ${process.env.NEXT_PUBLIC_COMPANY_NAME || "BioMobility"}.</p>
//     </div>
//   `;
// }

// src/lib/emails/templates/payment-received.ts
import {
  emailLayout,
  infoRow,
  ctaButton,
  badge,
  wrapValue,
} from "./emailLayout";

export function paymentReceivedTemplate({
  customerName,
  bookingId,
  amount,
  currency = "AED",
  paymentMethod,
  paidAt,
}: {
  customerName: string;
  bookingId: string;
  amount?: string;
  currency?: string;
  paymentMethod?: "ONLINE" | "CASH";
  paidAt?: string;
}) {
  const companyName = process.env.NEXT_PUBLIC_COMPANY_NAME ?? "BioMobility";
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "";

  const content = `
    <!-- Success icon -->
    <div style="width:56px;height:56px;border-radius:50%;background:#dcfce7;
                font-size:28px;line-height:56px;text-align:center;margin-bottom:20px;">
      ✅
    </div>

    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">
      Payment Received
    </h2>
    <p style="margin:0 0 28px;font-size:15px;color:#475569;">
      Hi <strong>${customerName}</strong>, your payment has been confirmed and your booking is active.
    </p>

    <!-- Amount highlight -->
    ${
      amount
        ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;
                        padding:20px 24px;margin-bottom:28px;text-align:center;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:.08em;
                   text-transform:uppercase;color:#16a34a;">Amount Paid</p>
        <p style="margin:0;font-size:32px;font-weight:700;color:#15803d;">
          ${currency} ${amount}
        </p>
      </div>`
        : ""
    }

    <!-- Booking details table -->
    <p style="margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:.08em;
               text-transform:uppercase;color:#94a3b8;">Payment details</p>

    <table class="info-table stack-on-mobile" width="100%" cellpadding="0" cellspacing="0" border="0"
           style="border:1px solid #e2e8f0;border-radius:10px;border-collapse:separate;
                  border-spacing:0;overflow:hidden;margin-bottom:28px;">
      <tbody>
        ${infoRow("Booking ID", `<span style="font-family:monospace;font-weight:700;word-break:break-all;overflow-wrap:anywhere;">${bookingId}</span>`)}
        ${infoRow("Customer", wrapValue(customerName))}
        ${paymentMethod ? infoRow("Method", paymentMethod === "ONLINE" ? badge("Online (Stripe)", "#166534", "#dcfce7") : badge("Cash on Delivery", "#92400e", "#fef3c7")) : ""}
        ${paidAt ? infoRow("Paid at", wrapValue(paidAt)) : ""}
        ${amount ? infoRow("Total paid", `<strong style="word-break:break-word;overflow-wrap:anywhere;">${currency} ${amount}</strong>`) : ""}
      </tbody>
    </table>

    <!-- CTA -->
    ${ctaButton("View My Booking", `${baseUrl}/dashboard`)}

    <p style="margin:0;font-size:14px;color:#475569;">
      A PDF invoice is attached to this email or available in your dashboard.<br/>
      Thank you for choosing <strong>${companyName}</strong> — we look forward to serving you.
    </p>
  `;

  return emailLayout(
    content,
    `You received this receipt because you completed a payment with ${companyName}.`,
  );
}
