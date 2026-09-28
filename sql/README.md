# 数据库使用说明

MySQL 8 为部署目标。`DDL.sql` 是新库的规范表结构，`DML.sql` 是演示知识和未启用的接入配置，`dev/DML.sql` 是虚构账号、患者和任务。dev 手工初始化顺序为 DDL → DML → dev/DML，执行前核对目标库 `bgssai_health`。应用 dev/prod 均 `spring.sql.init.mode=never`，不会启动时建表或灌入演示数据。

`DDL-local.sql`、`DML-local.sql`、`dev/DML-local.sql` 是 H2 MySQL 模式适配，只用于 local/test 自动初始化。不得用于 MySQL 部署。H2 验证不能代替真实 MySQL 上的 DDL、唯一约束、锁并发与备份恢复验证。

DDL 使用 IF NOT EXISTS，只能初始化空库，不会迁移已有表。后续有结构变更时须新增可审阅增量脚本，并先备份。种子采用固定 id 与无覆盖的重复键处理，重启不覆盖业务修改，也不会把任务日期每天滚动重置。

`prod/DML.sql` 当前没有真实医院初始化数据；禁止把 dev 账号或演示审批当作生产初始化。正式医院、医护账号、已审核知识与初始配置须另行交接。当前仓库不是生产数据迁移方案。

`patient.account_id` 与任务 `(hospital_id, request_key)` 使用唯一约束。任务变更通过患者行锁及 version 条件更新保证并发一致性，审计和人工沟通记录同事务提交。


## 1.3 演示数据与增量迁移

新库铺底 87 位患者、182 份记录、371 个任务、17 个渠道、77 条结构化联系记录，覆盖 12 科室与各流程状态。全部虚构，来源标记 HOSPITAL_MOCK。账号见根 README。旧版基线与本轮扩展使用不同固定 ID；重复执行 DML 不覆盖用户业务修改。动态 Mock 同步另增加 2 患者 / 3 报告，与铺底数据区分。

`tools/generate-demo-seed.py` 可复现本轮扩展块，日期按首次执行时间生成。临床审核与联系凭证均明确标记虚构，不代表真实医生审批。

已有 MySQL 1.2 库：先备份，执行 `migrations/20260928-followup-operations.sql` 一次，再执行 `DML.sql` 和 `dev/DML.sql`。该脚本新增任务字段、contact_attempt 和 operations_report 表；旧 SOP 条目降为未发布参考内容，历史任务引用保留但新随访不依赖该引用。切勿重新执行空库初始化脚本或删除数据库。local/test 由 DDL-local 自动补齐字段。

已有 1.1 库须先执行 `migrations/20260928-hospital-source.sql`，再执行上述 1.3 增量。MySQL 迁移需由 Jenkins 执行，核对库为 bgssai_health。
