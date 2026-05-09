import type { WheelchairCategory } from "@prisma/client";

type DepositInput = WheelchairCategory | string | null | undefined;

const AED_1000_MATCHES = ["ELECTRIC", "SCOOTER", "MOBILITY SCOOTER"];

export function getSecurityDeposit(category: DepositInput): number {
  const normalized = String(category ?? "")
    .trim()
    .replace(/[_-]/g, " ")
    .toUpperCase();

  if (AED_1000_MATCHES.some((term) => normalized.includes(term))) {
    return 1000;
  }

  return 500;
}
