# 数据总览导出功能

**日期**: 2026-06-29 ~ 08-17

### 2026-08-17 导出补齐费用分布指标与图表

- `web/src/features/data-overview/lib/export-excel.ts` — Excel 概览在活跃用户/活跃率之后补充「费用 >10 人数/占比」，主表与子部门分表共用同一构建逻辑；使用分析区域新增费用分布人数柱状图并置于首位，与页面图表顺序对齐，主表和子部门分表分别传入各自的费用分桶数据
- `web/src/features/data-overview/lib/chart-to-image.ts` — 新增费用分布人数柱状图导出规格，复用页面分桶数据转换逻辑，图表标题与区间文案改用 i18n 键以保持与页面一致

### 2026-08-11 导出内容同步数据总览

- `web/src/features/data-overview/lib/export-excel.ts` — Excel 概览补充非缓存输入、非缓存输出、缓存读取、缓存写入、活跃用户/活跃率和人均 Token；子部门统计补充均价、活跃用户指标和人均 Token；用户列表补充每百万 Token 均价；使用分析图表按当前页面顺序导出模型系列调用分布、模型系列消耗排行、模型调用分布、模型消耗排行及趋势图，并调整图表起始列避免与新增表格列重叠
- `web/src/features/data-overview/lib/chart-to-image.ts` — 导出图表复用页面模型调用分布和消耗排行数据转换逻辑，保持费用换算、排序及普通模型 Top 15 截断一致；移除页面已不再展示的均价趋势和模型 Token 分布导出规格

## 涉及文件

- `web/default/package.json` — 新增 `exceljs` 依赖
- `web/bun.lock` — 锁文件更新
- `service/feishu_department.go` — 部门用户接口增加导出专用 `include_unregistered` 开关；导出时通过飞书部门成员详情补充未注册员工姓名，网页列表默认仍只返回已注册用户
- `web/default/src/features/data-overview/api.ts` — 部门用户接口参数增加 `include_unregistered` 可选项，供 Excel 导出按需拉取未注册员工
- `web/default/src/features/data-overview/index.tsx` — 导出按钮和通知设置按钮移入 Title 区域搜索按钮右侧，外层添加 flex-wrap 支持窄屏换行；向导出流程传入后端换算后的人民币费用
- `web/default/src/features/data-overview/components/export-dialog.tsx` — 导出对话框组件重构：两个勾选项（子部门详情页、用户列表页）、数据获取与 Excel 生成；子部门详情页改为逐部门加载，避免并发查询过多导致统计接口失败；用户列表导出时开启未注册员工补充
- `web/default/src/features/data-overview/lib/export-excel.ts` — Excel 生成核心逻辑：主表/子部门表/用户列表表构建、样式格式化、图表图片嵌入、文件命名与下载；导出费用改用系统汇率换算后的人民币金额；修复费用换算变量作用域错误导致模型统计图表导出失败；优化用户列表列宽、移除重置次数列，未注册员工仅填写姓名并以浅灰底色和边框标识；合并使用分析标题单元格以加长色带
- `web/default/src/features/data-overview/lib/chart-to-image.ts` — VChart 离屏渲染工具：将图表 spec 渲染为 base64 图片（子部门柱状图/饼图、趋势面积图、模型排行柱状图、模型分布饼图、用户排行图），费用图表支持传入配额到人民币换算率；导出图表尺寸加大并添加图表标题
- `web/default/src/i18n/locales/en.json` — 英文翻译（Export、Export Data、Include sub-department detail sheets 等）
- `web/default/src/i18n/locales/zh.json` — 中文翻译
- `web/default/src/i18n/locales/fr.json` — 法语翻译
- `web/default/src/i18n/locales/ja.json` — 日语翻译
- `web/default/src/i18n/locales/ru.json` — 俄语翻译
- `web/default/src/i18n/locales/vi.json` — 越南语翻译
