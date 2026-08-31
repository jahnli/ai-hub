# 合并上游 3 个 commit（2026-09-01）

**日期**: 2026-09-01

## 上游 commit

- `8c8c4153d` fix(log): preserve quota in usage statistics (#7108)
- `27ff6a876` fix(model): migrate legacy token key constraints
- `67a0585d0` fix(docs): correct Video API links across localized READMEs (#7116)

## 合并统计

- 上游原始变更涉及 10 个文件，新增 528 行、删除 7 行。
- 2 个冲突文件逐一人工确认。
- 2 个上游新增的 Token key 迁移文件逐一审查并保留。
- 6 个自动合并文件逐一审查，其中 5 个本地化 README 按本地文档策略手动调整。

## 冲突解决

| 文件 | 策略 | 说明 |
|------|------|------|
| `README.md` | 保留本地 | 继续统一使用本地飞书文档，避免上游 `docs.newapi.pro` 覆盖 #002 文档定制。 |
| `model/main.go` | 手动合并 | 先执行上游 Token key 唯一约束迁移，再执行本地废弃用户列清理和 prefill 唯一性迁移；保留兑换码删除及本地模型迁移。 |

## 自动合并与手动调整

- `model/log.go`：接受上游修复，RPM/TPM 查询只写入临时结构，避免覆盖已统计的 quota 和 Token 数据。
- `model/token_migration.go`：保留 PostgreSQL 专用 Token key 迁移；只处理已知旧约束，未知定义会停止启动，不静默删除。
- `model/token_migration_test.go`：保留 SQLite、MySQL、PostgreSQL 的全新、升级、幂等和异常约束测试入口。
- `README.en.md`、`README.fr.md`、`README.ja.md`、`README.zh_CN.md`、`README.zh_TW.md`：Video 条目统一指向本地飞书文档，不引入上游公开文档链接。

## 最终迁移顺序

主数据库迁移在 `AutoMigrate` 前依次执行：

1. PostgreSQL Token key 旧唯一约束迁移；
2. MySQL/PostgreSQL 本地废弃用户列清理；
3. PostgreSQL prefill group 唯一性迁移；
4. 其余现有迁移与 `AutoMigrate`。

## 验证

- Token 迁移专项测试：SQLite 通过；MySQL/PostgreSQL 因未配置 `TEST_MYSQL_DSN` / `TEST_POSTGRES_DSN` 跳过。
- `go build ./...`：通过。
- `go vet ./...`：通过。
- 除既有 Windows HTTP/2 GOAWAY/连接关闭断言外，其余 Go 测试通过。
- 真实 MySQL/PostgreSQL 的全新库、升级库和连续两次启动验证仍待执行，不能据此声明三库迁移验证完成。
