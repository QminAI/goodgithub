import * as fs from 'fs';
import * as path from 'path';
import type { LLMProvider, Summary, RepoMeta } from './provider';

const FALLBACK_PROMPT = `你是一个专业的开源项目分析师。根据用户提供的 README 内容和仓库元数据，生成结构化中文摘要。
请严格以 JSON 格式返回，结构如下：
{
  "short": "30字以内极简摘要",
  "card": "100-200字详细中文卡片摘要",
  "problem": [],
  "audience": [],
  "why_trending": []
}
第一周仅填写 short 和 card，其余字段返回空数组。`;

function loadSystemPrompt(): string {
  const promptPath = path.resolve(process.cwd(), 'prompts/summary.txt');
  try {
    return fs.readFileSync(promptPath, 'utf-8');
  } catch {
    return FALLBACK_PROMPT;
  }
}

export class DeepSeekProvider implements LLMProvider {
  name = 'deepseek';

  constructor(
    private apiKey: string,
    private model = 'deepseek-chat',
  ) {}

  async summarize(readme: string, meta: RepoMeta): Promise<Summary> {
    const systemPrompt = loadSystemPrompt();
    const truncatedReadme = readme.slice(0, 4000);
    const userContent = `仓库信息：
- 名称：${meta.owner}/${meta.name}
- 描述：${meta.description}
- 语言：${meta.language}
- Stars：${meta.stars_total}
- Topics：${meta.topics.join(', ')}

README 内容：
${truncatedReadme}`;

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API 请求失败: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };

    const content = data.choices[0]?.message?.content;
    if (!content) {
      throw new Error('DeepSeek API 返回内容为空');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      throw new Error(`JSON 解析失败: ${String(e)}\n原始内容: ${content}`);
    }

    const summary = parsed as Summary;
    if (typeof summary.short !== 'string' || typeof summary.card !== 'string') {
      throw new Error(`返回 JSON 结构不符合预期: ${content}`);
    }

    return {
      short: summary.short,
      card: summary.card,
      problem: Array.isArray(summary.problem) ? summary.problem : [],
      audience: Array.isArray(summary.audience) ? summary.audience : [],
      why_trending: Array.isArray(summary.why_trending) ? summary.why_trending : [],
    };
  }
}
