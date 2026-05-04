export const VAT_RATE = 0.05;

export function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}

export function calculateTax(subtotal: number, taxRate = VAT_RATE): number {
  return roundCurrency(subtotal * taxRate);
}

export function calculateTotal(
  subtotal: number,
  deliveryFee = 0,
  taxRate = VAT_RATE,
): number {
  return roundCurrency(
    subtotal + deliveryFee + calculateTax(subtotal + deliveryFee, taxRate),
  );
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
  deliveryFee = 0,
) {
  const subtotal = calculateBookingSubtotal(totalDays, pricePerDay);
  const normalizedDeliveryFee = roundCurrency(deliveryFee);
  const tax = calculateTax(subtotal + normalizedDeliveryFee, VAT_RATE);
  const total = calculateTotal(subtotal, normalizedDeliveryFee, VAT_RATE);

  return {
    subtotal,
    deliveryFee: normalizedDeliveryFee,
    tax,
    total,
    taxAmount: tax,
    totalAmount: total,
  };
}
