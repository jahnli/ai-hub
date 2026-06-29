# 数据总览导出功能

**日期**: 2026-06-29

## 涉及文件

- `web/default/package.json` — 新增 `exceljs` 依赖
- `web/bun.lock` — 锁文件更新
- `web/default/src/features/data-overview/index.tsx` — 导出按钮和通知设置按钮移入 Title 区域搜索按钮右侧，外层添加 flex-wrap 支持窄屏换行
- `web/default/src/features/data-overview/components/export-dialog.tsx` — 新增导出对话框组件：两个勾选项（子部门详情页、用户列表页）、数据获取与 Excel 生成
- `web/default/src/features/data-overview/lib/export-excel.ts` — Excel 生成核心逻辑：主表/子部门表/用户列表表构建、样式格式化、图表图片嵌入、文件命名与下载
- `web/default/src/features/data-overview/lib/chart-to-image.ts` — VChart 离屏渲染工具：将图表 spec 渲染为 base64 图片（子部门柱状图/饼图、趋势面积图、模型排行柱状图、模型分布饼图、用户排行图）
- `web/default/src/i18n/locales/en.json` — 英文翻译（Export、Export Data、Include sub-department detail sheets 等）
- `web/default/src/i18n/locales/zh.json` — 中文翻译
- `web/default/src/i18n/locales/fr.json` — 法语翻译
- `web/default/src/i18n/locales/ja.json` — 日语翻译
- `web/default/src/i18n/locales/ru.json` — 俄语翻译
- `web/default/src/i18n/locales/vi.json` — 越南语翻译
