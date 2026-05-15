/**
 * GitHub Trending 页面抓取器
 *
 * 用法（调试）：
 *   tsx scripts/scrape/trending.ts daily
 */

import { load } from 'cheerio'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fetchWithRetry } from './http-utils.js'
import { parseCompactNumber, extractOwnerRepo } from './parse-utils.js'

// ── 类型定义 ────────────────────────────────────────────────────────────────

export type Period = 'daily' | 'weekly' | 'monthly'

export interface TrendingRow {
  owner: string
  name: string
  description: string
  language: string
  language_color: string
  stars_total: number
  forks: number
  stars_gained: number
  rank: number
}

// ── 选择器配置 ───────────────────────────────────────────────────────────────

interface Selectors {
  repo_item: string
  owner_repo: string
  description: string
  language: string
  language_color: string
  stars_total: string
  forks: string
  stars_gained: string
  built_by: string
}

function loadSelectors(): Selectors {
  const configPath = join(
    fileURLToPath(import.meta.url),
    '../../../config/selectors.json',
  )
  const raw = readFileSync(configPath, 'utf-8')
  return JSON.parse(raw) as Selectors
}

// ── UTC 日期工具 ──────────────────────────────────────────────────────────────

function utcDateString(): string {
  const now = new Date()
  const yyyy = now.getUTCFullYear()
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(now.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

// ── 原始 HTML 保存 ────────────────────────────────────────────────────────────

function saveRawHtml(period: Period, html: string): void {
  const date = utcDateString()
  const dir = join(fileURLToPath(import.meta.url), '../../../data/raw')
  mkdirSync(dir, { recursive: true })
  const filename = `trending-${period}-${date}.html`
  writeFileSync(join(dir, filename), html, 'utf-8')
}

// ── stars_gained 文字清理 ─────────────────────────────────────────────────────

function extractStarsGainedNumber(text: string): number {
  // 原文格式：" 1,857 stars today" / "1,857 stars this week" 等
  const match = text.match(/([\d,.]+[kK]?)\s+stars/)
  if (match) {
    return parseCompactNumber(match[1])
  }
  return 0
}

// ── language_color 解析 ───────────────────────────────────────────────────────

function extractColor(style: string): string {
  // style="background-color: #3178c6;"
  const match = style.match(/background-color:\s*(#[0-9a-fA-F]{3,8})/)
  return match ? match[1] : ''
}

// ── 核心函数 ─────────────────────────────────────────────────────────────────

export async function scrapeTrending(period: Period): Promise<TrendingRow[]> {
  const sel = loadSelectors()
  const url = `https://github.com/trending?since=${period}`

  const response = await fetchWithRetry(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 GoodGithub/0.1',
      Accept: 'text/html,application/xhtml+xml',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching ${url}`)
  }

  const html = await response.text()
  saveRawHtml(period, html)

  const $ = load(html)
  const rows: TrendingRow[] = []

  $(sel.repo_item).each((index, el) => {
    const item = $(el)

    // owner / name — 从 href 解析，避免 text 脏数据
    const href = item.find(sel.owner_repo).attr('href') ?? ''
    const { owner, name } = extractOwnerRepo(href)
    if (!owner || !name) return

    // description
    const description = item
      .find(sel.description)
      .text()
      .replace(/\n/g, ' ')
      .trim()

    // language
    const language = item.find(sel.language).text().trim()

    // language_color — 从 style 属性取 hex
    const colorStyle = item.find(sel.language_color).attr('style') ?? ''
    const language_color = extractColor(colorStyle)

    // stars_total
    const starsText = item.find(sel.stars_total).first().text().trim()
    const stars_total = parseCompactNumber(starsText)

    // forks
    const forksText = item.find(sel.forks).first().text().trim()
    const forks = parseCompactNumber(forksText)

    // stars_gained
    const gainedText = item.find(sel.stars_gained).text().trim()
    const stars_gained = extractStarsGainedNumber(gainedText)

    rows.push({
      owner,
      name,
      description,
      language,
      language_color,
      stars_total,
      forks,
      stars_gained,
      rank: index + 1,
    })
  })

  return rows
}

// ── 调试入口 ─────────────────────────────────────────────────────────────────

if (import.meta.url === `file://${process.argv[1]}`) {
  const period = (process.argv[2] ?? 'daily') as Period
  scrapeTrending(period).then((rows) => {
    console.log(`Fetched ${rows.length} repos (period=${period})`)
    console.log(JSON.stringify(rows.slice(0, 3), null, 2))
  }).catch((err: unknown) => {
    console.error('scrape failed:', err)
    process.exit(1)
  })
}
