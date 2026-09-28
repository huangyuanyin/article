export interface ApiErrorBody {
  code: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
}

interface ApiErrorEnvelope {
  error?: ApiErrorBody;
}

interface ApiSuccessEnvelope<T> {
  data: T;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = body.code;
    this.fieldErrors = body.fieldErrors;
  }
}

async function readJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get('Content-Type');
  if (!contentType?.includes('application/json')) return null;

  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  accessToken?: string,
): Promise<T> {
  const headers = new Headers(init.headers);

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(path, { ...init, headers });
  if (response.status === 204) return undefined as T;

  const payload = await readJson(response);
  if (!response.ok) {
    const errorBody = (payload as ApiErrorEnvelope | null)?.error;
    throw new ApiError(response.status, errorBody ?? {
      code: 'HTTP_ERROR',
      message: '请求失败，请稍后重试',
    });
  }

  return (payload as ApiSuccessEnvelope<T>).data;
}
