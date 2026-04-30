import * as Sentry from "@sentry/nextjs";

type LogContext = Record<string, unknown>;

function toError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error(typeof error === "string" ? error : JSON.stringify(error));
}

export const logger = {
  info: (tag: string, context: LogContext = {}) => {
    console.log(`[${tag}]`, context);
    Sentry.addBreadcrumb({ message: tag, data: context, level: "info" });
  },

  warn: (tag: string, context: LogContext = {}) => {
    console.warn(`[${tag}]`, context);
    Sentry.addBreadcrumb({ message: tag, data: context, level: "warning" });
  },

  error: (tag: string, context: LogContext = {}) => {
    const { error, ...extra } = context;
    console.error(`[${tag}]`, context);
    Sentry.captureException(toError(error), {
      tags: { tag },
      extra,
    });
  },
};
