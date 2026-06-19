# 删除 About 页面及所有相关引用

**日期**: 2026-06-19

## 涉及文件

- `features/about/` — 删除整个目录（`index.tsx`、`api.ts`、`types.ts`）
- `routes/about/index.tsx` — 删除路由
- `hooks/use-top-nav-links.ts` — 删除 About 导航链接
- `lib/nav-modules.ts` — 删除 `about` 字段及默认值
- `system-settings/maintenance/config.ts` — 删除类型和默认配置中的 `about`
- `system-settings/maintenance/header-navigation-section.tsx` — 删除 About 开关/schema/表单值
- `system-settings/general/system-info-section.tsx` — 删除 About 配置表单字段及 schema
- `i18n/static-keys.ts` — 删除 `'About'` key
- `i18n/locales/{en,zh,fr,ja,ru,vi}.json` — 删除 5 个 About 专属翻译 key × 6 语言
