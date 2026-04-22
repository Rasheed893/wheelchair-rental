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

  console.log("[EMAIL] Sending booking confirmation to customer...", {
    bookingId: rest.bookingId,
    to: maskEmail(to),
    paymentMethod: rest.paymentMethod,
    paymentStatus: rest.paymentStatus,
  });

  await sendEmail({
    to: [to],
    subject: payload.subject,
    html: payload.html,
  });

  console.log("[EMAIL] Customer booking confirmation sent", {
    bookingId: rest.bookingId,
    to: maskEmail(to),
  });
}

export async function sendAdminBookingNotificationEmail(input: BookingEmailInput) {
  const { to, ...rest } = input;
  const adminEmail = process.env.ADMIN_EMAIL?.trim();

  console.log("[EMAIL] ADMIN_EMAIL resolved", {
    bookingId: rest.bookingId,
    hasAdminEmail: Boolean(adminEmail),
    adminEmail: maskEmail(adminEmail),
  });

  if (!adminEmail) {
    console.warn("[EMAIL] Skipping admin booking email because ADMIN_EMAIL is empty", {
      bookingId: rest.bookingId,
    });
    return { skipped: true as const, reason: "ADMIN_EMAIL is empty" };
  }

  console.log("[EMAIL] Sending to admin...", {
    bookingId: rest.bookingId,
    adminEmail: maskEmail(adminEmail),
    customerEmail: maskEmail(to),
  });

  const payload = buildBookingEmailPayload(rest);
  await sendEmail({
    to: [adminEmail],
    subject: `[ADMIN] New booking ${rest.bookingId}: ${rest.wheelchairName}`,
    html: payload.html,
  });

  console.log("[EMAIL] Admin booking email sent", {
    bookingId: rest.bookingId,
    adminEmail: maskEmail(adminEmail),
  });

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
  console.log("[EMAIL] sending to:", to);
  console.log("[EMAIL] Sending payment confirmation...", {
    bookingId,
    to,
    customerName,
  });

  try {
    await sendEmail({
      to: [to],
      subject: `Booking ${bookingId} is now fully paid`,
      html: paymentReceivedTemplate({ customerName, bookingId }),
    });

    console.log("[EMAIL] success", {
      bookingId,
      to,
    });
  } catch (error) {
    console.error("[EMAIL ERROR]", {
      bookingId,
      to,
      error,
    });
    throw error;
  }
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
  console.log("[EMAIL] Sending cancellation email...", {
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

  console.log("[EMAIL] Cancellation email sent", {
    bookingId,
    to: maskEmail(to),
  });
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

  console.log("[EMAIL] Sending booking status update...", {
    bookingId,
    status,
    to: maskEmail(to),
  });

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

  console.log("[EMAIL] Booking status update sent", {
    bookingId,
    status,
    to: maskEmail(to),
  });
}
