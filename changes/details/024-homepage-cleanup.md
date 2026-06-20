# 首页移除应用支持区块与开源卡片，替换模型标签

**日期**: 2026-06-21

## 涉及文件

- `web/default/src/features/home/components/sections/hero.tsx` — 移除「常用应用支持」整块区域（标题、描述、Cherry Studio / CC Switch / 更多应用卡片链接），清理未使用的 `CherryStudio` import 和 `MoreIcon` 组件
- `web/default/src/features/home/components/sections/features.tsx` — 移除「开源项目（Open Source）」附加特性卡片，清理 `HeartHandshake` import，网格布局从 `md:grid-cols-4` 调整为 `md:grid-cols-3` 适配 3 项；「极速」卡片模型标签 Qwen / Llama 替换为 GLM / Kimi
- `web/default/src/features/home/constants.ts` — 从 `DEFAULT_FEATURES` 常量数组中移除 `Open Source` 条目
