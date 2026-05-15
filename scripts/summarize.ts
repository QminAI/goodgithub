import { createProvider } from 'good-github/src/lib/llm';
import type { RepoCard } from 'good-github/src/types';
import { createHash } from 'node:crypto';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fetchReadme } from './scrape/github-api';

const REPOS_DIR = 'data/repos';

async function summarizeOne(card: RepoCard): Promise<RepoCard> {
  const readme = await fetchReadme(card.owner, card.name);
  const hash = readmeHash(readme);

  // 缓存命中检查
  const existingHash = (card as RepoCard & { readme_hash?: string }).readme_hash;
  if (existingHash === hash && card.ai_summary_short) {
    console.log(`[skip] ${card.owner}/${card.name} README 未变`);
    return card;
  }

  const provider = createProvider();
  const summary = await provider.summarize(readme, {
    owner: card.owner,
    name: card.name,
    description: card.description,
    language: card.language,
    stars_total: card.stars_total,
    topics: card.topics,
  });

  return {
    ...card,
    ai_summary_short: summary.short,
    ai_summary_card: summary.card,
    ai_problem: summary.problem,
    ai_audience: summary.audience,
    ai_why_trending: summary.why_trending,
    readme_hash: hash,
  } as RepoCard & { readme_hash: string };
}

function readmeHash(s: string): string {
  return createHash('sha256').update(s).digest('hex').slice(0, 8);
}

async function main() {
  if (process.env.LLM_SKIP === '1') {
    console.log('[summarize] LLM_SKIP=1，跳过摘要生成');
    return;
  }

  const files = await readdir(REPOS_DIR);
  const jsonFiles = files.filter(f => f.endsWith('.json'));
  console.log(`[summarize] ${jsonFiles.length} 个 repo`);

  let done = 0, skipped = 0, failed = 0;
  for (const f of jsonFiles) {
    const path = join(REPOS_DIR, f);
    try {
      const card: RepoCard = JSON.parse(await readFile(path, 'utf-8'));
      const before = card.ai_summary_short;
      const updated = await summarizeOne(card);
      if (before === updated.ai_summary_short) {
        skipped++;
      } else {
        await writeFile(path, JSON.stringify(updated, null, 2));
        done++;
      }
      await sleep(500); // 避免 rate limit
    } catch (e) {
      console.error(`[summarize] ${f} 失败：`, e);
      failed++;
    }
  }
  console.log(`[summarize] 完成。新增 ${done} / 跳过 ${skipped} / 失败 ${failed}`);
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(e => {
    console.error(e);
    process.exit(1);
  });
}
