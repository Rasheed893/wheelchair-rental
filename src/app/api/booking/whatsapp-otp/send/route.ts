import { prisma } from "@/lib/prisma";
import { buildRateLimitKey, rateLimit } from "@/lib/rate-limit";
import { badRequest, ok, serverError, withCustomerAuth } from "@/lib/middleware";
import { logger } from "@/lib/logger";
import { normalizeE164Phone } from "@/lib/phone";
import {
  generateWhatsAppOtp,
  hashWhatsAppOtp,
  sendWhatsAppOtp,
} from "@/lib/whatsapp-otp";

const OTP_TTL_MS = 5 * 60 * 1000;

export const POST = withCustomerAuth(async (req, { user }) => {
  try {
    const limited = rateLimit({
      key: buildRateLimitKey(req, "whatsapp-otp:send", user.id),
      limit: 3,
      windowMs: 10 * 60_000,
    });

    if (limited) {
      return limited;
    }

    const body = await req.json();
    const phone = normalizeE164Phone(String(body?.phoneNumber ?? ""));
    const code = generateWhatsAppOtp();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        whatsappNumber: phone,
        whatsappOtpHash: hashWhatsAppOtp(phone, code),
        whatsappOtpExpiresAt: new Date(Date.now() + OTP_TTL_MS),
        whatsappOtpAttempts: 0,
        whatsappVerifiedAt: null,
      },
    });

    try {
      await sendWhatsAppOtp(phone, code);
    } catch (sendError) {
      logger.warn("[WHATSAPP OTP] Verification unavailable", {
        userId: user.id,
        phone,
        error:
          sendError instanceof Error ? sendError.message : String(sendError),
      });

      return ok({
        phoneNumber: phone,
        verificationUnavailable: true,
        message: "Verification unavailable right now. You can continue booking.",
      });
    }

    return ok({ phoneNumber: phone, expiresInSeconds: OTP_TTL_MS / 1000 });
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
