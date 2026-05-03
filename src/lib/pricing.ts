export const VAT_RATE = 0.05;

export function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}

export function calculateTax(subtotal: number, taxRate = VAT_RATE): number {
  return roundCurrency(subtotal * taxRate);
}

export function calculateTotal(subtotal: number, taxRate = VAT_RATE): number {
  return roundCurrency(subtotal + calculateTax(subtotal, taxRate));
}

export function calculateBookingSubtotal(
  totalDays: number,
  pricePerDay: number,
): number {
  return roundCurrency(totalDays * pricePerDay);
}

export function calculateBookingPricing(
  totalDays: number,
  pricePerDay: number,
  taxRate = VAT_RATE,
) {
  const subtotal = calculateBookingSubtotal(totalDays, pricePerDay);
  const taxAmount = calculateTax(subtotal, taxRate);
  const totalAmount = calculateTotal(subtotal, taxRate);

  return {
    subtotal,
    taxAmount,
    totalAmount,
  };
}
