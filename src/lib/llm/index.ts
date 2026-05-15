import { DeepSeekProvider } from './deepseek';
import type { LLMProvider } from './provider';

export function createProvider(): LLMProvider {
  const name = process.env.LLM_PROVIDER ?? 'deepseek';
  switch (name) {
    case 'deepseek': {
      const key = process.env.DEEPSEEK_API_KEY;
      if (!key) throw new Error('DEEPSEEK_API_KEY 未设置');
      return new DeepSeekProvider(key, process.env.DEEPSEEK_MODEL);
    }
    case 'openai':
    case 'claude':
    case 'ollama':
      throw new Error(`Provider ${name} 暂未实现（第 1 周仅支持 deepseek）`);
    default:
      throw new Error(`未知 LLM_PROVIDER: ${name}`);
  }
}

export type { LLMProvider, Summary, RepoMeta } from './provider';
