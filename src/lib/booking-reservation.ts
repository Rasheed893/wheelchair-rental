const RESERVATION_WINDOW_MINUTES = 30;

export function getReservationWindowMs() {
  return RESERVATION_WINDOW_MINUTES * 60 * 1000;
}

export function getReservationExpiryDate(baseDate = new Date()) {
  return new Date(baseDate.getTime() + getReservationWindowMs());
}

export function getLegacyReservationCutoff(now = new Date()) {
  return new Date(now.getTime() - getReservationWindowMs());
}

export function getExpiredReservationWhere(now = new Date()) {
  const legacyCutoff = getLegacyReservationCutoff(now);

  return {
    paymentMethod: "ONLINE" as const,
    paymentStatus: "PENDING" as const,
    OR: [
      {
        reservationExpiresAt: {
          lte: now,
        },
      },
      {
        reservationExpiresAt: null,
        createdAt: {
          lte: legacyCutoff,
        },
      },
    ],
  };
}

export function getReservationBlockingWhere(now = new Date()) {
  return {
    NOT: {
      OR: [{ paymentStatus: "EXPIRED" as const }, getExpiredReservationWhere(now)],
    },
  };
}
