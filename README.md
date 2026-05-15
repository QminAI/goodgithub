# GoodGithub

GitHub 趋势中文化 + 历史归档的个人知识网站。

每天自动采集 GitHub Trending（日/周/月），LLM 生成中文摘要，前端展示并支持回看历史。

## 当前阶段

需求与高保真原型阶段。代码尚未启动。

## 目录结构

| 路径 | 用途 |
|---|---|
| `docs/` | 需求与设计文档 |
| `mockups/` | 高保真 HTML 原型（Claude Design 输出） |
| `mockups/screenshots/` | Codex 第二版 mockup 截图参考 |

## 关键文档

- [需求与页面设计](docs/spec-2026-05-14-GoodGithub-需求与页面设计.md) — 当前最新 v2 规范
- [技术方案评审](docs/tech-plan-review-2026-05-14.md) — Astro + JSON + Pagefind + GitHub Actions + Cloudflare Pages

## 原型预览

直接在浏览器打开：

| 页面 | 文件 |
|---|---|
| 今日榜 | [mockups/index.html](mockups/index.html) |
| 本周榜 | [mockups/weekly.html](mockups/weekly.html) |
| 本月榜 | [mockups/monthly.html](mockups/monthly.html) |
| 项目详情 | [mockups/repo.html](mockups/repo.html) |
| 历史回看 | [mockups/archive.html](mockups/archive.html) |

## 下一步

1. 评审 mockup 效果，调整需求
2. 出技术方案（架构、DB、AI Provider、采集流程）
3. 拆任务 → 编码
