import { NextRequest } from "next/server";
import { withAdminAuth, ok, badRequest, notFound, serverError } from "@/lib/middleware";
import { wheelchairService } from "@/services/wheelchair.service";
import { updateWheelchairSchema } from "@/validators/wheelchair.validator";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const wheelchair = await wheelchairService.getById(id);

    if (!wheelchair) {
      return notFound("Wheelchair");
    }

    return ok(wheelchair);
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
    return ok(wheelchair);
  } catch (error) {
    return serverError(error);
  }
});

export const DELETE = withAdminAuth(async (_req, { params }) => {
  try {
    await wheelchairService.delete(params.id);
    return ok(null, "Wheelchair deleted");
  } catch (error) {
    if (error instanceof Error) {
      return badRequest(error.message);
    }

    return serverError(error);
  }
});