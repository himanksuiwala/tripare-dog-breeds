export const API_REQUEST_MAX_ATTEMPTS = 3;
export const API_RETRY_BASE_DELAY_MS = 500;

export class NonRetryableRequestError extends Error {}

export class ApiResponseError extends NonRetryableRequestError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ApiResponseError";
  }
}

export class HttpRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "HttpRequestError";
  }
}

type RetryOptions = {
  signal?: AbortSignal;
  maxAttempts?: number;
  baseDelayMs?: number;
  wait?: (delayMs: number, signal?: AbortSignal) => Promise<void>;
};

function abortError(): Error {
  const error = new Error("The request was aborted.");
  error.name = "AbortError";
  return error;
}

export function isTransientRequestError(error: unknown): boolean {
  if (error instanceof NonRetryableRequestError) return false;
  if (error instanceof HttpRequestError) {
    return (
      error.status === 408 ||
      error.status === 429 ||
      (error.status >= 500 && error.status <= 599)
    );
  }
  return error instanceof Error && error.name !== "AbortError";
}

export function waitForRetry(
  delayMs: number,
  signal?: AbortSignal,
): Promise<void> {
  if (signal?.aborted) return Promise.reject(abortError());

  return new Promise((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout>;
    const handleAbort = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", handleAbort);
      reject(abortError());
    };
    timer = setTimeout(() => {
      signal?.removeEventListener("abort", handleAbort);
      resolve();
    }, delayMs);
    signal?.addEventListener("abort", handleAbort, { once: true });
  });
}

export async function retryRequest<T>(
  request: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    signal,
    maxAttempts = API_REQUEST_MAX_ATTEMPTS,
    baseDelayMs = API_RETRY_BASE_DELAY_MS,
    wait = waitForRetry,
  } = options;

  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new Error("maxAttempts must be a positive integer.");
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (signal?.aborted) throw abortError();
    try {
      return await request();
    } catch (error: unknown) {
      if (signal?.aborted) throw abortError();
      const isLastAttempt = attempt === maxAttempts;
      if (isLastAttempt || !isTransientRequestError(error)) throw error;
      const delayMs = baseDelayMs * 2 ** (attempt - 1);
      await wait(delayMs, signal);
    }
  }

  throw new Error("Retry loop ended unexpectedly.");
}
