import { NextRequest, NextResponse } from "next/server";
import type { AuthUser, Role } from "@/types";
import { COOKIE_NAME, verifyToken } from "./auth";

type RouteParams = Record<string, string>;
type RouteContext = { params: RouteParams; user: AuthUser };
type NextRouteContext = { params: Promise<RouteParams> };
type RouteHandler = (
  req: NextRequest,
  context: RouteContext,
) => Promise<NextResponse>;

export function withAuth(handler: RouteHandler, allowedRoles?: Role[]) {
  return async (
    req: NextRequest,
    context: NextRouteContext,
  ): Promise<NextResponse> => {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    const pathname = req.nextUrl.pathname;

    console.log("[AUTH] incoming request", {
      pathname,
      method: req.method,
      hasToken: Boolean(token),
      allowedRoles: allowedRoles ?? "ANY_AUTHENTICATED_USER",
    });

    if (!token) {
      console.warn("[AUTH] missing auth token", { pathname, method: req.method });
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const payload = await verifyToken(token);

    if (!payload) {
      console.warn("[AUTH] invalid or expired token", {
        pathname,
        method: req.method,
      });
      return NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 401 },
      );
    }

    if (allowedRoles && !allowedRoles.includes(payload.role)) {
      console.warn("[AUTH] forbidden by role", {
        pathname,
        method: req.method,
        role: payload.role,
        allowedRoles,
      });
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    console.log("[AUTH] authorized", {
      pathname,
      method: req.method,
      userId: payload.sub,
      role: payload.role,
    });

    const user: AuthUser = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    };

    return handler(req, { params: await context.params, user });
  };
}

export const withAdminAuth = (handler: RouteHandler) =>
  withAuth(handler, ["ADMIN"]);

export const withCustomerAuth = (handler: RouteHandler) =>
  withAuth(handler, ["CUSTOMER", "ADMIN"]);

export function ok<T>(data: T, message?: string): NextResponse {
  return NextResponse.json({ success: true, data, message });
}

export function created<T>(data: T): NextResponse {
  return NextResponse.json({ success: true, data }, { status: 201 });
}

export function badRequest(
  error: string,
  details?: Record<string, string[]>,
): NextResponse {
  return NextResponse.json({ success: false, error, details }, { status: 400 });
}

export function unauthorized(): NextResponse {
  return NextResponse.json(
    { success: false, error: "Unauthorized" },
    { status: 401 },
  );
}

export function forbidden(): NextResponse {
  return NextResponse.json(
    { success: false, error: "Forbidden" },
    { status: 403 },
  );
}

export function notFound(entity = "Resource"): NextResponse {
  return NextResponse.json(
    { success: false, error: `${entity} not found` },
    { status: 404 },
  );
}

export function serverError(error: unknown): NextResponse {
  console.error("[API Error]", error);
  return NextResponse.json(
    { success: false, error: "Internal server error" },
    { status: 500 },
  );
}
