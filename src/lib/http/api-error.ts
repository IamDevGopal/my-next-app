import type { ApiErrorResponse } from "./api-response.type";

export class ApiError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details: unknown;

  constructor(response: ApiErrorResponse) {
    super(response.error.message);
    this.name = "ApiError";
    this.code = response.error.code;
    this.statusCode = response.meta.statusCode;
    this.details = response.error.details;
  }
}
