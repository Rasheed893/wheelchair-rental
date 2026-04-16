import { sendEmail } from "./resend-client";
import { bookingConfirmationTemplate } from "./templates/booking-confirmation";

console.log("[EMAIL SERVICE] sendBookingConfirmationEmail called");
export async function sendBookingConfirmationEmail({
  to,
  customerName,
  wheelchairName,
  startDate,
  endDate,
  totalPrice,
  bookingId,
}: {
  to: string;
  customerName: string;
  wheelchairName: string;
  startDate: Date;
  endDate: Date;
  totalPrice: number;
  bookingId: string;
}) {
  const formatDate = (value: Date) =>
    new Intl.DateTimeFormat("en-AE", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "Asia/Dubai",
    }).format(value);

  await sendEmail({
    to: [to],
    subject: `Booking confirmed: ${wheelchairName}`,
    html: bookingConfirmationTemplate({
      customerName,
      wheelchairName,
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      totalPrice: totalPrice.toFixed(2),
      bookingId,
    }),
  });
}
