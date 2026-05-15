/**
 * 格式化工具函数
 */

/**
 * 将 star 数格式化为带 k 后缀的字符串
 * 例：72432 → "72.4k"，999 → "999"
 */
export function formatStars(n: number): string {
  if (n >= 1000) {
    const k = n / 1000
    // 保留一位小数，去掉末尾 .0
    const formatted = k.toFixed(1)
    return formatted.endsWith('.0') ? `${Math.round(k)}k` : `${formatted}k`
  }
  return String(n)
}

/**
 * 将排名变化值格式化为展示文本与类型
 * 正数上升 → up，负数下降 → down，0 → same，'new' → new
 */
export function formatChange(change: number | 'new'): {
  text: string
  type: 'up' | 'down' | 'new' | 'same'
} {
  if (change === 'new') {
    return { text: 'NEW', type: 'new' }
  }
  if (change > 0) {
    return { text: `▲ ${change}`, type: 'up' }
  }
  if (change < 0) {
    return { text: `▼ ${Math.abs(change)}`, type: 'down' }
  }
  return { text: '—', type: 'same' }
}

/**
 * 根据榜单周期返回新增 stars 的后缀标签
 */
export function formatGainSuffix(period: 'daily' | 'weekly' | 'monthly'): string {
  switch (period) {
    case 'daily':   return 'today'
    case 'weekly':  return 'this week'
    case 'monthly': return 'this month'
  }
}
