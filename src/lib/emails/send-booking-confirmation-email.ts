import { sendEmail } from "./resend-client";
import { bookingConfirmationTemplate } from "./templates/booking-confirmation";
import { paymentReceivedTemplate } from "./templates/payment-received";
import { VAT_RATE, calculateTax, calculateTotal } from "@/lib/pricing";

export async function sendBookingConfirmationEmail({
  to,
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
}: {
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
}) {
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

  const recipients = [to];
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  if (adminEmail && adminEmail !== to) {
    recipients.push(adminEmail);
  }

  const subjectPrefix = paymentMethod === "CASH" ? "COD booking confirmed" : "Booking confirmed";
  await sendEmail({
    to: recipients,
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
  });
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
  await sendEmail({
    to: [to],
    subject: `Payment received for booking ${bookingId}`,
    html: paymentReceivedTemplate({ customerName, bookingId }),
  });
}
