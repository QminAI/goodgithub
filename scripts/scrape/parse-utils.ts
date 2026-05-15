/**
 * 数字解析与 URL 拆分工具函数
 */

/**
 * 解析紧凑数字字符串：
 *   "1,234"  → 1234
 *   "1.2k"   → 1200
 *   "5.6k"   → 5600
 *   "72,432" → 72432
 */
export function parseCompactNumber(s: string): number {
  const cleaned = s.trim().replace(/,/g, '')
  const kMatch = cleaned.match(/^([\d.]+)[kK]$/)
  if (kMatch) {
    return Math.round(parseFloat(kMatch[1]) * 1000)
  }
  const plain = parseFloat(cleaned)
  return isNaN(plain) ? 0 : Math.round(plain)
}

/**
 * 从 GitHub href（如 "/owner/repo"）中拆分 owner 和 repo name。
 * 忽略多余的路径段。
 */
export function extractOwnerRepo(href: string): { owner: string; name: string } {
  const parts = href.replace(/^\//, '').split('/')
  const owner = parts[0] ?? ''
  const name = parts[1] ?? ''
  return { owner, name }
}
