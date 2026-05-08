import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest } from "next/server";
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
    const parsed = updateWheelchairSchema.safeParse(body);

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
    revalidateTag("wheelchairs", "max");
    revalidateTag("seo", "max");

    return ok(wheelchair);
  } catch (error) {
    return serverError(error);
  }
});

export const DELETE = withAdminAuth(async (_req, { params }) => {
  try {
    await wheelchairService.delete(params.id);
    revalidatePath("/en/wheelchairs", "page");
    revalidatePath("/ar/wheelchairs", "page");
    revalidateTag("wheelchairs", "max");
    revalidateTag("seo", "max");
    return ok(null, "Wheelchair deleted");
  } catch (error) {
    if (error instanceof Error) {
      return badRequest(error.message);
    }

    return serverError(error);
  }
});
