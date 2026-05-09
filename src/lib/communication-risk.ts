export type CommunicationRisk = "VERIFIED" | "UNVERIFIED_WHATSAPP";

export function getCommunicationRisk(
  whatsappNumber?: string | null,
  whatsappVerifiedAt?: Date | string | null,
): CommunicationRisk {
  return whatsappNumber && whatsappVerifiedAt
    ? "VERIFIED"
    : "UNVERIFIED_WHATSAPP";
}

export function getCommunicationPriority(
  whatsappVerifiedAt?: Date | string | null,
) {
  return whatsappVerifiedAt
    ? ["WhatsApp", "Email"]
    : ["Email", "Manual admin follow-up"];
}
