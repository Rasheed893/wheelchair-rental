import { formatAED } from "@/lib/currency";
import { logger } from "@/lib/logger";
import { sendWhatsAppMessage } from "@/lib/whatsapp-messages";
import { sendEmail } from "@/lib/emails/resend-client";
import { emailLayout, infoRow, sectionHeading } from "@/lib/emails/templates/emailLayout";

type BookingReceivedInput = {
  bookingId: string;
  whatsappNumber?: string | null;
  securityDeposit: number;
};

type DepositNotificationInput = {
  bookingId: string;
  customerEmail?: string | null;
  customerName: string;
  whatsappNumber?: string | null;
  securityDeposit: number;
  depositStatus: "COLLECTED" | "REFUNDED" | "PARTIALLY_WITHHELD";
  deductionReason?: string | null;
  withheldAmount?: number | null;
  refundAmount?: number | null;
};

export async function notifyBookingReceived(input: BookingReceivedInput) {
  if (!input.whatsappNumber) {
    logger.info("[BOOKING NOTIFICATION] WhatsApp skipped because no contact number exists", {
      bookingId: input.bookingId,
    });
    return;
  }

  try {
    await sendWhatsAppMessage(
      input.whatsappNumber,
      `We received your booking. Our team will confirm your delivery window. A refundable deposit of AED ${input.securityDeposit} is due upon delivery.`,
    );
  } catch (error) {
    logger.warn("[WHATSAPP] Booking received notification failed", {
      bookingId: input.bookingId,
      error,
    });
  }
}

export async function notifyDepositUpdated(input: DepositNotificationInput) {
  const statusText =
    input.depositStatus === "COLLECTED"
      ? "collected"
      : input.depositStatus === "REFUNDED"
      ? "refunded"
      : "partially withheld";
  const reasonText = input.deductionReason?.trim()
    ? ` Reason: ${input.deductionReason.trim()}`
    : "";
  const message =
    input.depositStatus === "PARTIALLY_WITHHELD"
      ? `${formatAED(input.withheldAmount ?? 0)} was deducted from your deposit for ${input.deductionReason?.trim() ?? "the documented deduction"}. ${formatAED(input.refundAmount ?? 0)} will be refunded. Booking ${input.bookingId}.`
      : `Deposit ${statusText} for booking ${input.bookingId}. Amount: ${formatAED(input.securityDeposit)}.${reasonText}`;

  if (input.whatsappNumber) {
    try {
      await sendWhatsAppMessage(input.whatsappNumber, message);
    } catch (error) {
      logger.warn("[WHATSAPP] Deposit notification failed", {
        bookingId: input.bookingId,
        depositStatus: input.depositStatus,
        error,
      });
    }
  }

  if (!input.customerEmail) {
    return;
  }

  try {
    const content = `
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">
        Deposit ${statusText}
      </h2>
      <p style="margin:0 0 24px;font-size:15px;color:#475569;">
        Hi <strong>${input.customerName}</strong>, this is an update for your refundable security deposit.
      </p>

      ${sectionHeading("Deposit details")}
      <table width="100%" cellpadding="0" cellspacing="0" border="0"
             style="border:1px solid #e2e8f0;border-radius:10px;border-collapse:separate;
                    border-spacing:0;overflow:hidden;margin-bottom:24px;">
        <tbody>
          ${infoRow("Booking ID", `<span style="font-family:monospace;font-weight:700;">${input.bookingId}</span>`)}
          ${infoRow("Status", statusText)}
          ${infoRow("Security deposit", formatAED(input.securityDeposit))}
          ${
            input.depositStatus === "PARTIALLY_WITHHELD"
              ? `${infoRow("Deducted amount", formatAED(input.withheldAmount ?? 0))}
                 ${infoRow("Refund amount", formatAED(input.refundAmount ?? 0))}`
              : infoRow("Amount", formatAED(input.securityDeposit))
          }
          ${
            input.deductionReason?.trim()
              ? infoRow("Reason", input.deductionReason.trim())
              : ""
          }
        </tbody>
      </table>
    `;

    await sendEmail({
      to: [input.customerEmail],
      subject: `Deposit ${statusText} for booking ${input.bookingId}`,
      html: emailLayout(content, "Security deposit update from BioMobility."),
    });
  } catch (error) {
    logger.warn("[EMAIL] Deposit notification failed", {
      bookingId: input.bookingId,
      depositStatus: input.depositStatus,
      error,
    });
  }
}
