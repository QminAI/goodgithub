/**
 * LLM 生成的仓库摘要结构
 */
export interface Summary {
  /** 30 字内极简摘要 */
  short: string
  /** 100-200 字详细中文卡片摘要 */
  card: string
  /** 解决什么问题（3-4 条，第 1 周可为空数组） */
  problem: string[]
  /** 适合谁使用（3-4 条） */
  audience: string[]
  /** 为什么上榜（3-4 条） */
  why_trending: string[]
}

/**
 * 调用 LLM 时传入的仓库元数据
 */
export interface RepoMeta {
  /** 仓库 owner */
  owner: string
  /** 仓库名称 */
  name: string
  /** 原英文描述 */
  description: string
  /** 主要编程语言 */
  language: string
  /** 总 stars 数 */
  stars_total: number
  /** 话题标签列表 */
  topics: string[]
}

/**
 * LLM Provider 抽象接口，支持多模型后端互换
 */
export interface LLMProvider {
  /** Provider 名称标识，例如 "openai" / "claude" */
  name: string
  /**
   * 根据 README 内容和仓库元数据生成中文摘要
   * @param readme README 原始文本内容
   * @param meta 仓库基础元数据
   * @returns 结构化中文摘要
   */
  summarize(readme: string, meta: RepoMeta): Promise<Summary>
}
