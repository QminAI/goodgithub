# GoodGithub 项目指南

## 项目概览

**GoodGithub** 是一个 GitHub 趋势爬虫 + 中文 LLM 摘要 + 静态网站的个人知识档案平台。每天自动采集 GitHub Trending（日/周/月三个榜单），通过 DeepSeek LLM 生成中文摘要，前端展示并支持历史回看。目标用户每天 30 秒扫完今日榜，3 分钟看懂 5 个感兴趣项目。核心差异化：中文化 + 历史归档 + 排名变化 + 连续上榜识别。

## 技术栈

| 层级 | 技术选型 | 版本 | 说明 |
|------|--------|------|------|
| **前端框架** | Astro SSG | 5.0.0 | 零 JS 默认，纯静态 HTML+CSS，岛屿式交互 |
| **编程语言** | TypeScript | 5.6.0 | 采集/构建脚本 + 类型定义 |
| **包管理** | pnpm | 9.0.0 | 快速、节省空间的 monorepo 友好包管理器 |
| **LLM 摘要** | DeepSeek API | V3 | 中文质量优、成本低（$2/月）、可切换 |
| **数据存储** | JSON 平面文件 | — | 无数据库、Git 追踪版本、Astro 构建时导入 |
| **搜索** | Pagefind | — | 构建时生成全文索引，原生中文分词 |
| **爬虫工具** | cheerio | 1.0.0 | Node.js HTML 解析 |
| **HTTP 客户端** | axios/fetch | — | GitHub Trending + REST API 请求 |
| **数据校验** | Zod | 3.25.76 | TypeScript 首选的运行时模式校验 |
| **部署平台** | Cloudflare Pages | — | 免费额度、中国大陆可访问、自动 HTTPS |

## 目录结构

| 路径 | 用途 |
|------|------|
| `src/` | 前端代码库 |
| `src/pages/` | Astro 动态路由（`index.astro`, `weekly/`, `monthly/`, `repo/[owner]/[name]`, `archive.astro`） |
| `src/components/` | 可复用组件（`RepoCard.astro`, 卡片列表等） |
| `src/layouts/` | 页面模板（`Base.astro` — 统一 Header/Footer/Meta） |
| `src/lib/` | 工具函数（`format.ts` 格式化工具，`llm/` LLM 提供商抽象层） |
| `src/lib/llm/` | LLM 抽象层（`provider.ts` 接口，`deepseek.ts` 实现，`index.ts` 工厂函数） |
| `src/types/` | TypeScript 类型定义（`repo.ts` RepoCard，`llm.ts` Summary） |
| `src/styles/` | 全局样式（`tokens.css` 设计 token，`global.css` 基础样式） |
| `scripts/` | 数据采集与处理脚本 |
| `scripts/collect-daily.ts` | 入口：调用 scrape + summarize，输出 data/daily/*.json |
| `scripts/summarize.ts` | LLM 摘要生成（独立脚本，可单独运行） |
| `scripts/scrape/` | 爬虫核心模块 |
| `scripts/scrape/trending.ts` | 抓 GitHub Trending HTML，cheerio 解析 |
| `scripts/scrape/github-api.ts` | GitHub REST API 补充 repo 详情 + README |
| `scripts/scrape/schema.ts` | Zod 数据校验 schema |
| `scripts/scrape/parse-utils.ts` | 解析工具（CSS 选择器、数字提取等） |
| `scripts/scrape/http-utils.ts` | HTTP 工具（重试、超时、User-Agent） |
| `data/` | 运行时生成数据（Git 追踪） |
| `data/daily/` | 日榜 JSON（`2026-05-14.json` 格式） |
| `data/weekly/` | 周榜 JSON（`2026-W20.json` 格式） |
| `data/monthly/` | 月榜 JSON（`2026-05.json` 格式） |
| `data/repos/` | 单项目完整信息（`vercel__ai-sdk.json`，含 trending_history） |
| `data/meta/` | 预计算聚合数据（`languages.json`, `streaks.json`, `heatmap.json`） |
| `data/raw/` | 原始 HTML 备份（调试 / 容灾） |
| `config/` | 配置文件 |
| `config/selectors.json` | GitHub Trending HTML CSS 选择器（容灾备用） |
| `prompts/` | LLM 提示词模板 |
| `prompts/summary.txt` | 中文摘要 Prompt（一次性出全部字段） |
| `.github/workflows/` | GitHub Actions CI/CD |
| `.github/workflows/collect.yml` | Cron 定时采集（北京时间每日 08:30） |
| `astro.config.mjs` | Astro 配置（SSG 输出、site URL） |
| `tsconfig.json` | TypeScript 配置 |
| `package.json` | npm 脚本 + 依赖声明 |
| `README.md` | 项目概览 + 原型预览 |
| `README-DEV.md` | 开发快速开始 |

## 数据流与管道

```
每日 08:30 (UTC+8) GitHub Actions 触发
    ↓
[1] 采集阶段 (scripts/collect-daily.ts)
    ├─ 抓 Trending HTML (trending.ts + cheerio)
    ├─ cheerio 解析 → RepoCard[] 数组
    ├─ 补充 GitHub REST API (github-api.ts)
    │  ├─ 拉取 repo 详情（language_color, license, topics 等）
    │  └─ 拉取 README（Base64 解码，供 LLM 用）
    ├─ Zod 校验 (schema.ts)
    └─ 写 data/daily/{date}.json + data/raw/{date}.html
    ↓
[2] 摘要生成阶段 (scripts/summarize.ts)
    ├─ 遍历 data/daily/{date}.json
    ├─ 对每个 repo
    │  ├─ 检查 README hash，命中则跳过 LLM（缓存）
    │  ├─ 调 DeepSeek API（prompts/summary.txt）
    │  └─ 输出 { short, card, problem[], audience[], why_trending[] }
    ├─ 合并回 data/repos/{owner}__{repo}.json
    ├─ 追加 trending_history（upsert 语义）
    └─ Git add + commit
    ↓
[3] 构建阶段 (Astro build + Cloudflare Pages)
    ├─ Astro 读 data/ JSON（导入时）
    ├─ 生成静态 HTML（src/pages/ 路由模板）
    ├─ Pagefind 构建全文索引
    ├─ 输出 dist/
    └─ Cloudflare Pages 自动部署
    ↓
网站上线：https://goodgithub.pages.dev
```

**关键特性：**
- **幂等性**：文件名为键（date.json），重复运行覆盖
- **缓存策略**：README hash 缓存，60-80% 命中率，日 LLM 调用降至 10-20 次
- **容灾**：HTML 改版时改 config/selectors.json，Zod 校验失败自动开 Issue

## 关键命令

```bash
# 开发服务器（热更新）
pnpm dev

# 生产构建（生成 dist/）
pnpm build

# 预览构建产物（本地静态服务）
pnpm preview

# 采集日/周/月 Trending → data/daily/weekly/monthly/*.json
pnpm collect

# 生成 LLM 摘要 → data/repos/*.json + trending_history
pnpm summarize

# 手动触发采集（调试）
pnpm collect -- --force-regenerate
```

## 环境变量

### 本地开发（`.env` 或 `.env.local`）

```bash
# LLM 配置
LLM_PROVIDER=deepseek          # 选择提供商：deepseek|openai|claude
DEEPSEEK_API_KEY=sk_xxx        # DeepSeek API 密钥
DEEPSEEK_MODEL=deepseek-chat   # 模型名称

# GitHub API
GITHUB_TOKEN=ghp_xxx           # GitHub PAT (classic)，勾选 public_repo 权限
```

### GitHub Actions（仓库 Secrets）

- `DEEPSEEK_API_KEY` — LLM 摘要采集时使用
- `GITHUB_TOKEN` — Actions 自动注入（无需手动配置）

### Cloudflare Pages（第 1 周 MVP 不需要）

- 采集管道在 GitHub Actions 完成，JSON 产出后 commit
- CF Pages 构建仅读 JSON，无需 LLM/GitHub token
- 如后续在构建时实时调用 LLM，才需在 CF 配环境变量

## 部署方案

### 部署平台：Cloudflare Pages（推荐）

| 维度 | 说明 |
|------|------|
| **费用** | 免费（500 构建/月，无限带宽） |
| **中国大陆** | 有节点，访问速度好 |
| **HTTPS** | 自动（Let's Encrypt）|
| **自定义域名** | 支持（可选） |

### 自动化流程

```
git push main (包含 data/ JSON)
    ↓
Cloudflare Pages 检测 commit
    ↓
自动触发 pnpm build
    ↓
dist/ → Cloudflare 全球 CDN
```

### 首次部署步骤

1. [Cloudflare Dashboard](https://dash.cloudflare.com) → **Pages** → **Create application**
2. 连接 GitHub 仓库（GoodGithub）
3. 构建配置：
   - **Framework**: Astro
   - **Build command**: `pnpm build`
   - **Build output directory**: `dist`
   - **Root directory**: `/`
4. 完成后获得 `xxx.pages.dev` 临时域名
5. 验证 `astro.config.mjs` 中 `site: 'https://goodgithub.pages.dev'`

详见 `../docs/deploy.md`。

## 文档导航

| 文档 | 内容 | 优先级 |
|------|------|--------|
| `../docs/spec-2026-05-14-GoodGithub-需求与页面设计.md` | 完整产品需求 + 页面设计 + 数据模型（RepoCard）| 必读 |
| `../docs/tech-plan-review-2026-05-14.md` | 技术方案评审、架构、数据流、风险坑点、MVP 拆分 | 必读 |
| `../docs/deploy.md` | Cloudflare Pages 部署操作手册 | MVP 前阅读 |
| `README.md` | 项目概览 + 原型链接 | 参考 |
| `README-DEV.md` | 开发快速开始 | 新人必读 |

## 代码约定

- **语言**：代码英文，Git commit 中文（格式：`feat: 功能简述` / `fix: bug 简述`）
- **不提交敏感信息**：`.env` `.env.local` 在 `.gitignore`，API key 走 GitHub Secrets
- **TypeScript**：启用 `strict` 模式（tsconfig.json）
- **文件命名**：
  - 组件 `.astro` 文件用 PascalCase（`RepoCard.astro`）
  - 脚本 `.ts` 文件用 kebab-case（`collect-daily.ts`）
  - 数据文件 JSON 用日期或 slug（`2026-05-14.json`, `vercel__ai-sdk.json`）

## 工作流建议

### 第 1 周 MVP（看到今日榜）

1. 启动开发服务器 `pnpm dev`
2. 编写 `src/pages/index.astro`（复用 mockup 样式）
3. 跑一次采集 `pnpm collect` 生成样本数据
4. 调整样式对齐 mockup 效果
5. 手动部署到 Cloudflare Pages 验证（按 deploy.md）

### 第 2-4 周

详见 `../docs/tech-plan-review-2026-05-14.md` MVP 拆分建议。

## 性能与限制

- **GitHub API Rate Limit**：个人 token 5000 次/小时，日采集 150 次远低于限额
- **JSON 文件大小**：2-5k 项目/年，一年 ~1100 个 JSON 文件，Git 完全承受
- **首页加载时间**：纯静态 HTML，<100ms（CDN）
- **搜索索引**：Pagefind ~300KB gzip，首次加载 ~30KB（分片加载）

## 常见问题

**Q: 为什么不用数据库？**
A: 数据量小（2-5k 项/年），JSON 完全够用。避免：①运维成本，②SQLite 二进制 blob 无法 diff，③部署复杂度。

**Q: 为什么用 DeepSeek 不用 Claude？**
A: 成本对比：DeepSeek $2/月 vs Claude $15/月，中文质量相当，个人项目无需超高可靠性。可通过 `LLM_PROVIDER` 切换。

**Q: README 改了，摘要怎么更新？**
A: 执行 `pnpm collect -- --force-regenerate` 跳过缓存，重新调 LLM。

**Q: 历史数据怎么备份？**
A: 所有 data/ JSON 都在 Git 仓库，自动版本控制。支持按日期回看。

---

**最后更新**：2026-05-15
