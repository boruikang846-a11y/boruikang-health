# 数据库使用说明

MySQL 8 为部署目标。`DDL.sql` 是新库的规范表结构，`DML.sql` 是演示知识和未启用的接入配置，`dev/DML.sql` 是虚构账号、患者和任务。dev 手工初始化顺序为 DDL → DML → dev/DML，执行前核对目标库 `bgssai_health`。应用 dev/prod 均 `spring.sql.init.mode=never`，不会启动时建表或灌入演示数据。

`DDL-local.sql`、`DML-local.sql`、`dev/DML-local.sql` 是 H2 MySQL 模式适配，只用于 local/test 自动初始化。不得用于 MySQL 部署。H2 验证不能代替真实 MySQL 上的 DDL、唯一约束、锁并发与备份恢复验证。

DDL 使用 IF NOT EXISTS，只能初始化空库，不会迁移已有表。后续有结构变更时须新增可审阅增量脚本，并先备份。种子采用固定 id 与无覆盖的重复键处理，重启不覆盖业务修改，也不会把任务日期每天滚动重置。

`prod/DML.sql` 当前没有真实医院初始化数据；禁止把 dev 账号或演示审批当作生产初始化。正式医院、医护账号、已审核知识与初始配置须另行交接。当前仓库不是生产数据迁移方案。

`patient.account_id` 与任务 `(hospital_id, request_key)` 使用唯一约束。任务变更通过患者行锁及 version 条件更新保证并发一致性，审计和人工沟通记录同事务提交。


## 1.2 演示数据与医院来源

dev/DML.sql 铺底 15 位患者、14 份记录、35 个任务、5 个渠道、4 条沟通记录；全部虚构。manager / doctor / doctor_b / nurse / platform 密码统一为 `HealthDemo@2026!`，仅供演示，公网开放前更换。doctor 可见 10 位患者，doctor_b 可见 5 位；manager 查看全部。

12 位扩展患者明确标记 HOSPITAL_MOCK，医院患者号 DEMO-HP-*、报告号 DEMO-REC-*；接口动态模拟的 MOCK-P-* / MOCK-DC-* 与铺底数据分开。SOP 演示发布人是运营主管，个案建议审核人是对应责任医生。已联系/完成的随访包含批准正文和虚构联系证据，联系留痕保持一致。

新库使用当前 DDL。已有 MySQL 1.1 库须先备份并核查列，再执行 `migrations/20260928-hospital-source.sql`（只执行一次）；local H2 的 DDL-local 自动补齐来源列和唯一索引。新增唯一键 `(hospital_id,source_system,hospital_patient_id)` 防止重复导入，报告沿用 `(hospital_id,source_system,external_id)`。
