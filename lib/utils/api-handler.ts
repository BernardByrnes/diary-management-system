import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(
    public readonly message: string,
    public readonly status: number = 400,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RouteHandler<T extends unknown[] = []> = (
  req: NextRequest,
  ...args: T
) => Promise<NextResponse>;

/**
 * Wraps a route handler to catch unhandled errors and return consistent JSON responses.
 *
 * Handles:
 * - ApiError  → { error: message } with the specified status
 * - ZodError  → { error: "Validation failed", details: [...] } with 400
 * - Other     → { error: "Internal server error" } with 500 (logged to console)
 */
export function apiHandler<T extends unknown[]>(
  handler: RouteHandler<T>,
): RouteHandler<T> {
  return async (req, ...args) => {
    try {
      return await handler(req, ...args);
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      if (err instanceof ZodError) {
        return NextResponse.json(
          { error: "Validation failed", details: err.issues },
          { status: 400 },
        );
      }
      console.error("[apiHandler] Unhandled error:", err);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  };
}
