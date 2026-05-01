import { logger } from "@sentry/nextjs";
import { sendEmail } from "./resend-client";
import { bookingConfirmationTemplate } from "./templates/booking-confirmation";
import { paymentReceivedTemplate } from "./templates/payment-received";
import { VAT_RATE, calculateTax, calculateTotal } from "@/lib/pricing";

type BookingEmailInput = {
  to: string;
  customerName: string;
  phoneNumber: string;
  deliveryAddress: string;
  deliveryNotes?: string;
  wheelchairName: string;
  startDate: Date;
  endDate: Date;
  subtotal: number;
  bookingId: string;
  paymentMethod: "ONLINE" | "CASH";
  paymentStatus: "PENDING" | "PAID";
};

type PaymentConfirmationEmailInput = {
  to: string;
  customerName: string;
  customerEmail?: string;
  phoneNumber: string;
  deliveryAddress: string;
  wheelchairName: string;
  startDate: Date;
  endDate: Date;
  bookingId: string;
  invoiceNumber?: string;
  invoiceUrl?: string | null;
  totalAmount: number;
  paymentMethod: "ONLINE" | "CASH";
};

function maskEmail(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return "<empty>";
  }

  const atIndex = trimmed.indexOf("@");
  if (atIndex <= 0) {
    return "***";
  }

  const local = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1);
  return `${local.slice(0, Math.min(2, local.length))}***@${domain}`;
}

function buildBookingEmailPayload({
  customerName,
  phoneNumber,
  deliveryAddress,
  deliveryNotes,
  wheelchairName,
  startDate,
  endDate,
  subtotal,
  bookingId,
  paymentMethod,
  paymentStatus,
}: Omit<BookingEmailInput, "to">) {
  const formatDate = (value: Date) =>
    new Intl.DateTimeFormat("en-AE", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "Asia/Dubai",
    }).format(value);

  const taxAmount = calculateTax(subtotal, VAT_RATE);
  const totalAmount = calculateTotal(subtotal, VAT_RATE);
  const paymentStatusLabel =
    paymentStatus === "PAID" ? "Paid" : "Unpaid (Cash on Delivery)";
  const subjectPrefix =
    paymentMethod === "CASH" ? "COD booking confirmed" : "Booking confirmed";

  return {
    subject: `${subjectPrefix}: ${wheelchairName}`,
    html: bookingConfirmationTemplate({
      customerName,
      phoneNumber,
      deliveryAddress,
      deliveryNotes,
      wheelchairName,
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      subtotal: subtotal.toFixed(2),
      taxRate: `${(VAT_RATE * 100).toFixed(0)}%`,
      taxAmount: taxAmount.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      bookingId,
      paymentMethod,
      paymentStatusLabel,
    }),
  };
}

export async function sendBookingConfirmationEmail(input: BookingEmailInput) {
  const { to, ...rest } = input;
  const payload = buildBookingEmailPayload(rest);

  // console.log("[EMAIL] Sending booking confirmation to customer...", {
  //   bookingId: rest.bookingId,
  //   to: maskEmail(to),
  //   paymentMethod: rest.paymentMethod,
  //   paymentStatus: rest.paymentStatus,
  // });

  await sendEmail({
    to: [to],
    subject: payload.subject,
    html: payload.html,
  });

  // console.log("[EMAIL] Customer booking confirmation sent", {
  //   bookingId: rest.bookingId,
  //   to: maskEmail(to),
  // });
}

export async function sendAdminBookingNotificationEmail(
  input: BookingEmailInput,
) {
  const { to, ...rest } = input;
  const adminEmail = process.env.ADMIN_EMAIL?.trim();

  // console.log("[EMAIL] ADMIN_EMAIL resolved", {
  //   bookingId: rest.bookingId,
  //   hasAdminEmail: Boolean(adminEmail),
  //   adminEmail: maskEmail(adminEmail),
  // });

  if (!adminEmail) {
    console.warn(
      "[EMAIL] Skipping admin booking email because ADMIN_EMAIL is empty",
      {
        bookingId: rest.bookingId,
      },
    );
    return { skipped: true as const, reason: "ADMIN_EMAIL is empty" };
  }

  // console.log("[EMAIL] Sending to admin...", {
  //   bookingId: rest.bookingId,
  //   adminEmail: maskEmail(adminEmail),
  //   customerEmail: maskEmail(to),
  // });

  const payload = buildBookingEmailPayload(rest);
  await sendEmail({
    to: [adminEmail],
    subject: `[ADMIN] New booking ${rest.bookingId}: ${rest.wheelchairName}`,
    html: payload.html,
  });

  // console.log("[EMAIL] Admin booking email sent", {
  //   bookingId: rest.bookingId,
  //   adminEmail: maskEmail(adminEmail),
  // });

  return { skipped: false as const };
}

export async function sendCashPaymentReceivedEmail({
  to,
  customerName,
  bookingId,
}: {
  to: string;
  customerName: string;
  bookingId: string;
}) {
  // console.log("[EMAIL] sending to:", to);
  // console.log("[EMAIL] Sending payment confirmation...", {
  //   bookingId,
  //   to,
  //   customerName,
  // });

  try {
    await sendEmail({
      to: [to],
      subject: `Booking ${bookingId} is now fully paid`,
      html: paymentReceivedTemplate({ customerName, bookingId }),
    });

    logger.info("[EMAIL] success", {
      bookingId,
      to,
    });
  } catch (error) {
    logger.error("[EMAIL ERROR]", {
      bookingId,
      to,
      error,
    });
    throw error;
  }
}

export async function sendCustomerPaymentConfirmationEmail(
  input: PaymentConfirmationEmailInput,
) {
  const formatDate = (value: Date) =>
    new Intl.DateTimeFormat("en-AE", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "Asia/Dubai",
    }).format(value);

  await sendEmail({
    to: [input.to],
    subject: `Payment received for booking ${input.bookingId}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
        <h2 style="margin-bottom:8px">Payment confirmed</h2>
        <p>Hi ${input.customerName},</p>
        <p>We’ve received your payment for booking <strong>${input.bookingId}</strong>. Your invoice is ready.</p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:20px 0">
          <p style="margin:0 0 8px"><strong>Wheelchair:</strong> ${input.wheelchairName}</p>
          <p style="margin:0 0 8px"><strong>Rental dates:</strong> ${formatDate(input.startDate)} to ${formatDate(input.endDate)}</p>
          <p style="margin:0 0 8px"><strong>Delivery address:</strong> ${input.deliveryAddress}</p>
          <p style="margin:0 0 8px"><strong>Phone:</strong> ${input.phoneNumber}</p>
          <p style="margin:0"><strong>Total paid:</strong> AED ${input.totalAmount.toFixed(2)}</p>
        </div>
        ${
          input.invoiceNumber
            ? `<p><strong>Invoice number:</strong> ${input.invoiceNumber}</p>`
            : ""
        }
        ${
          input.invoiceUrl
            ? `<p><a href="${input.invoiceUrl}" style="display:inline-block;background:#0f766e;color:#ffffff;padding:10px 16px;border-radius:8px;text-decoration:none">Download your invoice PDF</a></p>`
            : "<p>Your invoice is being prepared and will be available shortly.</p>"
        }
        <p>Thank you for choosing ${process.env.NEXT_PUBLIC_COMPANY_NAME || "BioMobility"}.</p>
      </div>
    `,
  });
}

export async function sendAdminPaymentConfirmationEmail(
  input: PaymentConfirmationEmailInput,
) {
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  if (!adminEmail) {
    return { skipped: true as const, reason: "ADMIN_EMAIL is empty" };
  }

  const formatDate = (value: Date) =>
    new Intl.DateTimeFormat("en-AE", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "Asia/Dubai",
    }).format(value);

  await sendEmail({
    to: [adminEmail],
    subject: `[ADMIN] Payment confirmed for booking ${input.bookingId}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
        <h2 style="margin-bottom:8px">Payment confirmation</h2>
        <p><strong>Booking ID:</strong> ${input.bookingId}</p>
        <p><strong>Customer:</strong> ${input.customerName}</p>
        <p><strong>Email:</strong> ${input.customerEmail ?? "Not available"}</p>
        <p><strong>Phone:</strong> ${input.phoneNumber}</p>
        <p><strong>Payment method:</strong> ${input.paymentMethod}</p>
        <p><strong>Payment status:</strong> PAID</p>
        <p><strong>Wheelchair:</strong> ${input.wheelchairName}</p>
        <p><strong>Rental dates:</strong> ${formatDate(input.startDate)} to ${formatDate(input.endDate)}</p>
        <p><strong>Total paid:</strong> AED ${input.totalAmount.toFixed(2)}</p>
        <p><strong>Invoice number:</strong> ${input.invoiceNumber ?? "Pending"}</p>
        <p><strong>Invoice link:</strong> ${
          input.invoiceUrl
            ? `<a href="${input.invoiceUrl}">${input.invoiceUrl}</a>`
            : "Not available"
        }</p>
      </div>
    `,
  });

  return { skipped: false as const };
}

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
    supportPhone: supportPhone ?? "<missing>",
  });

  await sendEmail({
    to: [to],
    subject: `Booking ${bookingId} has been cancelled`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
        <h2>Booking cancelled</h2>
        <p>Hi ${customerName},</p>
        <p>Your booking <strong>${bookingId}</strong> has been cancelled.</p>
        <p>${supportPhone ? `Need help? Call us at <strong>${supportPhone}</strong>.` : "If you need help, please contact support."}</p>
      </div>
    `,
  });

  // console.log("[EMAIL] Cancellation email sent", {
  //   bookingId,
  //   to: maskEmail(to),
  // });
}

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
  const readableStatus =
    status === "OUT_FOR_DELIVERY" ? "out for delivery" : "delivered";

  // console.log("[EMAIL] Sending booking status update...", {
  //   bookingId,
  //   status,
  //   to: maskEmail(to),
  // });

  await sendEmail({
    to: [to],
    subject: `Booking ${bookingId} is ${readableStatus}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
        <h2>Booking update</h2>
        <p>Hi ${customerName},</p>
        <p>Your booking <strong>${bookingId}</strong> is now <strong>${readableStatus}</strong>.</p>
      </div>
    `,
  });

  // console.log("[EMAIL] Booking status update sent", {
  //   bookingId,
  //   status,
  //   to: maskEmail(to),
  // });
}
