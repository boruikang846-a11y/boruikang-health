# 2.2 既有数据库升级规则

本轮只加法升级，禁止按历史章节清库。先备份并在隔离副本演练、核对已应用版本；应用停止写入后按顺序执行待应用脚本：2.0 基线 → `PATIENT-SERVICE-2.1-migration.sql`（两表）→ `CONTINUITY-2.2-migration.sql`（三表及四列）。若 2.1 已存在，仅执行 2.2。ALTER 语句每版执行一次，不可重复执行；MySQL DDL 隐式提交，失败后先核对结构再恢复，不能盲目重跑。

新空库使用完整 DDL（39 表），不要再执行增量脚本。DDL 的 IF NOT EXISTS 不会给既有表补列。既有 H2 local 数据库同样需要升级，或另建独立虚构演示库；不得自动删除旧文件。升级前的 VERIFIED 入口没有 service_consent_key，按失效处理，需续签并重新核实；历史反馈保留。

本次未操作真实数据库。dev/prod 仍由独立部署仓发布。下面为基础说明与历史版本记录；出现清库的文字仅描述旧演示库初始化，不是本轮发布步骤。

# 数据库使用说明

MySQL 8 为部署目标。`DDL.sql` 是新库的规范表结构，`DML.sql` 是演示知识和未启用的接入配置，`dev/DML.sql` 是虚构账号、患者和任务。SQL 文件不指定库名；初始化时必须先创建目标库，并让 MySQL 客户端选择该库后按 DDL → DML → dev/DML 执行。dev 的目标库是华为云 RDS `101.44.27.60:3306/boruikang`，prod 由独立配置决定。按用户要求，dev 使用 `root` 账号，账号与口令直接保存在两端 `application-dev.properties` 中；Jenkins 的 dev 数据库凭据及目标机环境文件须与之保持一致。应用 dev/prod 均 `spring.sql.init.mode=never`，不会启动时建表或灌入演示数据。

`DDL-local.sql`、`DML-local.sql`、`dev/DML-local.sql` 是 H2 MySQL 模式适配，只用于 local/test 自动初始化。不得用于 MySQL 部署。H2 验证不能代替真实 MySQL 上的 DDL、唯一约束、锁并发与备份恢复验证。

DDL 使用 IF NOT EXISTS，只能初始化空库。发版采用全量口径：备份后清库，按 DDL → DML → dev/DML 重建；仓库不维护增量迁移脚本。种子采用固定 id 与无覆盖的重复键处理，重启不覆盖业务修改，也不会把任务日期每天滚动重置。

`prod/DML.sql` 当前没有真实医院初始化数据；禁止把 dev 账号或演示审批当作生产初始化。正式医院、医护账号、已审核知识与初始配置须另行交接。当前仓库不是生产数据迁移方案。

`patient.account_id` 与任务 `(hospital_id, request_key)` 使用唯一约束。任务变更通过患者行锁及 version 条件更新保证并发一致性，审计和人工沟通记录同事务提交。


## 1.3 演示数据

新库铺底 87 位患者、182 份记录、371 个任务、17 个渠道、77 条结构化联系记录，覆盖 12 科室与各流程状态。全部虚构，来源标记 HOSPITAL_MOCK。账号见根 README。旧版基线与本轮扩展使用不同固定 ID；重复执行 DML 不覆盖用户业务修改。动态 Mock 同步另增加 2 患者 / 3 报告，与铺底数据区分。

`tools/generate-demo-seed.py` 可复现本轮扩展块，日期按首次执行时间生成。临床审核与联系凭证均明确标记虚构，不代表真实医生审批。

旧 SOP 类型的知识条目在全量 DML 中已按 EDUCATION/DRAFT 铺底，不再有 SOP 种类。

## 1.6 医生、护士登录

`health_account` 增加 `department`；删除 `hospital_clinician`，院方医生改为 `role_code=DOCTOR` 的账号并沿用原 id（2/5/10/11），所有 `doctor_id`、`reviewer_id`、`referrer_id`、`clinician_id`、`feedback_clinician_id` 指向医生账号。`care_record` 增加 `doctor_viewed_at / doctor_viewer_id / doctor_opinion`；`care_task` 删除 `review_channel / review_evidence / handover_channel / handover_evidence`；`knowledge_entry` 删除 `review_channel / review_evidence`。dev 种子新增医生账号 doctor、doctor_b、doctor_c、doctor_d 与护士账号 nurse（6）、nurse_b（23），部分虚构患者分给护士；`tools/generate-demo-seed.py` 可重生成 1.3 场景块（之后需以相同 `--date` 重跑 `tools/generate-ledger-seed.py`）。发版按全量口径：备份后清库重建。

## 1.5 运营台账

新增 14 张台账表与患者、任务、联系记录的新列，全部写在 `DDL.sql` / `DDL-local.sql` 的建表语句里；`patient.service_package_id` 现在指向 `service_package`。发版按全量口径：备份后清库重建，先核对服务器 env 覆盖的真实库地址。基础 DML 新增 14 条短信与话术模板、5 档 SLA 默认值；dev DML 新增机构、活动、方案、服务包、患者池、邀约、预约、签约、转诊、用药与已发消息的虚构种子（`tools/generate-ledger-seed.py --date YYYY-MM-DD` 可重生成，标记块可重复执行）。演示患者 1001/1002/2001 的阶段与服务包引用随台账一并调整。

## 1.9 企业微信与公众号

`integration_config` 增加 app_id、callback_token、aes_key、channel_mode、verify_status、verified_at、last_error；`health_account` 增加 wecom_user_id；`intake_channel` 增加 wecom_config_id、wecom_qr_url、official_qr_url；`message_template` 增加 external_template_id。新表 `wechat_contact`、`wechat_message`，都写在 `DDL.sql` / `DDL-local.sql` 的建表语句里。发版仍是全量口径：备份后清库重建。

基础 DML 新增两条停用的微信模板样例（欢迎语、公众号复诊提醒）。dev DML 新增标明模拟的企业微信、公众号配置（不含回调 Token，占位值不是任何真实凭证）、operator_a 的演示成员账号、启用的演示欢迎语与模板消息、5 个虚构微信联系人和 12 条收发记录。prod DML 不含任何微信配置。

## 1.9 批量演示数据

用户要求 dev 上"尽可能多的数据"。`tools/generate-bulk-seed.py` 生成 dev DML 末尾的 `-- BEGIN BULK DEMO DATA 1.9` 块（重跑只替换该块，不连库）：12 位各科责任医生（doctor_05–doctor_16）、2 位运营与 2 位护士账号及其企业微信成员账号，8 个机构、6 个活动、24 个渠道、24 条宣教、6 个微信与公众号模板；500 位患者（id 60001–60500）及其约 1500 份记录、2300 个任务、940 条联系记录、690 条用药、220 个签约、170 个预约、270 次邀约、56 个转诊、167 条已发消息；360 条患者池记录；761 个企业微信、公众号联系人（含待绑定与已失联）和 4265 条收发记录，规则与 1.9 一致：公众号文字只在患者 48 小时内有互动时发出，企业微信消息待成员确认，发送成功后来信标为已处理。

全部虚构：姓名为随机组合，电话以 000 开头不可拨，微信 ID 与模板 ID 为编造值，临床文字标注演示。日期相对执行时间生成。固定 id 使用此前各块都没用过的号段，每行都是"不存在才插入"，所以既能随全量重建加载，也能在已有种子的库上单独执行这一块只新增数据，不改动已有行。
