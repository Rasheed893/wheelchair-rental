import { prisma } from "@/lib/prisma";
import { badRequest, ok, serverError, withCustomerAuth } from "@/lib/middleware";
import { normalizeE164Phone } from "@/lib/phone";
import { isOtpHashMatch } from "@/lib/whatsapp-otp";

const MAX_OTP_ATTEMPTS = 5;

export const POST = withCustomerAuth(async (req, { user }) => {
  try {
    const body = await req.json();
    const phone = normalizeE164Phone(String(body?.phoneNumber ?? ""));
    const code = String(body?.code ?? "").trim();

    if (!/^\d{6}$/.test(code)) {
      return badRequest("Enter the 6-digit WhatsApp code.");
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        whatsappNumber: true,
        whatsappOtpHash: true,
        whatsappOtpExpiresAt: true,
        whatsappOtpAttempts: true,
      },
    });

    if (!currentUser?.whatsappOtpHash || currentUser.whatsappNumber !== phone) {
      return badRequest("Please request a new WhatsApp code.");
    }

    if (
      !currentUser.whatsappOtpExpiresAt ||
      currentUser.whatsappOtpExpiresAt <= new Date()
    ) {
      return badRequest("WhatsApp code expired. Please request a new one.");
    }

    if (currentUser.whatsappOtpAttempts >= MAX_OTP_ATTEMPTS) {
      return badRequest("Too many attempts. Please request a new WhatsApp code.");
    }

    if (!isOtpHashMatch(phone, code, currentUser.whatsappOtpHash)) {
      await prisma.user.update({
        where: { id: user.id },
        data: { whatsappOtpAttempts: { increment: 1 } },
      });

      return badRequest("Invalid WhatsApp code.");
    }

    const verifiedAt = new Date();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        whatsappVerifiedAt: verifiedAt,
        whatsappOtpHash: null,
        whatsappOtpExpiresAt: null,
        whatsappOtpAttempts: 0,
      },
    });

    return ok({ phoneNumber: phone, verifiedAt });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return badRequest("Invalid request body");
    }

    if (error instanceof Error) {
      return badRequest(error.message);
    }

    return serverError(error);
  }
});
