/**
 * GitHub REST API 补全器（B2）
 * 补充 /repos/{owner}/{repo} 详情及 README 内容
 */

import { fetchWithRetry, sleep } from './http-utils.js'

export interface RepoDetail {
  homepage: string | null
  license: string | null // license.spdx_id
  topics: string[]
  created_at: string // ISO
  updated_at: string // ISO
  default_branch: string
}

function buildHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'GoodGithub/0.1',
  }

  const token = process.env.GITHUB_TOKEN
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return headers
}

async function checkRateLimit(response: Response): Promise<void> {
  const remaining = Number(response.headers.get('x-ratelimit-remaining') ?? '999')

  if (remaining < 10) {
    console.warn(`[github-api] Rate limit critically low (${remaining}), sleeping 60s...`)
    await sleep(60_000)
  } else if (remaining < 100) {
    console.warn(`[github-api] Rate limit low: ${remaining} requests remaining`)
  }
}

export async function fetchRepoDetail(owner: string, name: string): Promise<RepoDetail> {
  const url = `https://api.github.com/repos/${owner}/${name}`
  const response = await fetchWithRetry(url, { headers: buildHeaders() })

  await checkRateLimit(response)

  if (response.status === 404) {
    throw new Error(`Repository not found: ${owner}/${name}`)
  }

  if (!response.ok) {
    throw new Error(`GitHub API error ${response.status} for ${owner}/${name}`)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (await response.json()) as any

  return {
    homepage: data.homepage ?? null,
    license: data.license?.spdx_id ?? null,
    topics: Array.isArray(data.topics) ? (data.topics as string[]) : [],
    created_at: data.created_at as string,
    updated_at: data.updated_at as string,
    default_branch: data.default_branch as string,
  }
}

export async function fetchReadme(owner: string, name: string): Promise<string> {
  const url = `https://api.github.com/repos/${owner}/${name}/readme`
  const response = await fetchWithRetry(url, { headers: buildHeaders() })

  await checkRateLimit(response)

  if (response.status === 404) {
    return ''
  }

  if (!response.ok) {
    throw new Error(`GitHub README API error ${response.status} for ${owner}/${name}`)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (await response.json()) as any
  const content: string = data.content ?? ''

  // base64 解码（移除换行后解码）
  const cleaned = content.replace(/\n/g, '')
  return Buffer.from(cleaned, 'base64').toString('utf-8')
}
