// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://7111bbc4786c21dfc758f6ad223e5bfa@o4511302712819712.ingest.de.sentry.io/4511302723174480",
  tracesSampleRate: 1,
  enableLogs: true,
  sendDefaultPii: true,
  tunnel: "/monitoring", // fixes the /en/monitoring 404
});
