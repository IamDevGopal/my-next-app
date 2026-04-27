export interface ApiSuccessMeta {
  timestamp: string;
  path: string;
  method: string;
  statusCode: number;
  requestId?: string;
}

export interface ApiSuccessResponse<TData> {
  success: true;
  message: string;
  data: TData;
  meta: ApiSuccessMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details: unknown;
  };
  meta: ApiSuccessMeta;
}

export type ApiResponse<TData> =
  | ApiSuccessResponse<TData>
  | ApiErrorResponse;
