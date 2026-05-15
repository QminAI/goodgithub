/**
 * HTTP 工具函数：sleep、带重试的 fetch
 */

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 带重试的 fetch，仅对 429 / 5xx 重试，最多 retries 次，指数退避 2s 起。
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  retries = 3,
): Promise<Response> {
  let lastError: unknown

  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch(url, init)

    if (response.ok) {
      return response
    }

    const isRetryable = response.status === 429 || response.status >= 500

    if (!isRetryable || attempt === retries) {
      return response // 让调用方处理非重试错误
    }

    const delay = 2000 * Math.pow(2, attempt)
    await sleep(delay)
  }

  throw lastError
}
