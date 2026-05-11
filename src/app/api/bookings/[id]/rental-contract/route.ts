import { NextResponse } from "next/server";
import { rentalContractService } from "@/services/rental-contract.service";
import {
  badRequest,
  forbidden,
  notFound,
  serverError,
  withCustomerAuth,
} from "@/lib/middleware";

export const GET = withCustomerAuth(async (_req, { params, user }) => {
  try {
    const contract = await rentalContractService.generate(params.id, user);

    return new NextResponse(Buffer.from(contract.bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${contract.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Booking not found") {
      return notFound("Booking");
    }

    if (error instanceof Error && error.message === "Forbidden") {
      return forbidden();
    }

    if (error instanceof Error) {
      return badRequest(error.message);
    }

    return serverError(error);
  }
});
