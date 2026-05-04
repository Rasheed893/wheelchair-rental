export const DELIVERY_CITIES = [
  "DUBAI",
  "SHARJAH",
  "AJMAN",
  "UAQ",
  "ABU_DHABI",
  "RAK",
  "FUJAIRAH",
  "AL_AIN",
] as const;

export const DELIVERY_WINDOWS = [
  "MORNING",
  "AFTERNOON",
  "EVENING",
] as const;

export type DeliveryCity = (typeof DELIVERY_CITIES)[number];
export type DeliveryWindow = (typeof DELIVERY_WINDOWS)[number];

export const FREE_DELIVERY_CITIES: readonly DeliveryCity[] = [
  "DUBAI",
  "SHARJAH",
  "AJMAN",
  "UAQ",
];

export const PAID_DELIVERY_CITIES: readonly DeliveryCity[] = [
  "ABU_DHABI",
  "RAK",
  "FUJAIRAH",
  "AL_AIN",
];

export const PAID_DELIVERY_FEE = 150;

export function getDeliveryFee(city: DeliveryCity): number {
  return FREE_DELIVERY_CITIES.includes(city) ? 0 : PAID_DELIVERY_FEE;
}

export function formatDeliveryCity(city: DeliveryCity): string {
  switch (city) {
    case "ABU_DHABI":
      return "Abu Dhabi";
    case "AL_AIN":
      return "Al Ain";
    case "DUBAI":
      return "Dubai";
    case "SHARJAH":
      return "Sharjah";
    case "AJMAN":
      return "Ajman";
    case "UAQ":
      return "UAQ";
    case "RAK":
      return "RAK";
    case "FUJAIRAH":
      return "Fujairah";
  }
}

export function formatDeliveryWindow(window: DeliveryWindow): string {
  switch (window) {
    case "MORNING":
      return "Morning (8am-12pm)";
    case "AFTERNOON":
      return "Afternoon (12pm-5pm)";
    case "EVENING":
      return "Evening (5pm-8pm)";
  }
}
