# .github/workflows 说明

## 目录内容

| 文件 | 触发方式 | 用途 |
|------|----------|------|
| `collect.yml` | 每日 UTC 00:30 cron / 手动触发 | 抓取 GitHub Trending、生成 LLM 摘要、commit 数据 JSON |

## 启用前置条件

1. **拆为独立仓库**：GoodGithub 需从 QminAI Obsidian 仓库中拆出，成为独立 GitHub 仓库，workflow 才会被 GitHub Actions 识别并执行。

2. **配置 Secrets**：在仓库 **Settings → Secrets and variables → Actions** 中添加：
   - `GH_TOKEN` — 个人 PAT（classic），勾选 `public_repo` 权限
   - `DEEPSEEK_API_KEY` — DeepSeek 平台的 API Key

3. **提交 lockfile**：本地执行一次 `pnpm install`，将生成的 `pnpm-lock.yaml` 提交到仓库，否则 CI 的 `--frozen-lockfile` 步骤会报错。

## 手动触发

1. 打开仓库页面 → **Actions** 标签
2. 左侧选择 **Collect GitHub Trending**
3. 点击 **Run workflow**
4. 可选勾选"强制重跑 LLM 摘要（忽略 readme_hash 缓存）"
5. 点击绿色 **Run workflow** 按钮
