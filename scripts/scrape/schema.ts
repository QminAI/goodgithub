import { z } from 'zod';

export const PeriodSchema = z.enum(['daily', 'weekly', 'monthly']);

export const RankInfoSchema = z.object({
  rank: z.number().int().positive(),
  change: z.union([z.number().int(), z.literal('new')]),
});

export const TrendingEntrySchema = z.object({
  date: z.string(),
  period: PeriodSchema,
  rank: z.number().int().positive(),
  change: z.union([z.number().int(), z.literal('new')]),
  stars_gained: z.number().int().nonnegative(),
});

export const RepoCardSchema = z.object({
  owner: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  language: z.string(),
  language_color: z.string(),
  homepage: z.string().optional(),
  stars_total: z.number().int().nonnegative(),
  stars_gained: z.number().int().nonnegative(),
  forks: z.number().int().nonnegative(),
  topics: z.array(z.string()),
  license: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  default_branch: z.string(),
  ai_summary_short: z.string(),
  ai_summary_card: z.string(),
  ai_problem: z.array(z.string()),
  ai_audience: z.array(z.string()),
  ai_why_trending: z.array(z.string()),
  ranks: z.object({
    daily: RankInfoSchema.optional(),
    weekly: RankInfoSchema.optional(),
    monthly: RankInfoSchema.optional(),
  }),
  trending_history: z.array(TrendingEntrySchema),
  consecutive_days: z.number().int().nonnegative().optional(),
  github_url: z.string().url(),
  readme_url: z.string().url(),
});

export type RepoCardParsed = z.infer<typeof RepoCardSchema>;

export function validateRepoCard(
  data: unknown,
): { ok: true; data: RepoCardParsed } | { ok: false; error: string } {
  const result = RepoCardSchema.safeParse(data);
  if (result.success) {
    return { ok: true, data: result.data };
  }
  // 将 Zod 错误拼成"字段路径: 错误原因"格式，多条用分号连接
  const errorMessage = result.error.errors
    .map((e) => `${e.path.join('.')}: ${e.message}`)
    .join('; ');
  // TODO: 日后接 GitHub Issue 告警
  console.error('[validateRepoCard] 校验失败:', errorMessage);
  return { ok: false, error: errorMessage };
}
