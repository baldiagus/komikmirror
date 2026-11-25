export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly fieldErrors?: Record<string, string[]>;

  constructor(
    code: ErrorCode,
    message: string,
    fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | {
      ok: false;
      code: ErrorCode;
      error: string;
      fieldErrors?: Record<string, string[]>;
    };

export function toActionError(err: unknown): ActionResult<never> {
  if (err instanceof AppError) {
    return {
      ok: false,
      code: err.code,
      error: err.message,
      fieldErrors: err.fieldErrors,
    };
  }

  // Detect MySQL duplicate key error without leaking SQL details.
  const mysqlCode =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code?: unknown }).code)
      : typeof err === "object" &&
          err !== null &&
          "cause" in err &&
          typeof (err as { cause?: { code?: unknown } }).cause === "object"
        ? String((err as { cause?: { code?: unknown } }).cause?.code)
        : "";

  if (mysqlCode === "ER_DUP_ENTRY") {
    return {
      ok: false,
      code: "CONFLICT",
      error: "Data yang sama sudah ada. Periksa kembali slug, ID, atau urutan.",
    };
  }

  console.error("[ActionError]", err instanceof Error ? err.message : "Unknown error");
  return {
    ok: false,
    code: "INTERNAL_ERROR",
    error: "Terjadi kesalahan pada server. Silakan coba lagi.",
  };
}
