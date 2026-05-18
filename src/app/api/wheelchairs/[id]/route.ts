import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import {
  withAdminAuth,
  ok,
  badRequest,
  notFound,
  serverError,
} from "@/lib/middleware";
import { wheelchairService } from "@/services/wheelchair.service";
import { updateWheelchairSchema } from "@/validators/wheelchair.validator";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const wheelchair = await wheelchairService.getByIdentifier(id);

    if (!wheelchair) {
      return notFound("Wheelchair");
    }

    const response = ok(wheelchair);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    return serverError(error);
  }
}

export const PUT = withAdminAuth(async (req, { params }) => {
  try {
    const body = await req.json();

    // Optimistic lock: client must send the updatedAt it last saw
    const { updatedAt: clientUpdatedAt, ...rest } = body;

    if (!clientUpdatedAt) {
      return badRequest("Please refresh this wheelchair and try again.");
    }

    // Check for concurrent edit before validating the rest
    const current = await wheelchairService.getByIdentifier(params.id);
    if (!current) return notFound("Wheelchair");

    const serverUpdatedAt = new Date(current.updatedAt).toISOString();
    const clientTimestamp = new Date(clientUpdatedAt).toISOString();

    if (serverUpdatedAt !== clientTimestamp) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This record was modified by someone else. Please refresh and try again.",
          code: "CONFLICT",
        },
        { status: 409 },
      );
    }

    const parsed = updateWheelchairSchema.safeParse(rest);
    if (!parsed.success) {
      return badRequest(
        "Validation failed",
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      );
    }

    const wheelchair = await wheelchairService.update(params.id, parsed.data);
    const publicPath = wheelchair.slug
      ? `/wheelchairs/${wheelchair.slug}`
      : `/wheelchairs/${wheelchair.id}`;

    revalidatePath(`/en${publicPath}`, "page");
    revalidatePath(`/ar${publicPath}`, "page");
    revalidatePath("/en/wheelchairs", "page");
    revalidatePath("/ar/wheelchairs", "page");
    revalidateTag("wheelchairs", "page");
    revalidateTag("seo", "page");

    return ok(wheelchair);
  } catch (error) {
    return serverError(error);
  }
});

export const DELETE = withAdminAuth(async (_req, { params }) => {
  try {
    const wheelchair = await wheelchairService.getByIdentifier(params.id);
    if (!wheelchair) return notFound("Wheelchair");

    const publicPath = wheelchair.slug
      ? `/wheelchairs/${wheelchair.slug}`
      : `/wheelchairs/${wheelchair.id}`;

    await wheelchairService.delete(params.id);

    revalidatePath(`/en${publicPath}`, "page");
    revalidatePath(`/ar${publicPath}`, "page");
    revalidatePath("/en/wheelchairs", "page");
    revalidatePath("/ar/wheelchairs", "page");
    revalidateTag("wheelchairs", "page");
    revalidateTag("seo", "page");

    return ok(null, "Wheelchair deleted");
  } catch (error) {
    if (error instanceof Error) return badRequest(error.message);
    return serverError(error);
  }
});
