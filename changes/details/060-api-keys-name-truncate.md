# API 密钥界面优化

**日期**: 2026-07-06

## 涉及文件

- `web/default/src/features/keys/components/api-keys-columns.tsx` — API 密钥名称列改用 TruncatedCell，避免长名称撑开表格并保持移动端标题展示稳定
- `web/default/src/features/keys/components/api-keys-mutate-drawer.tsx` — 创建 API 密钥侧边抽屉默认选择 default 分组，并在分组数据加载前保持 default 可见
