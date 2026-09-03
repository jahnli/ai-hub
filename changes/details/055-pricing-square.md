# 模型广场优化

**日期**: 2026-09-03

## 涉及文件

- `web/default/src/features/pricing/components/model-card.tsx` — 「动态计费」标签颜色从橙色改为主题色。
- `web/default/src/components/status-badge.tsx` — 新增 primary variant 支持主题色状态标签。
- `controller/pricing.go` — 超级管理员可查看全部分组。
- `web/src/features/pricing/index.tsx` — 根据当前用户角色判断是否展示分组倍率，并将用户所属分组和当前筛选分组传入模型卡片与模型详情。
- `web/default/src/features/pricing/components/pricing-toolbar.tsx` — 向筛选侧边栏透传分组倍率可见性。
- `web/default/src/features/pricing/components/pricing-sidebar.tsx` — 分组筛选项按权限显示或隐藏倍率后缀。
- `web/src/features/pricing/components/model-details.tsx` — 模型详情按权限过滤分组：管理员可查看全部分组与倍率，普通用户仅能查看所属分组，并隐藏倍率与自动分组链；将同一可见分组范围传入 API 速率限制区域；独立详情页使用模型实际有效分组倍率。
- `web/src/features/pricing/components/model-details-price.tsx` — 模型详情基础价格按当前筛选分组或用户实际所属分组计算，覆盖 Token、按次及动态表达式计费，并保留供应商分组倍率。
- `web/src/features/pricing/components/__tests__/base-price-group.test.tsx` — 覆盖筛选分组优先、全部分组时回退用户所属分组，以及动态计费应用实际分组倍率的回归场景。
- `web/src/features/pricing/components/model-details-api.tsx` — API 速率限制表按权限过滤后的可见分组渲染，无可见分组时隐藏该区域。
- `web/src/features/pricing/lib/mock-stats.ts` — 速率限制数据生成支持显式指定可见分组，并区分未指定分组与空可见分组。
- `web/src/features/pricing/components/__tests__/rate-limit-visibility.test.ts` — 覆盖普通用户仅查看所属分组、管理员查看全部分组以及无可见分组时隐藏速率限制的回归场景。
- `web/src/features/pricing/components/model-card-grid.tsx` — 将当前用户所在分组传递给模型卡片。
- `web/src/features/pricing/components/model-card.tsx` — 模型卡片计费标签旁优先显示当前用户所在分组。
- `web/src/features/pricing/lib/model-helpers.ts` — 新增模型卡片分组显示解析逻辑，兼容未登录或用户分组为空时的回退展示。
- `web/src/features/pricing/lib/__tests__/model-display-group.test.ts` — 覆盖当前用户分组优先、空分组回退及模型无分组场景。

## 分组 × 供应商定价

- `plan.md` — 记录分组 × 供应商定价的需求、优先级、计费链路、前后端改造方案与验证计划。
- `controller/option.go` — 为 `GroupVendorRatio` option 增加配置合法性校验。
- `controller/pricing.go` — 模型广场接口下发按可用分组过滤的供应商倍率及当前用户特殊倍率分组标记。
- `model/option.go` — 注册并持久化 `GroupVendorRatio` option。
- `model/pricing.go` — 在模型定价缓存中维护模型到启用供应商 ID 的映射，供计费路径快速解析。
- `relay/helper/price.go` — 主计费链路统一按“用户特殊倍率 > 分组供应商倍率 > 分组基础倍率”解析最终分组倍率。
- `service/quota.go` — Realtime WebSocket 预扣费同步使用统一的供应商倍率解析逻辑。
- `service/task_billing.go` — 任务按 Token 重算同步使用统一的供应商倍率解析逻辑。
- `service/log_info_generate.go` — 命中供应商倍率时在消费日志中记录供应商 ID 与最终供应商分组倍率。
- `setting/ratio_setting/group_ratio.go` — 新增分组供应商倍率配置、校验、复制、JSON 转换及统一优先级解析器。
- `setting/ratio_setting/group_vendor_ratio_test.go` — 覆盖倍率优先级、免费倍率、无供应商回退、配置校验及 JSON 往返行为。
- `types/price_data.go` — 扩展分组倍率信息，携带供应商倍率命中状态与供应商 ID。
- `web/src/features/pricing/hooks/use-pricing-data.ts` — 按模型供应商生成有效分组倍率，并保持用户特殊倍率最高优先级。
- `web/src/features/pricing/index.tsx` — 模型详情使用所选模型计算后的有效分组倍率。
- `web/src/features/pricing/types.ts` — 补充供应商倍率和特殊倍率分组的接口类型。
- `web/src/features/system-settings/billing/index.tsx` — 计费设置表单默认值补充 `GroupVendorRatio`。
- `web/src/features/system-settings/billing/section-registry.tsx` — 计费设置字段注册表补充 `GroupVendorRatio`。
- `web/src/features/system-settings/models/group-ratio-form.tsx` — JSON 编辑模式与计费指南增加供应商倍率配置及优先级说明。
- `web/src/features/system-settings/models/group-ratio-visual-editor.tsx` — 可视化编辑器支持按分组添加、选择、修改和删除供应商倍率，并以供应商名称展示、ID 存储。
- `web/src/features/system-settings/models/index.tsx` — 分组设置默认值补充 `GroupVendorRatio`。
- `web/src/features/system-settings/models/ratio-settings-card.tsx` — 分组倍率卡片注册并保存供应商倍率配置。
- `web/src/features/system-settings/types.ts` — 系统设置类型补充 `GroupVendorRatio`。
- `web/src/i18n/locales/en.json` — 增加供应商倍率编辑器及计费优先级英文文案。
- `web/src/i18n/locales/zh.json` — 增加供应商倍率编辑器及计费优先级简体中文文案。
- `web/src/i18n/locales/zh-TW.json` — 增加供应商倍率编辑器及计费优先级繁体中文文案。
- `web/src/i18n/locales/fr.json` — 增加供应商倍率编辑器及计费优先级法语文案。
- `web/src/i18n/locales/ja.json` — 增加供应商倍率编辑器及计费优先级日语文案。
- `web/src/i18n/locales/ru.json` — 增加供应商倍率编辑器及计费优先级俄语文案。
- `web/src/i18n/locales/vi.json` — 增加供应商倍率编辑器及计费优先级越南语文案。
- `web/src/i18n/locales/_reports/_sync-report.json` — 更新国际化同步统计报告。
- `web/src/i18n/locales/_reports/fr.untranslated.json` — 更新法语未翻译项报告。
- `web/src/i18n/locales/_reports/ja.untranslated.json` — 更新日语未翻译项报告。
- `web/src/i18n/locales/_reports/ru.untranslated.json` — 更新俄语未翻译项报告。
- `web/src/i18n/locales/_reports/vi.untranslated.json` — 更新越南语未翻译项报告。

## 模型广场响应加密

- `common/aes_gcm.go` — 新增基于 SHA-256 密钥派生、随机 nonce 和附加认证数据的 AES-256-GCM 加解密工具，并要求密钥材料至少 32 字节。
- `common/aes_gcm_test.go` — 覆盖加解密往返、随机 nonce、空密钥、短密钥及附加认证数据不一致等边界。
- `controller/pricing.go` — 将完整模型广场响应序列化后加密为 Base64 文本返回，禁止缓存；密钥缺失或加密失败时拒绝降级返回明文。
- `controller/pricing_encryption_test.go` — 验证接口不暴露模型明文、密文可还原原始响应、响应类型与缓存头正确，以及缺少密钥时返回错误。
- `controller/ratio_sync.go` — 倍率同步支持识别并解密加密后的 `/api/pricing` 响应，同时保持对原有明文 JSON 上游的兼容。
- `web/src/features/pricing/api.ts` — 模型广场请求改为接收文本响应，解密成功后继续以原 `PricingData` 类型交给页面。
- `web/src/features/pricing/lib/pricing-encryption.ts` — 使用浏览器 Web Crypto API 完成 Base64 解码、AES-GCM 解密、UTF-8 转换、JSON 解析和响应结构校验。
- `web/src/features/pricing/lib/__tests__/pricing-encryption.test.ts` — 覆盖正确密钥解密、错误密钥、短密钥和非法响应结构。
- `web/src/env.d.ts` — 声明模型广场前端构建期密钥常量。
- `web/rsbuild.config.ts` — 从进程环境或仓库根目录 `.env` 读取模型广场密钥并在前端构建时注入。
- `.env.example` — 补充模型广场 AES 密钥长度、前后端一致性和 Docker 构建参数说明。
- `Dockerfile` — 前端镜像构建阶段支持通过 `MODEL_SQUARE_AES_KEY` build arg 注入密钥。
- `docker-compose.yml` — 正式容器运行时向后端传递模型广场 AES 密钥。
- `docker-compose.dev.yml` — 本地容器开发环境向后端传递模型广场 AES 密钥。
