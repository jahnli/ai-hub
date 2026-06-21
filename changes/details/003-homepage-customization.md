# 首页定制：移除区块、替换标签、三步上手优化与连接线动画、飞书联系信息

**日期**: 2026-06-18 ~ 2026-06-21

## 涉及文件

- `web/default/src/features/home/index.tsx` — 移除主页底部 Footer 组件引用
- `web/default/src/layout/components/footer.tsx` — 移除 Footer 组件
- `web/default/src/features/home/components/sections/hero.tsx` — 移除「常用应用支持」整块区域（标题、描述、Cherry Studio / CC Switch / 更多应用卡片链接），清理未使用的 `CherryStudio` import 和 `MoreIcon` 组件
- `web/default/src/features/home/components/sections/features.tsx` — 移除「开源项目（Open Source）」附加特性卡片，清理 `HeartHandshake` import，网格布局从 `md:grid-cols-4` 调整为 `md:grid-cols-3`；「极速」卡片模型标签 Qwen / Llama 替换为 GLM / Kimi
- `web/default/src/features/home/constants.ts` — 从 `DEFAULT_FEATURES` 常量数组中移除 `Open Source` 条目
- `web/default/src/features/home/components/sections/how-it-works.tsx` — 第一步「配置」中 API Keys 改为主题色可点击链接（跳转 `/keys`），第二步「连接」新增 API Base URL 提示，描述区域 max-width 放宽到 280px；布局改为 5 列（3 卡片 + 2 连接线容器）集成 `StepConnectionLine` 组件
- `web/default/src/features/home/components/step-connection-line.tsx` — 新增步骤连接线动画组件：SVG 贝塞尔曲线路径，主题色渐变流动虚线 + 三级脉冲粒子（主粒子/尾随/微粒），辉光滤镜，循环播放，ResizeObserver 自适应尺寸
- `web/default/src/features/home/components/sections/cta.tsx` — 底部新增飞书联系信息区块（Feishu 图标链接、AI 工程效率科・李佳衡、遇到问题？飞书聊一聊）；重构 CTA 组件使联系信息在登录后仍然显示
- `web/default/src/i18n/locales/zh.json` — 新增 Trans 组件 key、飞书联系信息中文翻译；`API Base URL` 中文翻译改为保留英文术语
