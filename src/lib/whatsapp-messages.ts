import { getOptionalEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

type WhatsAppSendResult =
  | { sent: true; provider: "twilio" | "meta" }
  | { sent: false; reason: "missing-provider" | "partial-provider" };

function getWhatsAppProviderConfig() {
  const twilioAccountSid = getOptionalEnv("TWILIO_ACCOUNT_SID");
  const twilioAuthToken = getOptionalEnv("TWILIO_AUTH_TOKEN");
  const twilioWhatsAppFrom = getOptionalEnv("TWILIO_WHATSAPP_FROM");
  const metaAccessToken = getOptionalEnv("META_WHATSAPP_ACCESS_TOKEN");
  const metaPhoneNumberId = getOptionalEnv("META_WHATSAPP_PHONE_NUMBER_ID");

  const hasTwilioConfig =
    Boolean(twilioAccountSid) &&
    Boolean(twilioAuthToken) &&
    Boolean(twilioWhatsAppFrom);
  const hasMetaConfig = Boolean(metaAccessToken) && Boolean(metaPhoneNumberId);
  const hasPartialConfig =
    Boolean(
      twilioAccountSid ||
        twilioAuthToken ||
        twilioWhatsAppFrom ||
        metaAccessToken ||
        metaPhoneNumberId,
    ) &&
    !hasTwilioConfig &&
    !hasMetaConfig;

  return {
    twilioAccountSid,
    twilioAuthToken,
    twilioWhatsAppFrom,
    metaAccessToken,
    metaPhoneNumberId,
    hasTwilioConfig,
    hasMetaConfig,
    hasPartialConfig,
  };
}

export async function sendWhatsAppMessage(
  phone: string | null | undefined,
  message: string,
): Promise<WhatsAppSendResult> {
  const trimmedPhone = phone?.trim();
  if (!trimmedPhone) {
    return { sent: false, reason: "missing-provider" };
  }

  const config = getWhatsAppProviderConfig();

  if (config.hasTwilioConfig) {
    const form = new URLSearchParams({
      From: `whatsapp:${config.twilioWhatsAppFrom}`,
      To: `whatsapp:${trimmedPhone}`,
      Body: message,
    });

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${config.twilioAccountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${config.twilioAccountSid}:${config.twilioAuthToken}`,
          ).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form,
      },
    );

    if (!response.ok) {
      throw new Error("Unable to send WhatsApp message.");
    }

    return { sent: true, provider: "twilio" };
  }

  if (config.hasMetaConfig) {
    const response = await fetch(
      `https://graph.facebook.com/v20.0/${config.metaPhoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.metaAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: trimmedPhone.replace(/^\+/, ""),
          type: "text",
          text: { preview_url: false, body: message },
        }),
      },
    );

    if (!response.ok) {
      throw new Error("Unable to send WhatsApp message.");
    }

    return { sent: true, provider: "meta" };
  }

  const reason = config.hasPartialConfig ? "partial-provider" : "missing-provider";
  logger.warn("[WHATSAPP] Message not sent because provider is not configured", {
    phone: trimmedPhone,
    reason,
  });

  if (process.env.NODE_ENV !== "production") {
    console.log("");
    console.log("========================================");
    console.log("BioMobility local WhatsApp message");
    console.log(`Phone: ${trimmedPhone}`);
    console.log(message);
    console.log("========================================");
    console.log("");
  }

  return { sent: false, reason };
}
