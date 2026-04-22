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

