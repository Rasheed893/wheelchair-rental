import { NextRequest, NextResponse } from "next/server";

function getAllowedSentryTarget() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;
  if (!dsn) return null;

  try {
    const url = new URL(dsn);
    return {
      host: url.hostname,
      projectId: url.pathname.replace("/", ""),
    };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const envelope = await request.text();
    const piece = envelope.split("\n")[0];
    const header = JSON.parse(piece);
    const dsn = new URL(header.dsn);
    const target = getAllowedSentryTarget();

    if (!target || dsn.hostname !== target.host) {
      return NextResponse.json({ error: "Invalid DSN" }, { status: 400 });
    }

    const projectId = dsn.pathname.replace("/", "");
    if (projectId !== target.projectId) {
      return NextResponse.json({ error: "Invalid project" }, { status: 400 });
    }

    const sentryUrl = `https://${target.host}/api/${projectId}/envelope/`;
    const response = await fetch(sentryUrl, {
      method: "POST",
      body: envelope,
    });

    return NextResponse.json({}, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
