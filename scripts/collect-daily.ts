/**
 * 每日 Trending 采集编排脚本（B4）
 *
 * 用法：
 *   tsx scripts/collect-daily.ts
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { scrapeTrending } from './scrape/trending.js'
import type { TrendingRow } from './scrape/trending.js'
import { fetchRepoDetail } from './scrape/github-api.js'
import type { RepoDetail } from './scrape/github-api.js'
import { validateRepoCard } from './scrape/schema.js'
import { sleep } from './scrape/http-utils.js'
import type { RepoCard, TrendingEntry } from '../src/types/repo.js'

// ── 路径工具 ─────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

function dataDir(...parts: string[]): string {
  return join(ROOT, 'data', ...parts)
}

// ── UTC 日期字符串 ────────────────────────────────────────────────────────────

function utcDateStr(): string {
  const now = new Date()
  const yyyy = now.getUTCFullYear()
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(now.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

// ── RepoCard 组装 ─────────────────────────────────────────────────────────────

function buildRepoCard(row: TrendingRow, detail: RepoDetail, date: string): RepoCard {
  const historyEntry: TrendingEntry = {
    date,
    period: 'daily',
    rank: row.rank,
    change: 'new',
    stars_gained: row.stars_gained,
  }

  const card: RepoCard = {
    owner: row.owner,
    name: row.name,
    description: row.description,
    language: row.language,
    language_color: row.language_color || '#888',
    homepage: detail.homepage ?? undefined,
    stars_total: row.stars_total,
    stars_gained: row.stars_gained,
    forks: row.forks,
    topics: detail.topics,
    license: detail.license ?? undefined,
    created_at: detail.created_at.slice(0, 10),
    updated_at: detail.updated_at,
    default_branch: detail.default_branch,
    // AI 字段第 1 周留空，C2 摘要脚本后填
    ai_summary_short: '',
    ai_summary_card: '',
    ai_problem: [],
    ai_audience: [],
    ai_why_trending: [],
    ranks: {
      daily: { rank: row.rank, change: 'new' },
    },
    trending_history: [historyEntry],
    github_url: `https://github.com/${row.owner}/${row.name}`,
    readme_url: `https://github.com/${row.owner}/${row.name}#readme`,
  }

  return card
}

// ── Repo JSON upsert ──────────────────────────────────────────────────────────

async function upsertRepoJson(card: RepoCard, date: string): Promise<RepoCard> {
  const filename = `${card.owner}__${card.name}.json`
  const filePath = dataDir('repos', filename)

  mkdirSync(dataDir('repos'), { recursive: true })

  if (!existsSync(filePath)) {
    writeFileSync(filePath, JSON.stringify(card, null, 2), 'utf-8')
    return card
  }

  // 读取已有数据并合并
  const existing: RepoCard = JSON.parse(readFileSync(filePath, 'utf-8')) as RepoCard

  // 合并 trending_history：同 date+period 去重
  const key = `${date}:daily`
  const existingKeys = new Set(
    existing.trending_history.map((e) => `${e.date}:${e.period}`),
  )

  const newHistory: TrendingEntry[] = [...existing.trending_history]
  if (!existingKeys.has(key)) {
    const newEntry = card.trending_history[0]
    if (newEntry) {
      newHistory.push(newEntry)
    }
  }

  // 裁剪超过 365 条的旧记录（保留最新的）
  const trimmed = newHistory.length > 365 ? newHistory.slice(newHistory.length - 365) : newHistory

  const merged: RepoCard = {
    ...existing,
    // 用新数据覆盖实时字段
    description: card.description,
    language: card.language,
    language_color: card.language_color,
    homepage: card.homepage,
    stars_total: card.stars_total,
    stars_gained: card.stars_gained,
    forks: card.forks,
    topics: card.topics,
    license: card.license,
    updated_at: card.updated_at,
    default_branch: card.default_branch,
    // 更新日榜 rank
    ranks: {
      ...existing.ranks,
      daily: card.ranks.daily,
    },
    trending_history: trimmed,
    // 保留旧 AI 字段（不清空）
    ai_summary_short: existing.ai_summary_short || card.ai_summary_short,
    ai_summary_card: existing.ai_summary_card || card.ai_summary_card,
    ai_problem: existing.ai_problem.length > 0 ? existing.ai_problem : card.ai_problem,
    ai_audience: existing.ai_audience.length > 0 ? existing.ai_audience : card.ai_audience,
    ai_why_trending: existing.ai_why_trending.length > 0 ? existing.ai_why_trending : card.ai_why_trending,
    // 链接用新值
    github_url: card.github_url,
    readme_url: card.readme_url,
  }

  writeFileSync(filePath, JSON.stringify(merged, null, 2), 'utf-8')
  return merged
}

// ── 日榜索引文件 ──────────────────────────────────────────────────────────────

async function writeDailyIndex(date: string, cards: RepoCard[]): Promise<void> {
  mkdirSync(dataDir('daily'), { recursive: true })
  const filePath = dataDir('daily', `${date}.json`)

  const index = {
    date,
    period: 'daily' as const,
    generated_at: new Date().toISOString(),
    count: cards.length,
    repos: cards.map((c) => ({ owner: c.owner, name: c.name, rank: c.ranks.daily?.rank ?? 0 })),
  }

  writeFileSync(filePath, JSON.stringify(index, null, 2), 'utf-8')
}

// ── 主函数 ───────────────────────────────────────────────────────────────────

async function main() {
  const today = utcDateStr()
  console.log(`[collect] 开始采集 ${today} daily 榜`)

  const rows = await scrapeTrending('daily')
  console.log(`[collect] Trending 抓到 ${rows.length} 个项目`)

  const cards: RepoCard[] = []
  for (const row of rows) {
    try {
      const detail = await fetchRepoDetail(row.owner, row.name)
      const card = buildRepoCard(row, detail, today)

      const validation = validateRepoCard(card)
      if (!validation.ok) {
        console.error(`[collect] ${row.owner}/${row.name} schema 校验失败：${validation.error}（仍继续写入）`)
      }

      const merged = await upsertRepoJson(card, today)
      cards.push(merged)
    } catch (e) {
      console.error(`[collect] ${row.owner}/${row.name} 采集失败：`, e)
    }

    // 速率限制：每次 fetchRepoDetail 后等 200ms
    await sleep(200)
  }

  await writeDailyIndex(today, cards)

  console.log(`[collect] 完成。写入 ${cards.length} 个项目。`)
}

// ── CLI 入口 ─────────────────────────────────────────────────────────────────

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
