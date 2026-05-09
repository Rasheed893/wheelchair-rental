import crypto from "crypto";
import { getOptionalEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

const OTP_LENGTH = 6;

function getOtpSecret() {
  return getOptionalEnv(
    "WHATSAPP_OTP_SECRET",
    getOptionalEnv("JWT_SECRET", "fallback-dev-otp-secret"),
  );
}

export function generateWhatsAppOtp() {
  return crypto.randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, "0");
}

export function hashWhatsAppOtp(phone: string, code: string) {
  return crypto
    .createHmac("sha256", getOtpSecret())
    .update(`${phone}:${code}`)
    .digest("hex");
}

export function isOtpHashMatch(phone: string, code: string, expectedHash: string) {
  const actual = Buffer.from(hashWhatsAppOtp(phone, code), "hex");
  const expected = Buffer.from(expectedHash, "hex");

  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function logDevOtp(phone: string, code: string) {
  console.log("");
  console.log("========================================");
  console.log("BioMobility local WhatsApp OTP");
  console.log(`Phone: ${phone}`);
  console.log(`OTP:   ${code}`);
  console.log("Expires in 5 minutes.");
  console.log("========================================");
  console.log("");
}

export async function sendWhatsAppOtp(phone: string, code: string) {
  const twilioAccountSid = getOptionalEnv("TWILIO_ACCOUNT_SID");
  const twilioAuthToken = getOptionalEnv("TWILIO_AUTH_TOKEN");
  const twilioWhatsAppFrom = getOptionalEnv("TWILIO_WHATSAPP_FROM");
  const metaAccessToken = getOptionalEnv("META_WHATSAPP_ACCESS_TOKEN");
  const metaPhoneNumberId = getOptionalEnv("META_WHATSAPP_PHONE_NUMBER_ID");
  const metaTemplateName = getOptionalEnv("META_WHATSAPP_OTP_TEMPLATE");
  const hasTwilioConfig =
    Boolean(twilioAccountSid) &&
    Boolean(twilioAuthToken) &&
    Boolean(twilioWhatsAppFrom);
  const hasMetaConfig =
    Boolean(metaAccessToken) &&
    Boolean(metaPhoneNumberId) &&
    Boolean(metaTemplateName);
  const hasPartialConfig =
    Boolean(
      twilioAccountSid ||
        twilioAuthToken ||
        twilioWhatsAppFrom ||
        metaAccessToken ||
        metaPhoneNumberId ||
        metaTemplateName,
    ) &&
    !hasTwilioConfig &&
    !hasMetaConfig;

  if (hasTwilioConfig) {
    const form = new URLSearchParams({
      From: `whatsapp:${twilioWhatsAppFrom}`,
      To: `whatsapp:${phone}`,
      Body: `Your BioMobility verification code is ${code}. It expires in 5 minutes.`,
    });

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${twilioAccountSid}:${twilioAuthToken}`,
          ).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form,
      },
    );

    if (!response.ok) {
      throw new Error("Unable to send WhatsApp OTP.");
    }

    return;
  }

  if (hasMetaConfig) {
    const response = await fetch(
      `https://graph.facebook.com/v20.0/${metaPhoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${metaAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phone.replace(/^\+/, ""),
          type: "template",
          template: {
            name: metaTemplateName,
            language: { code: getOptionalEnv("META_WHATSAPP_LANGUAGE", "en_US") },
            components: [
              {
                type: "body",
                parameters: [{ type: "text", text: code }],
              },
            ],
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error("Unable to send WhatsApp OTP.");
    }

    return;
  }

  if (hasPartialConfig) {
    logger.warn("[WHATSAPP OTP] Provider configuration is incomplete", {
      hasTwilioAccountSid: Boolean(twilioAccountSid),
      hasTwilioAuthToken: Boolean(twilioAuthToken),
      hasTwilioWhatsAppFrom: Boolean(twilioWhatsAppFrom),
      hasMetaAccessToken: Boolean(metaAccessToken),
      hasMetaPhoneNumberId: Boolean(metaPhoneNumberId),
      hasMetaTemplateName: Boolean(metaTemplateName),
    });
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "WhatsApp OTP provider is not configured. Set Twilio WhatsApp or Meta WhatsApp Business API environment variables.",
    );
  }

  logDevOtp(phone, code);
}
