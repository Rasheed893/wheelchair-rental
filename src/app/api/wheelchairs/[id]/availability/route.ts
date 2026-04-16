import { NextRequest } from "next/server";
import { ok, serverError } from "@/lib/middleware";
import { wheelchairService } from "@/services/wheelchair.service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const { searchParams } = req.nextUrl;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const unavailableDates = await wheelchairService.getUnavailableDates(id);

    let isAvailable = true;

    if (startDate && endDate) {
      isAvailable = await wheelchairService.isAvailable(
        id,
        new Date(startDate),
        new Date(endDate),
      );
    }

    return ok({
      wheelchairId: id,
      unavailableDates,
      isAvailable,
    });
  } catch (error) {
    return serverError(error);
  }
}