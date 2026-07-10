# API 密钥界面优化

**日期**: 2026-07-10

## 涉及文件

- `web/default/src/features/keys/components/api-keys-columns.tsx` — API 密钥名称列改用 TruncatedCell，避免长名称撑开表格并保持移动端标题展示稳定；分组倍率仅超级管理员可见；IP 限制列右侧新增「快速导入」下拉列（含 CC Switch 选项）
- `web/default/src/features/keys/components/api-keys-mutate-drawer.tsx` — 创建 API 密钥侧边抽屉默认选择用户所属分组，所属分组为空时回退 default；创建和编辑界面的分组倍率仅超级管理员可见
- `web/default/src/features/keys/components/api-keys-cells.tsx` — 新增 QuickImportCell 组件，下拉列展示「快速导入」按钮，点击后弹出选项菜单（当前含 CC Switch）；修复 ApiKeyCell 中嵌套三元表达式的 lint 错误
- `web/default/src/features/keys/components/data-table-row-actions.tsx` — 将 CC Switch 从三点菜单中移除
- `web/default/src/i18n/locales/en.json` — 新增 Quick Import 翻译
- `web/default/src/i18n/locales/zh.json` — 新增「快速导入」翻译
- `web/default/src/i18n/locales/fr.json` — 新增 Importation rapide 翻译
- `web/default/src/i18n/locales/ru.json` — 新增 Быстрый импорт 翻译
- `web/default/src/i18n/locales/ja.json` — 新增クイックインポート翻译
- `web/default/src/i18n/locales/vi.json` — 新增 Nhập nhanh 翻译
