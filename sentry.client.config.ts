// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();

if (process.env.NODE_ENV === "production" && dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: Number(
      process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0.1,
    ),
    enableLogs: true,
    sendDefaultPii: false,
    tunnel: "/monitoring",
  });
}
