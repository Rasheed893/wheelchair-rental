// src/lib/emails/send-booking-confirmation-email.ts
import { logger } from "@sentry/nextjs";
import { sendEmail } from "./resend-client";
import { bookingConfirmationTemplate } from "./templates/booking-confirmation";
import { paymentReceivedTemplate } from "./templates/payment-received";
import { calculateBookingPricing, VAT_RATE } from "@/lib/pricing";
import { formatAddressHtml } from "@/lib/invoice-format";
import {
  formatDeliveryCity,
  formatDeliveryWindow,
  type DeliveryCity,
  type DeliveryWindow,
} from "@/lib/delivery";
import {
  emailLayout,
  infoRow,
  ctaButton,
  badge,
  sectionHeading,
} from "./templates/emailLayout";

// ── Types ─────────────────────────────────────────────────────────────────────

type BookingEmailInput = {
  to: string;
  customerName: string;
  phoneNumber: string;
  deliveryCity: string;
  deliveryWindow: string;
  deliveryAddress: string;
  deliveryNotes?: string;
  wheelchairName: string;
  startDate: Date;
  endDate: Date;
  subtotal: number;
  deliveryFee: number;
  bookingId: string;
  paymentMethod: "ONLINE" | "CASH";
  paymentStatus: "PENDING" | "PAID";
};

type PaymentConfirmationEmailInput = {
  to: string;
  customerName: string;
  customerEmail?: string;
  phoneNumber: string;
  deliveryCity: string;
  deliveryWindow: string;
  deliveryAddress: string;
  wheelchairName: string;
  startDate: Date;
  endDate: Date;
  bookingId: string;
  invoiceNumber?: string;
  invoiceUrl?: string | null;
  invoiceFilename?: string;
  invoiceAttachmentUrl?: string | null;
  totalAmount: number;
  paymentMethod: "ONLINE" | "CASH";
  supportPhone?: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

async function buildInvoiceAttachment(
  invoiceAttachmentUrl?: string | null,
  invoiceFilename?: string,
) {
  if (!invoiceAttachmentUrl || !invoiceFilename) return undefined;
  try {
    const response = await fetch(invoiceAttachmentUrl, {
      headers: { Accept: "application/pdf" },
      cache: "no-store",
    });
    if (!response.ok) {
      logger.error("[EMAIL] Failed to fetch invoice attachment", {
        invoiceAttachmentUrl,
        status: response.status,
      });
      return undefined;
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    return { filename: invoiceFilename, content: buffer.toString("base64") };
  } catch (error) {
    logger.error("[EMAIL] Invoice attachment fetch error", {
      invoiceAttachmentUrl,
      error,
    });
    return undefined;
  }
}

function maskEmail(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return "<empty>";
  const atIndex = trimmed.indexOf("@");
  if (atIndex <= 0) return "***";
  const local = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1);
  return `${local.slice(0, Math.min(2, local.length))}***@${domain}`;
}

const formatDate = (value: Date) =>
  new Intl.DateTimeFormat("en-AE", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Dubai",
  }).format(value);

const companyName = () => process.env.NEXT_PUBLIC_COMPANY_NAME ?? "WheelRent";

// ── 1. Booking confirmation (customer + admin) ────────────────────────────────

function buildBookingEmailPayload({
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
  bookingId,
  paymentMethod,
  paymentStatus,
}: Omit<BookingEmailInput, "to">) {
  const pricing = calculateBookingPricing(1, subtotal, deliveryFee);
  const paymentStatusLabel =
    paymentStatus === "PAID" ? "Paid" : "Unpaid (Cash on Delivery)";
  const subjectPrefix =
    paymentMethod === "CASH" ? "COD booking confirmed" : "Booking confirmed";

  return {
    subject: `${subjectPrefix}: ${wheelchairName}`,
    html: bookingConfirmationTemplate({
      customerName,
      phoneNumber,
      deliveryCity: formatDeliveryCity(deliveryCity as DeliveryCity),
      deliveryWindow: formatDeliveryWindow(deliveryWindow as DeliveryWindow),
      deliveryAddress,
      deliveryNotes,
      wheelchairName,
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      subtotal: subtotal.toFixed(2),
      deliveryFee: deliveryFee.toFixed(2),
      taxRate: `${(VAT_RATE * 100).toFixed(0)}%`,
      taxAmount: pricing.tax.toFixed(2),
      totalAmount: pricing.total.toFixed(2),
      bookingId,
      paymentMethod,
      paymentStatusLabel,
    }),
  };
}

export async function sendBookingConfirmationEmail(input: BookingEmailInput) {
  const { to, ...rest } = input;
  const payload = buildBookingEmailPayload(rest);
  await sendEmail({ to: [to], subject: payload.subject, html: payload.html });
}

export async function sendAdminBookingNotificationEmail(
  input: BookingEmailInput,
) {
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  if (!adminEmail) {
    console.warn(
      "[EMAIL] Skipping admin booking email — ADMIN_EMAIL is empty",
      {
        bookingId: input.bookingId,
      },
    );
    return { skipped: true as const, reason: "ADMIN_EMAIL is empty" };
  }
  const { to: _to, ...rest } = input;
  const payload = buildBookingEmailPayload(rest);
  await sendEmail({
    to: [adminEmail],
    subject: `[ADMIN] New booking ${rest.bookingId}: ${rest.wheelchairName}`,
    html: payload.html,
  });
  return { skipped: false as const };
}

// ── 2. Cash payment received (simple receipt) ─────────────────────────────────

export async function sendCashPaymentReceivedEmail({
  to,
  customerName,
  bookingId,
}: {
  to: string;
  customerName: string;
  bookingId: string;
}) {
  try {
    await sendEmail({
      to: [to],
      subject: `Booking ${bookingId} is now fully paid`,
      html: paymentReceivedTemplate({ customerName, bookingId }),
    });
    logger.info("[EMAIL] Cash payment receipt sent", { bookingId, to });
  } catch (error) {
    logger.error("[EMAIL ERROR] Cash payment receipt failed", {
      bookingId,
      to,
      error,
    });
    throw error;
  }
}

// ── 3. Customer payment confirmation (with invoice) ───────────────────────────

export async function sendCustomerPaymentConfirmationEmail(
  input: PaymentConfirmationEmailInput,
) {
  const attachment = await buildInvoiceAttachment(
    input.invoiceAttachmentUrl,
    input.invoiceFilename,
  );

  const followUp = input.supportPhone
    ? `Our team will confirm your delivery window within 2 hours. For urgent requests call: <strong>${input.supportPhone}</strong>`
    : "Our team will confirm your delivery window within 2 hours.";

  const invoiceBlock = input.invoiceUrl
    ? ctaButton(
        `Download ${input.invoiceFilename ?? "Invoice PDF"}`,
        input.invoiceUrl,
      )
    : `<p style="font-size:14px;color:#64748b;">Your invoice is being prepared and will be available shortly.</p>`;

  const content = `
    <div style="width:56px;height:56px;border-radius:50%;background:#dcfce7;
                font-size:28px;line-height:56px;text-align:center;margin-bottom:20px;">
      ✅
    </div>

    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">
      Payment Confirmed
    </h2>
    <p style="margin:0 0 28px;font-size:15px;color:#475569;">
      Hi <strong>${input.customerName}</strong>, we've received your payment and your booking is confirmed.
    </p>

    <!-- Amount highlight -->
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;
                padding:20px 24px;margin-bottom:28px;text-align:center;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:.08em;
                 text-transform:uppercase;color:#16a34a;">Total Paid</p>
      <p style="margin:0;font-size:32px;font-weight:700;color:#15803d;">
        AED ${input.totalAmount.toFixed(2)}
      </p>
    </div>

    ${sectionHeading("Booking details")}
    <table width="100%" cellpadding="0" cellspacing="0" border="0"
           style="border:1px solid #e2e8f0;border-radius:10px;border-collapse:separate;
                  border-spacing:0;overflow:hidden;margin-bottom:28px;">
      <tbody>
        ${infoRow("Booking ID", `<span style="font-family:monospace;font-weight:700;">${input.bookingId}</span>`)}
        ${infoRow("Wheelchair", input.wheelchairName)}
        ${infoRow("Rental dates", `${formatDate(input.startDate)} → ${formatDate(input.endDate)}`)}
        ${infoRow("Delivery city", formatDeliveryCity(input.deliveryCity as DeliveryCity))}
        ${infoRow("Delivery window", formatDeliveryWindow(input.deliveryWindow as DeliveryWindow))}
        ${infoRow("Address", `<span style="white-space:pre-line;word-break:break-word">${formatAddressHtml(input.deliveryAddress)}</span>`)}
        ${infoRow("Phone", input.phoneNumber)}
        ${infoRow("Payment method", input.paymentMethod === "ONLINE" ? badge("Online (Stripe)", "#166534", "#dcfce7") : badge("Cash on Delivery", "#92400e", "#fef3c7"))}
        ${input.invoiceNumber ? infoRow("Invoice number", input.invoiceNumber) : ""}
      </tbody>
    </table>

    <!-- Follow-up note -->
    <div style="background:#f8fafc;border-left:3px solid #0f5fa8;border-radius:0 6px 6px 0;
                padding:12px 16px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#0f172a;">📦 ${followUp}</p>
    </div>

    <!-- Invoice CTA -->
    ${invoiceBlock}

    <p style="margin:8px 0 0;font-size:14px;color:#475569;">
      Thank you for choosing <strong>${companyName()}</strong>.
    </p>
  `;

  await sendEmail({
    to: [input.to],
    subject: `Payment received for booking ${input.bookingId}`,
    html: emailLayout(
      content,
      `You received this receipt because you completed a payment with ${companyName()}.`,
    ),
    attachments: attachment ? [attachment] : undefined,
  });
}

// ── 4. Admin payment confirmation ─────────────────────────────────────────────

export async function sendAdminPaymentConfirmationEmail(
  input: PaymentConfirmationEmailInput,
) {
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  if (!adminEmail)
    return { skipped: true as const, reason: "ADMIN_EMAIL is empty" };

  const attachment = await buildInvoiceAttachment(
    input.invoiceAttachmentUrl,
    input.invoiceFilename,
  );

  const content = `
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0f172a;">
      💳 Payment Confirmed
    </h2>
    <p style="margin:0 0 24px;font-size:14px;color:#475569;">
      A new payment has been received. Full details below.
    </p>

    ${sectionHeading("Customer")}
    <table width="100%" cellpadding="0" cellspacing="0" border="0"
           style="border:1px solid #e2e8f0;border-radius:10px;border-collapse:separate;
                  border-spacing:0;overflow:hidden;margin-bottom:24px;">
      <tbody>
        ${infoRow("Name", input.customerName)}
        ${infoRow("Email", input.customerEmail ?? "Not available")}
        ${infoRow("Phone", input.phoneNumber)}
      </tbody>
    </table>

    ${sectionHeading("Booking")}
    <table width="100%" cellpadding="0" cellspacing="0" border="0"
           style="border:1px solid #e2e8f0;border-radius:10px;border-collapse:separate;
                  border-spacing:0;overflow:hidden;margin-bottom:24px;">
      <tbody>
        ${infoRow("Booking ID", `<span style="font-family:monospace;font-weight:700;">${input.bookingId}</span>`)}
        ${infoRow("Wheelchair", input.wheelchairName)}
        ${infoRow("Rental dates", `${formatDate(input.startDate)} → ${formatDate(input.endDate)}`)}
        ${infoRow("Delivery city", formatDeliveryCity(input.deliveryCity as DeliveryCity))}
        ${infoRow("Delivery window", formatDeliveryWindow(input.deliveryWindow as DeliveryWindow))}
        ${infoRow("Address", `<span style="white-space:pre-line;word-break:break-word">${formatAddressHtml(input.deliveryAddress)}</span>`)}
        ${infoRow("Payment method", input.paymentMethod === "ONLINE" ? badge("Online (Stripe)", "#166534", "#dcfce7") : badge("Cash on Delivery", "#92400e", "#fef3c7"))}
        ${infoRow("Status", badge("PAID", "#166534", "#dcfce7"))}
        <tr style="background:#f8fafc;">
          <td style="padding:12px 14px;font-size:14px;font-weight:700;color:#0f172a;
                      border-top:1px solid #e2e8f0;width:160px;">Total paid</td>
          <td style="padding:12px 14px;font-size:14px;font-weight:700;color:#0f172a;
                      border-top:1px solid #e2e8f0;">AED ${input.totalAmount.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>

    ${sectionHeading("Invoice")}
    <table width="100%" cellpadding="0" cellspacing="0" border="0"
           style="border:1px solid #e2e8f0;border-radius:10px;border-collapse:separate;
                  border-spacing:0;overflow:hidden;">
      <tbody>
        ${infoRow("Invoice number", input.invoiceNumber ?? "Pending")}
        ${infoRow(
          "Invoice link",
          input.invoiceUrl
            ? `<a href="${input.invoiceUrl}" style="color:#0f5fa8;text-decoration:none;font-weight:600;">${input.invoiceFilename ?? input.invoiceUrl}</a>`
            : "Not available",
        )}
      </tbody>
    </table>
  `;

  await sendEmail({
    to: [adminEmail],
    subject: `[ADMIN] Payment confirmed — booking ${input.bookingId}`,
    html: emailLayout(content, "This is an internal admin notification."),
    attachments: attachment ? [attachment] : undefined,
  });

  return { skipped: false as const };
}

// ── 5. Booking cancelled ──────────────────────────────────────────────────────

export async function sendBookingCancelledEmail({
  to,
  customerName,
  bookingId,
  supportPhone,
}: {
  to: string;
  customerName: string;
  bookingId: string;
  supportPhone?: string;
}) {
  logger.info("[EMAIL] Sending cancellation email...", {
    bookingId,
    to: maskEmail(to),
  });

  const content = `
    <div style="width:56px;height:56px;border-radius:50%;background:#fee2e2;
                font-size:28px;line-height:56px;text-align:center;margin-bottom:20px;">
      ❌
    </div>

    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">
      Booking Cancelled
    </h2>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;">
      Hi <strong>${customerName}</strong>, your booking has been cancelled.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" border="0"
           style="border:1px solid #e2e8f0;border-radius:10px;border-collapse:separate;
                  border-spacing:0;overflow:hidden;margin-bottom:28px;">
      <tbody>
        ${infoRow("Booking ID", `<span style="font-family:monospace;font-weight:700;">${bookingId}</span>`)}
        ${infoRow("Status", badge("Cancelled", "#991b1b", "#fee2e2"))}
      </tbody>
    </table>

    ${
      supportPhone
        ? `<div style="background:#fef3c7;border-left:3px solid #f59e0b;border-radius:0 6px 6px 0;
                      padding:12px 16px;margin-bottom:24px;">
          <p style="margin:0;font-size:13px;color:#92400e;">
            📞 Need help? Call us at <strong>${supportPhone}</strong>
          </p>
        </div>`
        : `<p style="font-size:14px;color:#475569;">If you have any questions, please contact our support team.</p>`
    }

    <p style="margin:0;font-size:14px;color:#475569;">
      We hope to serve you again. — The <strong>${companyName()}</strong> Team
    </p>
  `;

  await sendEmail({
    to: [to],
    subject: `Booking ${bookingId} has been cancelled`,
    html: emailLayout(
      content,
      `You received this because your booking with ${companyName()} was cancelled.`,
    ),
  });
}

// ── 6. Booking status update ──────────────────────────────────────────────────

export async function sendBookingStatusUpdateEmail({
  to,
  customerName,
  bookingId,
  status,
}: {
  to: string;
  customerName: string;
  bookingId: string;
  status: "OUT_FOR_DELIVERY" | "DELIVERED";
}) {
  const isDelivered = status === "DELIVERED";
  const readableStatus = isDelivered ? "delivered" : "out for delivery";

  const statusIcon = isDelivered ? "🎉" : "🚚";
  const statusBadge = isDelivered
    ? badge("Delivered", "#166534", "#dcfce7")
    : badge("Out for Delivery", "#1e40af", "#dbeafe");
  const statusMessage = isDelivered
    ? `Your wheelchair has been delivered. We hope it's serving you well!`
    : `Your wheelchair is on its way and will arrive within your selected delivery window.`;

  const content = `
    <div style="width:56px;height:56px;border-radius:50%;
                background:${isDelivered ? "#dcfce7" : "#dbeafe"};
                font-size:28px;line-height:56px;text-align:center;margin-bottom:20px;">
      ${statusIcon}
    </div>

    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">
      Your Booking is ${isDelivered ? "Delivered" : "On Its Way"}
    </h2>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;">
      Hi <strong>${customerName}</strong>, here's a quick update on your booking.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" border="0"
           style="border:1px solid #e2e8f0;border-radius:10px;border-collapse:separate;
                  border-spacing:0;overflow:hidden;margin-bottom:28px;">
      <tbody>
        ${infoRow("Booking ID", `<span style="font-family:monospace;font-weight:700;">${bookingId}</span>`)}
        ${infoRow("Status", statusBadge)}
      </tbody>
    </table>

    <div style="background:${isDelivered ? "#f0fdf4" : "#eff6ff"};
                border-left:3px solid ${isDelivered ? "#16a34a" : "#2563eb"};
                border-radius:0 6px 6px 0;padding:12px 16px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:${isDelivered ? "#166534" : "#1e40af"};">
        ${statusIcon} ${statusMessage}
      </p>
    </div>

    <p style="margin:0;font-size:14px;color:#475569;">
      Thank you for choosing <strong>${companyName()}</strong>.
    </p>
  `;

  await sendEmail({
    to: [to],
    subject: `Booking ${bookingId} is ${readableStatus}`,
    html: emailLayout(
      content,
      `Status update for your ${companyName()} booking.`,
    ),
  });
}

// import { logger } from "@sentry/nextjs";
// import { sendEmail } from "./resend-client";
// import { bookingConfirmationTemplate } from "./templates/booking-confirmation";
// import { paymentReceivedTemplate } from "./templates/payment-received";
// import { calculateBookingPricing, VAT_RATE } from "@/lib/pricing";
// import { formatAddressHtml } from "@/lib/invoice-format";
// import {
//   formatDeliveryCity,
//   formatDeliveryWindow,
//   type DeliveryCity,
//   type DeliveryWindow,
// } from "@/lib/delivery";

// type BookingEmailInput = {
//   to: string;
//   customerName: string;
//   phoneNumber: string;
//   deliveryCity: string;
//   deliveryWindow: string;
//   deliveryAddress: string;
//   deliveryNotes?: string;
//   wheelchairName: string;
//   startDate: Date;
//   endDate: Date;
//   subtotal: number;
//   deliveryFee: number;
//   bookingId: string;
//   paymentMethod: "ONLINE" | "CASH";
//   paymentStatus: "PENDING" | "PAID";
// };

// type PaymentConfirmationEmailInput = {
//   to: string;
//   customerName: string;
//   customerEmail?: string;
//   phoneNumber: string;
//   deliveryCity: string;
//   deliveryWindow: string;
//   deliveryAddress: string;
//   wheelchairName: string;
//   startDate: Date;
//   endDate: Date;
//   bookingId: string;
//   invoiceNumber?: string;
//   invoiceUrl?: string | null;
//   invoiceFilename?: string;
//   invoiceAttachmentUrl?: string | null;
//   totalAmount: number;
//   paymentMethod: "ONLINE" | "CASH";
//   supportPhone?: string;
// };

// async function buildInvoiceAttachment(
//   invoiceAttachmentUrl?: string | null,
//   invoiceFilename?: string,
// ) {
//   if (!invoiceAttachmentUrl || !invoiceFilename) {
//     return undefined;
//   }

//   try {
//     const response = await fetch(invoiceAttachmentUrl, {
//       headers: {
//         Accept: "application/pdf",
//       },
//       cache: "no-store",
//     });

//     if (!response.ok) {
//       logger.error("[EMAIL] Failed to fetch invoice attachment", {
//         invoiceAttachmentUrl,
//         status: response.status,
//       });
//       return undefined;
//     }

//     const buffer = Buffer.from(await response.arrayBuffer());
//     return {
//       filename: invoiceFilename,
//       content: buffer.toString("base64"),
//     };
//   } catch (error) {
//     logger.error("[EMAIL] Invoice attachment fetch error", {
//       invoiceAttachmentUrl,
//       error,
//     });
//     return undefined;
//   }
// }

// function maskEmail(value?: string | null) {
//   const trimmed = value?.trim();
//   if (!trimmed) {
//     return "<empty>";
//   }

//   const atIndex = trimmed.indexOf("@");
//   if (atIndex <= 0) {
//     return "***";
//   }

//   const local = trimmed.slice(0, atIndex);
//   const domain = trimmed.slice(atIndex + 1);
//   return `${local.slice(0, Math.min(2, local.length))}***@${domain}`;
// }

// function buildBookingEmailPayload({
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
//   bookingId,
//   paymentMethod,
//   paymentStatus,
// }: Omit<BookingEmailInput, "to">) {
//   const formatDate = (value: Date) =>
//     new Intl.DateTimeFormat("en-AE", {
//       year: "numeric",
//       month: "long",
//       day: "numeric",
//       timeZone: "Asia/Dubai",
//     }).format(value);

//   const pricing = calculateBookingPricing(1, subtotal, deliveryFee);
//   const paymentStatusLabel =
//     paymentStatus === "PAID" ? "Paid" : "Unpaid (Cash on Delivery)";
//   const subjectPrefix =
//     paymentMethod === "CASH" ? "COD booking confirmed" : "Booking confirmed";

//   return {
//     subject: `${subjectPrefix}: ${wheelchairName}`,
//     html: bookingConfirmationTemplate({
//       customerName,
//       phoneNumber,
//       deliveryCity: formatDeliveryCity(deliveryCity as DeliveryCity),
//       deliveryWindow: formatDeliveryWindow(deliveryWindow as DeliveryWindow),
//       deliveryAddress,
//       deliveryNotes,
//       wheelchairName,
//       startDate: formatDate(startDate),
//       endDate: formatDate(endDate),
//       subtotal: subtotal.toFixed(2),
//       deliveryFee: deliveryFee.toFixed(2),
//       taxRate: `${(VAT_RATE * 100).toFixed(0)}%`,
//       taxAmount: pricing.tax.toFixed(2),
//       totalAmount: pricing.total.toFixed(2),
//       bookingId,
//       paymentMethod,
//       paymentStatusLabel,
//     }),
//   };
// }

// export async function sendBookingConfirmationEmail(input: BookingEmailInput) {
//   const { to, ...rest } = input;
//   const payload = buildBookingEmailPayload(rest);

//   // console.log("[EMAIL] Sending booking confirmation to customer...", {
//   //   bookingId: rest.bookingId,
//   //   to: maskEmail(to),
//   //   paymentMethod: rest.paymentMethod,
//   //   paymentStatus: rest.paymentStatus,
//   // });

//   await sendEmail({
//     to: [to],
//     subject: payload.subject,
//     html: payload.html,
//   });

//   // console.log("[EMAIL] Customer booking confirmation sent", {
//   //   bookingId: rest.bookingId,
//   //   to: maskEmail(to),
//   // });
// }

// export async function sendAdminBookingNotificationEmail(
//   input: BookingEmailInput,
// ) {
//   const rest = {
//     customerName: input.customerName,
//     phoneNumber: input.phoneNumber,
//     deliveryCity: input.deliveryCity,
//     deliveryWindow: input.deliveryWindow,
//     deliveryAddress: input.deliveryAddress,
//     deliveryNotes: input.deliveryNotes,
//     wheelchairName: input.wheelchairName,
//     startDate: input.startDate,
//     endDate: input.endDate,
//     subtotal: input.subtotal,
//     deliveryFee: input.deliveryFee,
//     bookingId: input.bookingId,
//     paymentMethod: input.paymentMethod,
//     paymentStatus: input.paymentStatus,
//   };
//   const adminEmail = process.env.ADMIN_EMAIL?.trim();

//   // console.log("[EMAIL] ADMIN_EMAIL resolved", {
//   //   bookingId: rest.bookingId,
//   //   hasAdminEmail: Boolean(adminEmail),
//   //   adminEmail: maskEmail(adminEmail),
//   // });

//   if (!adminEmail) {
//     console.warn(
//       "[EMAIL] Skipping admin booking email because ADMIN_EMAIL is empty",
//       {
//         bookingId: rest.bookingId,
//       },
//     );
//     return { skipped: true as const, reason: "ADMIN_EMAIL is empty" };
//   }

//   // console.log("[EMAIL] Sending to admin...", {
//   //   bookingId: rest.bookingId,
//   //   adminEmail: maskEmail(adminEmail),
//   //   customerEmail: maskEmail(to),
//   // });

//   const payload = buildBookingEmailPayload(rest);
//   await sendEmail({
//     to: [adminEmail],
//     subject: `[ADMIN] New booking ${rest.bookingId}: ${rest.wheelchairName}`,
//     html: payload.html,
//   });

//   // console.log("[EMAIL] Admin booking email sent", {
//   //   bookingId: rest.bookingId,
//   //   adminEmail: maskEmail(adminEmail),
//   // });

//   return { skipped: false as const };
// }

// export async function sendCashPaymentReceivedEmail({
//   to,
//   customerName,
//   bookingId,
// }: {
//   to: string;
//   customerName: string;
//   bookingId: string;
// }) {
//   // console.log("[EMAIL] sending to:", to);
//   // console.log("[EMAIL] Sending payment confirmation...", {
//   //   bookingId,
//   //   to,
//   //   customerName,
//   // });

//   try {
//     await sendEmail({
//       to: [to],
//       subject: `Booking ${bookingId} is now fully paid`,
//       html: paymentReceivedTemplate({ customerName, bookingId }),
//     });

//     logger.info("[EMAIL] success", {
//       bookingId,
//       to,
//     });
//   } catch (error) {
//     logger.error("[EMAIL ERROR]", {
//       bookingId,
//       to,
//       error,
//     });
//     throw error;
//   }
// }

// export async function sendCustomerPaymentConfirmationEmail(
//   input: PaymentConfirmationEmailInput,
// ) {
//   const formatDate = (value: Date) =>
//     new Intl.DateTimeFormat("en-AE", {
//       year: "numeric",
//       month: "long",
//       day: "numeric",
//       timeZone: "Asia/Dubai",
//     }).format(value);

//   const attachment = await buildInvoiceAttachment(
//     input.invoiceAttachmentUrl,
//     input.invoiceFilename,
//   );
//   const followUpMessage = input.supportPhone
//     ? `We've received your booking! Our team will confirm your delivery window within 2 hours. For urgent requests call: ${input.supportPhone}`
//     : "We've received your booking! Our team will confirm your delivery window within 2 hours.";

//   await sendEmail({
//     to: [input.to],
//     subject: `Payment received for booking ${input.bookingId}`,
//     html: `
//       <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
//         <h2 style="margin-bottom:8px">Payment confirmed</h2>
//         <p>Hi ${input.customerName},</p>
//         <p>We’ve received your payment for booking <strong>${input.bookingId}</strong>. Your invoice is ready.</p>
//         <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:20px 0">
//           <p style="margin:0 0 8px"><strong>Wheelchair:</strong> ${input.wheelchairName}</p>
//           <p style="margin:0 0 8px"><strong>Rental dates:</strong> ${formatDate(input.startDate)} to ${formatDate(input.endDate)}</p>
//           <p style="margin:0 0 8px"><strong>Delivery city:</strong> ${formatDeliveryCity(input.deliveryCity as DeliveryCity)}</p>
//           <p style="margin:0 0 8px"><strong>Delivery window:</strong> ${formatDeliveryWindow(input.deliveryWindow as DeliveryWindow)}</p>
//           <p style="margin:0 0 8px"><strong>Delivery address:</strong></p>
//           <p style="margin:0 0 8px;white-space:pre-line;word-break:break-word">${formatAddressHtml(input.deliveryAddress)}</p>
//           <p style="margin:0 0 8px"><strong>Phone:</strong> ${input.phoneNumber}</p>
//           <p style="margin:0"><strong>Total paid:</strong> AED ${input.totalAmount.toFixed(2)}</p>
//         </div>
//         <p>${followUpMessage}</p>
//         ${
//           input.invoiceNumber
//             ? `<p><strong>Invoice number:</strong> ${input.invoiceNumber}</p>`
//             : ""
//         }
//         ${
//           input.invoiceUrl
//             ? `<p><a href="${input.invoiceUrl}" style="display:inline-block;background:#0f766e;color:#ffffff;padding:10px 16px;border-radius:8px;text-decoration:none">Download ${input.invoiceFilename ?? "invoice PDF"}</a></p>`
//             : "<p>Your invoice is being prepared and will be available shortly.</p>"
//         }
//         <p>Thank you for choosing ${process.env.NEXT_PUBLIC_COMPANY_NAME || "BioMobility"}.</p>
//       </div>
//     `,
//     attachments: attachment ? [attachment] : undefined,
//   });
// }

// export async function sendAdminPaymentConfirmationEmail(
//   input: PaymentConfirmationEmailInput,
// ) {
//   const adminEmail = process.env.ADMIN_EMAIL?.trim();
//   if (!adminEmail) {
//     return { skipped: true as const, reason: "ADMIN_EMAIL is empty" };
//   }

//   const formatDate = (value: Date) =>
//     new Intl.DateTimeFormat("en-AE", {
//       year: "numeric",
//       month: "long",
//       day: "numeric",
//       timeZone: "Asia/Dubai",
//     }).format(value);

//   const attachment = await buildInvoiceAttachment(
//     input.invoiceAttachmentUrl,
//     input.invoiceFilename,
//   );

//   await sendEmail({
//     to: [adminEmail],
//     subject: `[ADMIN] Payment confirmed for booking ${input.bookingId}`,
//     html: `
//       <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
//         <h2 style="margin-bottom:8px">Payment confirmation</h2>
//         <p><strong>Booking ID:</strong> ${input.bookingId}</p>
//         <p><strong>Customer:</strong> ${input.customerName}</p>
//         <p><strong>Email:</strong> ${input.customerEmail ?? "Not available"}</p>
//         <p><strong>Phone:</strong> ${input.phoneNumber}</p>
//         <p><strong>Delivery city:</strong> ${formatDeliveryCity(input.deliveryCity as DeliveryCity)}</p>
//         <p><strong>Delivery window:</strong> ${formatDeliveryWindow(input.deliveryWindow as DeliveryWindow)}</p>
//         <p><strong>Payment method:</strong> ${input.paymentMethod}</p>
//         <p><strong>Payment status:</strong> PAID</p>
//         <p><strong>Wheelchair:</strong> ${input.wheelchairName}</p>
//         <p><strong>Rental dates:</strong> ${formatDate(input.startDate)} to ${formatDate(input.endDate)}</p>
//         <p style="white-space:pre-line;word-break:break-word"><strong>Delivery address:</strong><br />${formatAddressHtml(input.deliveryAddress)}</p>
//         <p><strong>Total paid:</strong> AED ${input.totalAmount.toFixed(2)}</p>
//         <p><strong>Invoice number:</strong> ${input.invoiceNumber ?? "Pending"}</p>
//         <p><strong>Invoice link:</strong> ${
//           input.invoiceUrl
//             ? `<a href="${input.invoiceUrl}">${input.invoiceFilename ?? input.invoiceUrl}</a>`
//             : "Not available"
//         }</p>
//       </div>
//     `,
//     attachments: attachment ? [attachment] : undefined,
//   });

//   return { skipped: false as const };
// }

// export async function sendBookingCancelledEmail({
//   to,
//   customerName,
//   bookingId,
//   supportPhone,
// }: {
//   to: string;
//   customerName: string;
//   bookingId: string;
//   supportPhone?: string;
// }) {
//   logger.info("[EMAIL] Sending cancellation email...", {
//     bookingId,
//     to: maskEmail(to),
//     supportPhone: supportPhone ?? "<missing>",
//   });

//   await sendEmail({
//     to: [to],
//     subject: `Booking ${bookingId} has been cancelled`,
//     html: `
//       <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
//         <h2>Booking cancelled</h2>
//         <p>Hi ${customerName},</p>
//         <p>Your booking <strong>${bookingId}</strong> has been cancelled.</p>
//         <p>${supportPhone ? `Need help? Call us at <strong>${supportPhone}</strong>.` : "If you need help, please contact support."}</p>
//       </div>
//     `,
//   });

//   // console.log("[EMAIL] Cancellation email sent", {
//   //   bookingId,
//   //   to: maskEmail(to),
//   // });
// }

// export async function sendBookingStatusUpdateEmail({
//   to,
//   customerName,
//   bookingId,
//   status,
// }: {
//   to: string;
//   customerName: string;
//   bookingId: string;
//   status: "OUT_FOR_DELIVERY" | "DELIVERED";
// }) {
//   const readableStatus =
//     status === "OUT_FOR_DELIVERY" ? "out for delivery" : "delivered";

//   // console.log("[EMAIL] Sending booking status update...", {
//   //   bookingId,
//   //   status,
//   //   to: maskEmail(to),
//   // });

//   await sendEmail({
//     to: [to],
//     subject: `Booking ${bookingId} is ${readableStatus}`,
//     html: `
//       <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
//         <h2>Booking update</h2>
//         <p>Hi ${customerName},</p>
//         <p>Your booking <strong>${bookingId}</strong> is now <strong>${readableStatus}</strong>.</p>
//       </div>
//     `,
//   });

//   // console.log("[EMAIL] Booking status update sent", {
//   //   bookingId,
//   //   status,
//   //   to: maskEmail(to),
//   // });
// }
