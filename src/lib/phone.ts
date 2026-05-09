export type CountryDialCode = {
  code: string;
  label: string;
};

export const COUNTRY_DIAL_CODES: CountryDialCode[] = [
  { code: "+971", label: "UAE" },
  { code: "+966", label: "Saudi Arabia" },
  { code: "+974", label: "Qatar" },
  { code: "+965", label: "Kuwait" },
  { code: "+973", label: "Bahrain" },
  { code: "+968", label: "Oman" },
  { code: "+91", label: "India" },
  { code: "+44", label: "United Kingdom" },
  { code: "+1", label: "United States / Canada" },
  { code: "+33", label: "France" },
  { code: "+49", label: "Germany" },
  { code: "+61", label: "Australia" },
];

function normalizeCountryCode(value: string) {
  const normalized = `+${value.replace(/[^\d]/g, "")}`;

  if (!/^\+[1-9]\d{0,3}$/.test(normalized)) {
    throw new Error("Enter a valid country code, such as +971 or +44.");
  }

  return normalized;
}

export function normalizeE164Phone(
  value: string,
  fallbackCountryCode = "+971",
): string {
  const trimmed = value.trim();
  const countryCode = normalizeCountryCode(fallbackCountryCode);
  const withCode = trimmed.startsWith("+") ? trimmed : `${countryCode}${trimmed}`;
  const normalized = `+${withCode.replace(/[^\d]/g, "")}`;

  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
    throw new Error("Enter a valid phone number with country code.");
  }

  return normalized;
}

export function buildE164Phone(countryCode: string, nationalNumber: string): string {
  return normalizeE164Phone(nationalNumber, countryCode);
}
