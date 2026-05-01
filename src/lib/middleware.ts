import { NextRequest, NextResponse } from "next/server";
import type { AuthUser, Role } from "@/types";
import { COOKIE_NAME, verifyToken } from "./auth";
import { prisma } from "./prisma";
import { logger } from "./logger";

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

    logger.info("[AUTH] incoming request", {
      pathname,
      method: req.method,
      hasToken: Boolean(token),
      allowedRoles: allowedRoles ?? "ANY_AUTHENTICATED_USER",
    });

    if (!token) {
      logger.warn("[AUTH] missing auth token", {
        pathname,
        method: req.method,
      });
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const payload = await verifyToken(token);

    if (!payload) {
      logger.warn("[AUTH] invalid or expired token", {
        pathname,
        method: req.method,
      });
      return NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 401 },
      );
    }

    if (allowedRoles && !allowedRoles.includes(payload.role)) {
      logger.warn("[AUTH] forbidden by role", {
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

    const dbUser = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    if (!dbUser) {
      logger.warn("[AUTH] token subject does not exist in database", {
        pathname,
        method: req.method,
        userId: payload.sub,
      });

      const response = NextResponse.json(
        {
          success: false,
          error: "Your session is no longer valid. Please sign in again.",
        },
        { status: 401 },
      );
      response.cookies.set(COOKIE_NAME, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 0,
        path: "/",
      });
      return response;
    }

    if (allowedRoles && !allowedRoles.includes(dbUser.role)) {
      logger.warn("[AUTH] forbidden by current database role", {
        pathname,
        method: req.method,
        role: dbUser.role,
        allowedRoles,
      });
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    logger.info("[AUTH] authorized", {
      pathname,
      method: req.method,
      userId: dbUser.id,
      role: dbUser.role,
    });

    const user: AuthUser = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role,
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

export function serverError(
  error: unknown,
  message = "Internal server error",
): NextResponse {
  logger.error("[API Error]", { error });
  return NextResponse.json({ success: false, error: message }, { status: 500 });
}
