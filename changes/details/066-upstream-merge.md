# 合并上游 13 个 commit（2026-07-26）

**日期**: 2026-07-26

## 上游 commit

- `08f88d25e` feat: support Tencent TokenHub API key via OpenAI-compatible protocol (#6232)
- `8b41defbe` feat: add gemini-3-pro-image and gemini-3.1-flash-image GA models (#6371)
- `ae17f2749` fix(json-code-editor): remove opaque line-number layer background hiding editor content
- `5ede832d8` chore(README): update AtomGit badge and remove Product Hunt badge
- `257223be2` chore(README): update AtomGit badge and remove Product Hunt badge
- `eb4a1bd19` perf(json-editor): unify admin JSON editing experience (#6421)
- `18b0b7631` refactor: rename channel priority update to channel field update
- `a0d0e5049` fix(web/channel): stabilize inline priority updates (#6415)
- `bf8cfcc51` fix(model-mutate-drawer): prevent form reset on modelSettings refetch
- `27235a277` fix: prevent model create from wiping existing pricing for same name (#6365)
- `84a79b680` fix: log response body when parsed upstream error message is empty
- `cbd9b30aa` fix(github): restore issue form visibility (#6454)
- `cb96ab020` chore(github): migrate issue templates to required forms (#6452)

## 合并统计

- 变更 66 个文件，新增 2110 行、删除 783 行
- 6 个冲突文件逐一人工确认
- 二开日志命中 21 个上游变更文件

## 冲突解决

| 文件 | 策略 | 说明 |
|------|------|------|
| `.github/ISSUE_TEMPLATE/bug_report.md` | 手动合并 | 采用上游 Issue Form，迁移本地飞书文档链接并删除旧模板 |
| `.github/ISSUE_TEMPLATE/bug_report_en.md` | 手动合并 | 采用上游英文 Issue Form，迁移本地飞书文档链接并删除旧模板 |
| `.github/ISSUE_TEMPLATE/feature_request.md` | 手动合并 | 采用上游 Issue Form，迁移本地飞书文档链接并删除旧模板 |
| `.github/ISSUE_TEMPLATE/feature_request_en.md` | 手动合并 | 采用上游英文 Issue Form，迁移本地飞书文档链接并删除旧模板 |
| `web/bun.lock` | 手动合并 | 依据同时包含本地 `exceljs`/`jszip` 与上游 `yace`/`happy-dom` 的 `package.json` 重新生成 |
| `web/src/features/channels/components/channels-columns.tsx` | 手动合并 | 保留 #050 余额列移除、#065 演示模式，并合入上游字段更新调度器 |

## 二开保护与调整

- 保留 #002 品牌定制，补齐 `README.en.md` 顶部 `AI Gateway` 标题。
- 保留 #022 渠道页默认列表视图。
- 保留 #050 渠道余额列和卡片余额展示移除。
- 强化 #065：演示模式禁用敏感信息切换，并统一遮罩模型标签和颜色。
- 保留 #048 Excel 导出依赖，同时引入 JSON 编辑器依赖。
- 将上游模型创建/编辑定价与 #049、#053 定价编辑器统一，支持本地货币、动态计费、完整缓存通道、改名迁移和显式零值。
- 腾讯 TokenHub 密钥分流仅作用于腾讯渠道，按上游实现保留。

## 新增本地文件

- `web/src/features/system-settings/models/model-pricing-maps.ts` — 统一模型定价 map 的读取、清理和写回。
- `web/src/features/system-settings/models/__tests__/pricing-map-updates.test.ts` — 覆盖动态计费、模式切换、改名迁移和零值。

## 验证

- 前端 TypeScript：`bun run typecheck`
- 定价与渠道回归测试：13 项通过
- 后端腾讯、服务错误及 Gemini 设置测试通过
- 合并后执行 `go build ./...` 和逐提交差异检查
