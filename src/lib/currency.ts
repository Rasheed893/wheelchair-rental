const AED_FORMATTER = new Intl.NumberFormat("en-AE", {
  style: "currency",
  currency: "AED",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatAED(value: number | string): string {
  const amount = typeof value === "string" ? Number(value) : value;
  return AED_FORMATTER.format(Number.isFinite(amount) ? amount : 0);
}

