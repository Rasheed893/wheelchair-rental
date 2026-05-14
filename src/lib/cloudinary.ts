import { v2 as cloudinary } from "cloudinary";
import { logger } from "@/lib/logger";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const CLOUDINARY_RAW_UPLOAD_SEGMENT = "/raw/upload/";
const VERSION_SEGMENT_PATTERN = /^v\d+$/;
const ID_DOCUMENT_TEMP_ROOT = "wheelchair-rental/id-documents/temp";
const ID_DOCUMENT_AUTHENTICATED_TYPE = "authenticated";
const ID_DOCUMENT_SIGNED_URL_TTL_SECONDS = 5 * 60;
const CUSTOMER_ROOT = "wheelchair-rental/customers";

type CloudinaryResourceType = "image" | "raw" | "video" | string;

export type CloudinaryResource = {
  public_id: string;
  resource_type?: CloudinaryResourceType;
  type?: string;
  created_at?: string;
  format?: string;
  version?: number | string;
  original_filename?: string;
};

export type IdDocumentMoveErrorDetails = {
  originalPublicId?: string;
  targetPublicId?: string;
  resourceType?: string;
  deliveryType?: string;
  cloudinaryMessage?: string;
  cloudinaryHttpCode?: number;
  step?: "validate" | "verify-source" | "rename" | "copy" | "delete-source";
};

export class CloudinaryIdDocumentMoveError extends Error {
  constructor(
    message: string,
    public readonly details: IdDocumentMoveErrorDetails,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "CloudinaryIdDocumentMoveError";
  }
}

export function logCloudinaryTarget({
  publicId,
  resourceType,
  deliveryType,
}: {
  publicId: string;
  resourceType: string;
  deliveryType: string;
}) {
  logger.info("[CLOUDINARY TARGET]", {
    publicId,
    resourceType,
    deliveryType,
  });
}

export function assertCloudinaryPublicId({
  expectedPublicId,
  actualPublicId,
  context,
  allowPdfExtension = false,
}: {
  expectedPublicId: string;
  actualPublicId?: string | null;
  context: string;
  allowPdfExtension?: boolean;
}) {
  const normalizedActualPublicId = allowPdfExtension
    ? actualPublicId
      ? normalizePdfPublicId(actualPublicId)
      : actualPublicId
    : actualPublicId;

  if (normalizedActualPublicId !== expectedPublicId) {
    throw new Error(
      `${context} returned unexpected Cloudinary public_id: ${actualPublicId ?? "missing"}; expected ${expectedPublicId}`,
    );
  }
}

export function normalizePdfPublicId(value: string) {
  return value.replace(/\.pdf$/i, "");
}

function getCloudinaryErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return typeof error === "string" ? error : undefined;
}

function getCloudinaryHttpCode(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "http_code" in error &&
    typeof (error as { http_code?: unknown }).http_code === "number"
  ) {
    return (error as { http_code: number }).http_code;
  }

  return undefined;
}

function createIdDocumentMoveError({
  message,
  details,
  cause,
}: {
  message: string;
  details: IdDocumentMoveErrorDetails;
  cause?: unknown;
}) {
  return new CloudinaryIdDocumentMoveError(
    message,
    {
      ...details,
      cloudinaryMessage: getCloudinaryErrorMessage(cause),
      cloudinaryHttpCode: getCloudinaryHttpCode(cause),
    },
    { cause },
  );
}

export function safeCloudinaryFolderName(name: string) {
  const safe = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return safe || "customer";
}

export function buildCustomerCloudinaryFolder({
  customerName,
  userId,
}: {
  customerName: string;
  userId: string;
}) {
  return `${CUSTOMER_ROOT}/${safeCloudinaryFolderName(customerName)}-${userId}`;
}

export function buildCustomerBookingCloudinaryFolder({
  customerName,
  userId,
  bookingId,
}: {
  customerName: string;
  userId: string;
  bookingId: string;
}) {
  return `${buildCustomerCloudinaryFolder({
    customerName,
    userId,
  })}/bookings/${bookingId}`;
}

export function buildBookingAssetPublicId({
  customerName,
  userId,
  bookingId,
  assetName,
}: {
  customerName: string;
  userId: string;
  bookingId: string;
  assetName: "id-document" | "invoice" | "rental-contract";
}) {
  return `${buildCustomerBookingCloudinaryFolder({
    customerName,
    userId,
    bookingId,
  })}/${assetName}`;
}

export function buildInvoicePublicId({
  customerName,
  userId,
  bookingId,
}: {
  customerName: string;
  userId: string;
  bookingId: string;
}) {
  return buildBookingAssetPublicId({
    customerName,
    userId,
    bookingId,
    assetName: "invoice",
  });
}

export function normalizeInvoicePublicId(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return trimmed.replace(/\.pdf$/i, "");
  }

  try {
    const url = new URL(trimmed);
    const uploadIndex = url.pathname.indexOf(CLOUDINARY_RAW_UPLOAD_SEGMENT);
    if (uploadIndex === -1) {
      return null;
    }

    const rawPath = url.pathname
      .slice(uploadIndex + CLOUDINARY_RAW_UPLOAD_SEGMENT.length)
      .split("/")
      .filter(Boolean);

    if (rawPath.length === 0) {
      return null;
    }

    const publicIdSegments = VERSION_SEGMENT_PATTERN.test(rawPath[0])
      ? rawPath.slice(1)
      : rawPath;

    if (publicIdSegments.length === 0) {
      return null;
    }

    return publicIdSegments.join("/").replace(/\.pdf$/i, "");
  } catch {
    return null;
  }
}

export function getInvoiceRawUrl(publicId: string) {
  return cloudinary.url(publicId, {
    resource_type: "raw",
    secure: true,
    type: "upload",
    format: "pdf",
    flags: "attachment",
  });
}

export function parseAuthenticatedCloudinaryReference(value?: string | null) {
  const prefix = "cloudinary:";
  const trimmed = value?.trim();
  if (!trimmed?.startsWith(prefix)) {
    return null;
  }

  const rest = trimmed.slice(prefix.length);
  const deliverySeparatorIndex = rest.indexOf(":");
  if (deliverySeparatorIndex <= 0) {
    return null;
  }

  const deliveryType = rest.slice(0, deliverySeparatorIndex);
  if (
    deliveryType !== ID_DOCUMENT_AUTHENTICATED_TYPE &&
    deliveryType !== "private"
  ) {
    return null;
  }

  const typedRest = rest.slice(deliverySeparatorIndex + 1);
  const resourceSeparatorIndex = typedRest.indexOf(":");
  if (resourceSeparatorIndex <= 0) {
    return null;
  }

  return {
    deliveryType,
    resourceType: typedRest.slice(0, resourceSeparatorIndex),
    publicId: typedRest.slice(resourceSeparatorIndex + 1),
  };
}

export type IdDocumentCloudinaryReference = {
  publicId: string;
  resourceType: string;
  deliveryType: string;
  format?: string | null;
  originalFilename?: string | null;
};

export function buildIdDocumentReference({
  resourceType,
  deliveryType,
  publicId,
}: {
  resourceType: string;
  deliveryType?: string | null;
  publicId: string;
}) {
  const safeDeliveryType = deliveryType?.trim() || ID_DOCUMENT_AUTHENTICATED_TYPE;
  return `cloudinary:${safeDeliveryType}:${resourceType}:${publicId}`;
}

export function buildAuthenticatedCloudinaryReference({
  resourceType,
  publicId,
}: {
  resourceType: string;
  publicId: string;
}) {
  return buildIdDocumentReference({
    resourceType,
    deliveryType: ID_DOCUMENT_AUTHENTICATED_TYPE,
    publicId,
  });
}

export function getUserTempIdDocumentPrefix(userId: string) {
  return `${ID_DOCUMENT_TEMP_ROOT}/${userId}/`;
}

export function isUserTempIdDocumentPublicId(publicId: string, userId: string) {
  return publicId.startsWith(getUserTempIdDocumentPrefix(userId));
}

export async function deleteUserTempIdDocumentUpload({
  reference,
  userId,
}: {
  reference: string;
  userId: string;
}) {
  const parsed = parseAuthenticatedCloudinaryReference(reference);
  if (!parsed || !isUserTempIdDocumentPublicId(parsed.publicId, userId)) {
    return { deleted: false, reason: "invalid-or-not-owned" as const };
  }

  const result = await cloudinary.uploader.destroy(parsed.publicId, {
    resource_type: parsed.resourceType,
    type: parsed.deliveryType,
    invalidate: true,
  });

  return {
    deleted: result.result === "ok" || result.result === "not found",
    result: result.result as string | undefined,
    publicId: parsed.publicId,
    resourceType: parsed.resourceType,
  };
}

export async function moveTempIdDocumentToBookingFolder({
  reference,
  userId,
  customerName,
  bookingId,
  format,
}: {
  reference: string;
  userId: string;
  customerName: string;
  bookingId: string;
  format?: string | null;
}) {
  const parsed = parseAuthenticatedCloudinaryReference(reference);
  if (!parsed || !isUserTempIdDocumentPublicId(parsed.publicId, userId)) {
    throw createIdDocumentMoveError({
      message: "ID document temp upload is invalid or not owned by user",
      details: {
        originalPublicId: parsed?.publicId,
        resourceType: parsed?.resourceType,
        deliveryType: parsed?.deliveryType,
        step: "validate",
      },
    });
  }

  const targetPublicId = buildBookingAssetPublicId({
    customerName,
    userId,
    bookingId,
    assetName: "id-document",
  });

  const moveDetails = {
    originalPublicId: parsed.publicId,
    targetPublicId,
    resourceType: parsed.resourceType,
    deliveryType: parsed.deliveryType,
  };

  let source: CloudinaryResource;
  let sourcePublicId = parsed.publicId;
  try {
    const verified = await findAuthenticatedResource({
      publicId: parsed.publicId,
      resourceType: parsed.resourceType,
      deliveryType: parsed.deliveryType,
      format,
    });
    source = verified.resource;
    sourcePublicId = verified.publicId;
  } catch (error) {
    throw createIdDocumentMoveError({
      message: "ID document temp upload was not found in Cloudinary",
      details: { ...moveDetails, step: "verify-source" },
      cause: error,
    });
  }

  const toMovedMetadata = (result: {
    public_id?: string;
    resource_type?: string;
    type?: string;
    format?: string;
    version?: number | string;
    original_filename?: string;
  }) => ({
    publicId: result.public_id || targetPublicId,
    resourceType: result.resource_type || parsed.resourceType,
    deliveryType: result.type || parsed.deliveryType,
    format: result.format ?? source.format ?? null,
    version:
      result.version === undefined || result.version === null
        ? source.version === undefined || source.version === null
          ? null
          : String(source.version)
        : String(result.version),
    originalFilename: result.original_filename ?? source.original_filename ?? null,
    reference: buildIdDocumentReference({
      publicId: result.public_id || targetPublicId,
      resourceType: result.resource_type || parsed.resourceType,
      deliveryType: result.type || parsed.deliveryType,
    }),
  });

  try {
    logCloudinaryTarget({
      publicId: targetPublicId,
      resourceType: parsed.resourceType,
      deliveryType: parsed.deliveryType,
    });

    const result = await cloudinary.uploader.rename(
      sourcePublicId,
      targetPublicId,
      {
        resource_type: parsed.resourceType,
        type: parsed.deliveryType,
        to_type: parsed.deliveryType,
        overwrite: true,
        invalidate: true,
      },
    );
    assertCloudinaryPublicId({
      expectedPublicId: targetPublicId,
      actualPublicId: result.public_id,
      context: "ID document rename",
    });

    return toMovedMetadata(result);
  } catch (renameError) {
    const renameMessage = getCloudinaryErrorMessage(renameError);
    const signedSourceUrl = getAuthenticatedCloudinaryUrl({
      publicId: sourcePublicId,
      resourceType: parsed.resourceType,
      deliveryType: parsed.deliveryType,
      expiresInSeconds: ID_DOCUMENT_SIGNED_URL_TTL_SECONDS,
    });

    let copied: ReturnType<typeof toMovedMetadata>;

    try {
      logCloudinaryTarget({
        publicId: targetPublicId,
        resourceType: parsed.resourceType,
        deliveryType: parsed.deliveryType,
      });

      const result = await cloudinary.uploader.upload(signedSourceUrl, {
        resource_type: parsed.resourceType as "image" | "raw" | "video",
        type: parsed.deliveryType,
        public_id: targetPublicId,
        overwrite: true,
        invalidate: true,
        use_filename: false,
        unique_filename: false,
      });
      assertCloudinaryPublicId({
        expectedPublicId: targetPublicId,
        actualPublicId: result.public_id,
        context: "ID document fallback copy",
      });

      copied = toMovedMetadata(result);
    } catch (copyError) {
      throw createIdDocumentMoveError({
        message: `ID document rename failed${
          renameMessage ? ` (${renameMessage})` : ""
        } and fallback copy failed`,
        details: { ...moveDetails, step: "copy" },
        cause: copyError,
      });
    }

    try {
      const deleteResult = await cloudinary.uploader.destroy(sourcePublicId, {
        resource_type: parsed.resourceType,
        type: parsed.deliveryType,
        invalidate: true,
      });

      if (
        deleteResult.result !== "ok" &&
        deleteResult.result !== "not found"
      ) {
        throw new Error(`Unexpected destroy result: ${deleteResult.result}`);
      }
    } catch (deleteError) {
      throw createIdDocumentMoveError({
        message: "ID document copied to customer folder but temp delete failed",
        details: { ...moveDetails, step: "delete-source" },
        cause: deleteError,
      });
    }

    return copied;
  }
}

export async function findAuthenticatedResource({
  publicId,
  resourceType,
  deliveryType,
  format,
}: {
  publicId: string;
  resourceType: string;
  deliveryType: string;
  format?: string | null;
}): Promise<{ resource: CloudinaryResource; publicId: string }> {
  const normalizedFormat = format?.trim().replace(/^\./, "");
  const candidates = [publicId];

  if (
    normalizedFormat &&
    !publicId.toLowerCase().endsWith(`.${normalizedFormat.toLowerCase()}`)
  ) {
    candidates.push(`${publicId}.${normalizedFormat}`);
  }

  let lastError: unknown;

  for (const candidate of candidates) {
    try {
      const resource = await cloudinary.api.resource(candidate, {
        resource_type: resourceType,
        type: deliveryType,
      });

      return { resource, publicId: resource.public_id || candidate };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

async function listAuthenticatedResourcesByPrefix({
  prefix,
  resourceType,
  nextCursor,
}: {
  prefix: string;
  resourceType: "image" | "raw";
  nextCursor?: string;
}): Promise<{ resources: CloudinaryResource[]; next_cursor?: string }> {
  return cloudinary.api.resources({
    type: ID_DOCUMENT_AUTHENTICATED_TYPE,
    resource_type: resourceType,
    prefix,
    max_results: 500,
    next_cursor: nextCursor,
  });
}

export async function cleanupAbandonedTempIdDocumentUploads({
  attachedReferences,
  olderThan = new Date(Date.now() - 24 * 60 * 60 * 1000),
}: {
  attachedReferences: Set<string>;
  olderThan?: Date;
}) {
  const deleted: Array<{ publicId: string; resourceType: string }> = [];
  const failed: Array<{ publicId: string; resourceType: string; error: unknown }> = [];

  for (const resourceType of ["image", "raw"] as const) {
    let nextCursor: string | undefined;

    do {
      const page = await listAuthenticatedResourcesByPrefix({
        prefix: `${ID_DOCUMENT_TEMP_ROOT}/`,
        resourceType,
        nextCursor,
      });

      for (const resource of page.resources ?? []) {
        const publicId = resource.public_id;
        const createdAt = resource.created_at ? new Date(resource.created_at) : null;
        const reference = buildAuthenticatedCloudinaryReference({
          resourceType,
          publicId,
        });

        if (!publicId.startsWith(`${ID_DOCUMENT_TEMP_ROOT}/`)) {
          continue;
        }

        if (!createdAt || createdAt >= olderThan || attachedReferences.has(reference)) {
          continue;
        }

        try {
          await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType,
            type: ID_DOCUMENT_AUTHENTICATED_TYPE,
            invalidate: true,
          });
          deleted.push({ publicId, resourceType });
        } catch (error) {
          failed.push({ publicId, resourceType, error });
        }
      }

      nextCursor = page.next_cursor;
    } while (nextCursor);
  }

  return { deleted, failed };
}

export function getAuthenticatedCloudinaryUrl({
  publicId,
  resourceType,
  deliveryType = ID_DOCUMENT_AUTHENTICATED_TYPE,
  attachment,
  expiresInSeconds = ID_DOCUMENT_SIGNED_URL_TTL_SECONDS,
}: {
  publicId: string;
  resourceType: string;
  deliveryType?: string;
  attachment?: boolean;
  expiresInSeconds?: number;
}) {
  return cloudinary.url(publicId, {
    resource_type: resourceType,
    type: deliveryType,
    secure: true,
    sign_url: true,
    expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds,
    ...(attachment ? { flags: "attachment" } : {}),
  });
}

export default cloudinary;
