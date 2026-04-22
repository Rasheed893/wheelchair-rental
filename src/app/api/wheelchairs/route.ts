// src/app/api/wheelchairs/route.ts
import { NextRequest } from "next/server";
import { wheelchairService } from "@/services/wheelchair.service";
import { createWheelchairSchema } from "@/validators/wheelchair.validator";
import {
  withAdminAuth,
  ok,
  created,
  badRequest,
  serverError,
} from "@/lib/middleware";

// GET /api/wheelchairs — Public (list available wheelchairs)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const page = Number(searchParams.get("page") ?? 1);
    const pageSize = Number(searchParams.get("pageSize") ?? 12);
    const category = (searchParams.get("category") as any) ?? undefined;
    const search = searchParams.get("search") ?? undefined;
    const minPrice = searchParams.get("minPrice")
      ? Number(searchParams.get("minPrice"))
      : undefined;
    const maxPrice = searchParams.get("maxPrice")
      ? Number(searchParams.get("maxPrice"))
      : undefined;

    const result = await wheelchairService.list(
      { category, search, minPrice, maxPrice },
      { page, pageSize },
    );

    return ok(result);
  } catch (err) {
    return serverError(err);
  }
}

// POST /api/wheelchairs — Admin only
export const POST = withAdminAuth(async (req) => {
  try {
    const body = await req.json();
    const parsed = createWheelchairSchema.safeParse(body);

    if (!parsed.success) {
      return badRequest(
        "Validation failed",
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      );
    }

    const wheelchair = await wheelchairService.create(parsed.data);
    return created(wheelchair);
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unique")) {
      return badRequest("Serial number already exists");
    }
    return serverError(err);
  }
});
