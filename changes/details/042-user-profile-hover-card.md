# 用户管理表格头像悬停资料卡片

**日期**: 2026-08-05

## 涉及文件

- `web/default/src/features/users/components/user-profile-hover-card.tsx` — 新增飞书风格用户资料悬浮卡片组件（Banner 背景图 + 大头像 + 姓名角色 + 字段列表），解析 custom_field_values JSON 提取职级/职位描述/出生日期/民族/探亲地；支持按 gender 展示男女图标并提供悬浮提示；新增公司名称展示（布局调整为左右结构，公司名显示在右上角，与用户名/角色/描述区域分离）；字段列表由逐个 JSX 改为 `visibleProfileFields` 数组驱动（先过滤空值再渲染），当所有字段均为空时同时隐藏分隔横线与字段容器，避免出现下方无内容的孤立横线；无 background_image 时的默认 Banner 渐变统一为 `linear-gradient(135deg, rgb(0, 90, 210) 0%, rgb(160, 210, 255) 100%)`
- `web/default/src/features/users/components/users-columns.tsx` — 用户名列头像包裹 UserProfileHoverCard，悬停触发
- `web/default/src/features/users/types.ts` — User schema 新增 department_name、job_title、job_number、mobile、gender、description、background_image、custom_field_values、join_date、company；UserColumnRow 补充 company 字段供表格与卡片使用
- `web/default/src/components/ui/hover-card.tsx` — 基于 @base-ui/react PreviewCard 封装（已有组件）
- `web/default/src/i18n/locales/en.json` — 新增翻译键：Department、Job Title、Job Number、Mobile、Job Level、Job Description、Join Date、Birthday、Ethnicity、Hometown
- `web/default/src/i18n/locales/zh.json` — 对应中文翻译
- `web/default/src/i18n/locales/fr.json` — 对应法语翻译
- `web/default/src/i18n/locales/ja.json` — 对应日语翻译
- `web/default/src/i18n/locales/ru.json` — 对应俄语翻译
- `web/default/src/i18n/locales/vi.json` — 对应越南语翻译
- `web/default/src/i18n/static-keys.ts` — 注册新增的动态翻译键
