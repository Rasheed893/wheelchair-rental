export type CommunicationRisk = "CONTACT_NUMBER_PROVIDED" | "CONTACT_NUMBER_MISSING";

export function getCommunicationRisk(whatsappNumber?: string | null): CommunicationRisk {
  return whatsappNumber ? "CONTACT_NUMBER_PROVIDED" : "CONTACT_NUMBER_MISSING";
}

export function getCommunicationPriority(whatsappNumber?: string | null) {
  return whatsappNumber ? ["WhatsApp", "Email"] : ["Email", "Manual admin follow-up"];
}
