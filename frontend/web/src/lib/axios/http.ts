export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: string,
    public readonly fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
};
export type RequestApi = <T>(path: string, options?: RequestOptions) => Promise<T>;
export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  const e = error as {
    response?: { status?: number; data?: unknown };
    code?: string;
    message?: string;
  };
  const data = e?.response?.data;
  const body = typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : {};
  const detail =
    typeof body.error === 'object' && body.error !== null
      ? (body.error as Record<string, unknown>)
      : body;
  const raw = detail.fieldErrors ?? body.fieldErrors;
  const fields: Record<string, string> = {};
  if (raw && typeof raw === 'object')
    for (const [key, value] of Object.entries(raw))
      fields[key] = Array.isArray(value) ? value.join('. ') : String(value);
  const message =
    (e?.response?.status ?? 0) >= 500
      ? 'Hệ thống tạm thời chưa xử lý được yêu cầu. Vui lòng thử lại sau.'
      : typeof body.error === 'string'
        ? body.error
        : typeof detail.message === 'string'
          ? detail.message
          : e?.code === 'ECONNABORTED' || e?.code === 'ETIMEDOUT'
            ? 'Kết nối mất quá nhiều thời gian. Vui lòng thử lại.'
            : !e?.response
              ? 'Chưa kết nối được hệ thống. Vui lòng thử lại sau.'
              : e.response.status === 404
                ? 'Không tìm thấy dữ liệu hoặc chức năng này chưa được cung cấp.'
                : 'Không thể hoàn tất yêu cầu. Vui lòng thử lại.';
  return new ApiError(
    message,
    e?.response?.status,
    typeof detail.code === 'string' ? detail.code : e?.code,
    fields,
  );
}
export function userMessage(error: unknown): string {
  return normalizeApiError(error).message;
}
export function unwrap<T>(value: unknown): T {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { success?: boolean }).success !== true ||
    !('data' in value)
  )
    throw new ApiError(
      'Dữ liệu phản hồi chưa đúng định dạng đã thống nhất.',
      undefined,
      'INVALID_RESPONSE',
    );
  return (value as { data: T }).data;
}
