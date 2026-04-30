import { NextRequest, NextResponse } from "next/server";

const SENTRY_HOST = "o4511302712819712.ingest.de.sentry.io"; // ← fixed
const SENTRY_PROJECT_IDS = ["4511302723174480"];

export async function POST(request: NextRequest) {
  try {
    const envelope = await request.text();
    const piece = envelope.split("\n")[0];
    const header = JSON.parse(piece);
    const dsn = new URL(header["dsn"]);

    if (dsn.hostname !== SENTRY_HOST) {
      return NextResponse.json({ error: "Invalid DSN" }, { status: 400 });
    }

    const projectId = dsn.pathname.replace("/", "");
    if (!SENTRY_PROJECT_IDS.includes(projectId)) {
      return NextResponse.json({ error: "Invalid project" }, { status: 400 });
    }

    const sentryUrl = `https://${SENTRY_HOST}/api/${projectId}/envelope/`;
    const response = await fetch(sentryUrl, {
      method: "POST",
      body: envelope,
    });

    return NextResponse.json({}, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
