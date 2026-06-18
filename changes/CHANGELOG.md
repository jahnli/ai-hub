# 变更日志

仅记录二开修改，用于未来与上游合并时快速定位差异。每次 AI 完成的实质性代码变更，在此文件追加一行。

| 日期 | 说明 | 涉及文件 | 与上游差异 | 合并指引 |
|------|------|---------|-----------|---------|
| 2026-06-18 | 启动默认主题改为 default | `common/constants.go`（`init()` 中 `themeValue.Store("classic")` → `"default"`）、`setting/system_setting/theme.go`（`Frontend: "classic"` → `"default"`） | 二开变更 | 保留 |
