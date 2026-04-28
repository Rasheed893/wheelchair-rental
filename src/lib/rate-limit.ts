import { NextRequest, NextResponse } from "next/server";

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

function getClientIp(req: NextRequest) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

export function buildRateLimitKey(
  req: NextRequest,
  scope: string,
  identity?: string,
) {
  return `${scope}:${identity || getClientIp(req)}`;
}

export function rateLimit(options: RateLimitOptions): NextResponse | null {
  const now = Date.now();
  const existing = buckets.get(options.key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(options.key, {
      count: 1,
      resetAt: now + options.windowMs,
    });
    return null;
  }

  if (existing.count >= options.limit) {
    return NextResponse.json(
      {
        success: false,
        error: "Too many requests. Please try again shortly.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((existing.resetAt - now) / 1000)),
        },
      },
    );
  }

  existing.count += 1;
  buckets.set(options.key, existing);
  return null;
}
