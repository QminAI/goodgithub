/**
 * 榜单周期类型
 */
export type Period = 'daily' | 'weekly' | 'monthly'

/**
 * 单个榜单排名信息
 */
export type RankInfo = {
  /** 当前排名 */
  rank: number
  /** 排名变化：正数上升，负数下降，0 表示不变，'new' 表示首次上榜 */
  change: number | 'new'
}

/**
 * 单条历史上榜记录
 */
export type TrendingEntry = {
  /** 日期标识，格式：daily="2026-05-14" / weekly="2026-W20" / monthly="2026-05" */
  date: string
  /** 榜单周期 */
  period: Period
  /** 该日期排名 */
  rank: number
  /** 排名变化：正数上升，负数下降，0 表示不变，'new' 表示首次上榜 */
  change: number | 'new'
  /** 该周期内新增 stars 数 */
  stars_gained: number
}

/**
 * 仓库卡片完整数据结构（spec §5）
 */
export type RepoCard = {
  // ── 基础信息 ────────────────────────────────────────────────────────────────
  /** 仓库 owner，例如 "vercel" */
  owner: string
  /** 仓库名称，例如 "ai-sdk" */
  name: string
  /** 原英文描述 */
  description: string
  /** 主要编程语言，例如 "TypeScript" */
  language: string
  /** 语言对应颜色，例如 "#3178c6" */
  language_color: string
  /** 项目主页 URL（可选） */
  homepage?: string

  // ── 统计数据 ────────────────────────────────────────────────────────────────
  /** 总 stars 数，例如 72400 */
  stars_total: number
  /** 周期内新增 stars，today / week / month 视榜单而定 */
  stars_gained: number
  /** fork 数 */
  forks: number
  /** 话题标签列表，例如 ["llm", "typescript", "ai", "agent"] */
  topics: string[]
  /** 开源许可证，例如 "MIT"（可选） */
  license?: string
  /** 仓库创建时间，格式 "2023-06-15" */
  created_at: string
  /** 最近更新时间，ISO 8601 格式 */
  updated_at: string
  /** 默认分支名称，例如 "main" */
  default_branch: string

  // ── AI 摘要 ─────────────────────────────────────────────────────────────────
  /** 30 字内极简摘要，例如 "统一多模型调用的 TypeScript AI 工具包" */
  ai_summary_short: string
  /** 100-200 字详细中文卡片摘要 */
  ai_summary_card: string
  /** 解决什么问题（3-4 条，第 1 周可为空数组） */
  ai_problem: string[]
  /** 适合谁使用（3-4 条） */
  ai_audience: string[]
  /** 为什么上榜（3-4 条） */
  ai_why_trending: string[]

  // ── 榜单状态 ────────────────────────────────────────────────────────────────
  /** 各周期榜单排名，未上榜则字段缺省 */
  ranks: {
    /** 日榜排名信息 */
    daily?: RankInfo
    /** 周榜排名信息 */
    weekly?: RankInfo
    /** 月榜排名信息 */
    monthly?: RankInfo
  }

  // ── 历史记录 ─────────────────────────────────────────────────────────────────
  /**
   * 历史上榜记录列表，最多保留近 365 天
   */
  trending_history: TrendingEntry[]

  // ── 派生字段 ─────────────────────────────────────────────────────────────────
  /**
   * 连续上榜天数，用于 🔥 显示。采集管道预计算
   */
  consecutive_days?: number

  // ── 链接 ────────────────────────────────────────────────────────────────────
  /** GitHub 仓库页面 URL */
  github_url: string
  /** README 原始内容 URL */
  readme_url: string
}

/**
 * 本地状态（localStorage 存储）
 */
export type LocalState = {
  /** 收藏的仓库 full_name 列表，例如 ["vercel/ai-sdk", ...] */
  favorites: string[]
  /** 已读项目 full_name 列表 */
  read: string[]
}
