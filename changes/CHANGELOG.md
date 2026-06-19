# 变更日志

仅记录二开修改，用于未来与上游合并时快速定位差异。详细文件列表见 [details/](details/) 目录。

| 编号 | 日期 | 说明 | 与上游差异 | 合并指引 | 详情 |
|------|------|------|-----------|---------|------|
| 001 | 2026-06-18 | 启动默认主题改为 default | 二开变更 | 保留 | `common/constants.go`、`setting/system_setting/theme.go` |
| 002 | 2026-06-18 | 全局品牌重命名 New API → AI Hub | 二开变更 | 检查 | [详情](details/002-brand-rename.md) |
| 003 | 2026-06-18 | 移除主页底部 Footer 组件 | 二开变更 | 保留 | `features/home/index.tsx`、`layout/components/footer.tsx` |
| 004 | 2026-06-19 | 删除已废弃的 Footer 组件翻译 key | 二开变更 | 保留 | `i18n/locales/{en,zh,fr,ja,ru,vi}.json`（14 key × 6 语言） |
| 005 | 2026-06-19 | 修复前端 dev server 端口冲突 | 二开变更 | 保留 | `web/default/rsbuild.config.ts` |
| 006 | 2026-06-19 | 移除开发环境 devtools 面板 | 二开变更 | 可丢弃 | `web/default/src/routes/__root.tsx` |
| 007 | 2026-06-19 | 删除 About 页面及所有相关引用 | 二开变更 | 保留 | [详情](details/007-remove-about.md) |
| 008 | 2026-06-19 | 删除兑换码管理界面及前端引用 | 二开变更 | 保留 | [详情](details/008-remove-redemption-frontend.md) |
| 009 | 2026-06-19 | 删除后端兑换码功能及数据库表 | 二开变更 | 保留 | [详情](details/009-remove-redemption-backend.md) |
| 010 | 2026-06-19 | Toast 关闭按钮位置由左上角改为右上角 | 二开变更 | 可丢弃 | `web/default/src/styles/index.css` |
| 011 | 2026-06-19 | 移除 Anthropic 和 Simple Large-font 主题颜色预设 | 二开变更 | 保留 | [详情](details/011-remove-theme-presets.md) |
| 012 | 2026-06-19 | 侧边栏样式默认值改为 floating，选项顺序调整为浮动→侧边栏→内嵌 | 二开变更 | 可丢弃 | `web/default/src/context/layout-provider.tsx`、`web/default/src/components/config-drawer.tsx` |
| 013 | 2026-06-19 | 侧边栏背景色改为透明（所有主题预设、明暗模式） | 二开变更 | 可丢弃 | `web/default/src/styles/theme.css`、`web/default/src/styles/theme-presets.css` |
| 014 | 2026-06-19 | 主题预设定制：新增碧空并设为默认、移除海风、侧边栏选中色改主题色、移除预设文字标签及翻译、调整预设顺序、修复预设属性 Bug | 二开变更 | 可丢弃 | [详情](details/014-theme-preset-customization.md) |
| 015 | 2026-06-20 | 侧边栏「聊天」菜单重命名为「快捷方式」，含 6 语言翻译 | 二开变更 | 保留 | [详情](details/015-sidebar-chat-to-shortcuts.md) |
| 016 | 2026-06-20 | 弹出层和卡片背景色不再混入主题色，浅/深模式各用纯净底色 | 二开变更 | 可丢弃 | `web/default/src/styles/theme-presets.css`、`web/default/src/components/ui/dialog.tsx` |
