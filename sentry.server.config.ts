// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN?.trim();
const enabled = process.env.NODE_ENV === "production" && Boolean(dsn);

if (enabled) {
  Sentry.init({
    dsn,

    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),

    enableLogs: true,

    sendDefaultPii: false,
  });
}
