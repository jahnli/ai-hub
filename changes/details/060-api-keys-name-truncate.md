# API 密钥表格名称列优化

**日期**: 2026-07-04

## 涉及文件

- `web/default/src/features/keys/components/api-keys-columns.tsx` — API 密钥名称列改用 TruncatedCell，避免长名称撑开表格并保持移动端标题展示稳定
