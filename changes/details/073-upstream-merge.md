# 合并上游 6 个 commit（2026-08-28）

**日期**: 2026-08-28

## 上游 commit

- `a073f74b3` refactor: deprecate int32 (#7025)
- `8c25eee71` chore(build): upgrade Bun to 1.4.0
- `8f6961c67` feat: vllm thinking_token_budget (#7027)
- `cae3676ec` feat: glm chanel /v1/responses (#7050)
- `ba2e9287b` feat(ollama): passthrough Claude Messages and OpenAI Responses (#7051)
- `e468b7391` docs: update PR template and remove PR Check workflow (#7053)

## 合并统计

- 上游原始变更涉及 51 个文件，新增 910 行、删除 208 行。
- 5 个冲突文件逐一人工确认。
- 3 个兑换码文件按本地 #008/#009 继续保持删除。
- 自动合并的二开关联文件逐一审查并确认。

## 冲突解决

| 文件 | 策略 | 说明 |
|------|------|------|
| `AGENTS.md` | 手动合并 | 保留本地中文项目规范和 PR 规则，吸收上游 Issue 处理流程及 64 位钱包额度说明 |
| `controller/redemption.go` | 保留本地删除 | 维持 #008/#009 移除兑换码后端 API 的定制 |
| `model/redemption.go` | 保留本地删除 | 维持 #009 移除兑换码模型及兑换逻辑的定制 |
| `model/redemption_test.go` | 保留本地删除 | 与已移除的兑换码功能保持一致 |
| `relay/channel/ollama/adaptor.go` | 手动合并 | 保留 #002 的 `AIGatewayError` 品牌类型与 Responses 行为，合入 Claude Messages 透传 |

## 二开保护与上游功能

- 保留 #037 的订阅公司范围、全员订阅和额度调整逻辑，并将余额购买套餐切换到钱包安全额度边界。
- 保留 #039、#062 的用户统计、成本中心和管理员权限逻辑，增加用户钱包额度上限与原子更新保护。
- 保留 #055 的分组 × 供应商倍率计费优先级，补齐 OpenRouter 缓存 Token 等路径的安全额度转换。
- 保留 #056 的原始 User-Agent、用户资料和管理员日志字段，仅同步额度饱和注释。
- 钱包与充值额度采用 JavaScript 安全整数上限 `2^53-1`；MySQL/PostgreSQL 启动时检查用户额度列是否为 64 位，SQLite 跳过检查。
- 新增 vLLM `thinking_token_budget`、智谱 GLM `/v1/responses`、Ollama Claude Messages/OpenAI Responses 透传支持。
- 构建链路统一固定 Bun 1.4.0；引入 Agent Issue/PR 模板并移除旧 PR Check 工作流。

## 验证

- `go build ./...`：通过。
- `cd relaykit && GOWORK=off go build ./...`：通过。
- `cd web && bun run typecheck`：通过。
- `cd web && bunx oxlint -c .oxlintrc.json src/features/usage-logs/types.ts`：通过。
- 受影响后端包测试：除 `TestRunChannelTestWorkersStopsAfterCancellation` 外均通过。
- 单独重复运行上述并发取消测试 10 次，结果在 0、1、2 个完成任务间波动；该测试及对应 worker 逻辑未被本次上游提交修改，确认为既有时序不稳定测试，未在本次合并中夹带修复。
