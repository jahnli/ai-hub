---
name: image-studio-model
description: >-
  在在线生图工作室中新增或更新模型支持，包括模型专属参数、UI、请求构建、
  配置归一化、运行时限制和测试。
---

# 在线生图模型开发规范

## 文档优先

用户会提供对应模型的 API 文档。实现时必须以用户提供的文档为唯一参数依据：

1. 严格按照文档中的请求字段、类型、可选值、默认值、范围和模式限制实现。
2. 文档未列出的参数不得出现在类型、配置、UI 或请求中，即使其他供应商支持或现有代码中已存在。
3. 文档已移除的参数，必须从该模型的类型、配置、UI、请求和测试中移除。
4. 不得凭经验补充、猜测或沿用其他模型的参数。
5. 无法读取文档或文档描述不明确时，先向用户确认，不得自行推断。
6. 生成与编辑模式支持的参数不同时，分别按文档构建请求。

## 修改前检查

至少阅读：

- `web/src/features/image-studio/components/params-panel.tsx`
- `web/src/features/image-studio/lib/model-params/index.ts`
- 对应模型目录下的 `types.ts`、`config.ts`、`params.tsx`
- `web/src/features/image-studio/lib/__tests__/model-parameters.test.ts`

## 模型隔离

每个模型家族独立放在：

`web/src/features/image-studio/lib/model-params/<model-family>/`

必须包含：

- `types.ts`：该模型独立类型。
- `config.ts`：参数列表、模型识别、默认值、归一化、校验、限制和请求构建。
- `params.tsx`：该模型独立 UI。

隔离规则：

- 不创建公共模型参数接口、Schema、选项列表或通用参数 UI。
- 供应商专属参数不得放入 `image-studio/constants.ts`。
- 模型之间不得依赖彼此的类型、配置或 UI。
- 修改一个模型不得改变另一个模型的参数和行为。
- 每个模型的 `buildPayload` 只发送文档明确支持的字段。
- `components/params-panel.tsx` 只负责模型与分组选择及模型 UI 分发。
- `model-params/index.ts` 只负责归一化、校验、运行时限制和请求构建的轻量分发。
- 新模型必须使用明确的识别函数

## UI 布局

除非用户另有要求：

1. 图片数量是第一个参数。
2. 参数在单个垂直列表中平铺展示，不使用“高级参数”或折叠区域。
3. 自定义宽高紧邻图片尺寸。
4. 水印存在时必须是最后一个参数。
5. 使用现有 shadcn/ui 组件和 `useTranslation()`。
6. 不展示文档未定义的参数。

## 请求规则

- 供应商字段及蛇形命名转换留在该模型的 `config.ts`。
- 表示“自动”的值是否发送，以文档为准。
- `n`、响应格式、编辑端点、参考图和总图片限制均以文档为准。
- 不得将未经筛选的配置对象展开到请求中。
