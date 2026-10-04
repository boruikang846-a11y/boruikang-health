# 1.5 运营台账接口与数据契约

沿用 `/boruikang/admin` 前缀、`Jwttoken` 头、`ApiResponse{code,message,success,result}` 与分页 `result={items,page_num,page_size,total_size}`；字段 snake_case；POST 参数全部在 body；每个接口一个 Controller；限流 120 次/分钟。`经理`=MANAGER，`运营`=OPERATOR。运营只能看到自己负责患者（患者池按 owner_id，邀约/预约/转诊/签约实例按患者归属）。所有写操作追加审计，乐观锁按 `version`。

## 机构、活动、SLA、模板（设置）

| 接口 | 权限 | 契约 |
| --- | --- | --- |
| `GET /orgs` | 经理、运营 | 本院机构列表 `id/name/org_type/parent_id/contact_name/contact_phone/active/note` |
| `POST /orgs/save` | 经理 | `id?` `name` `org_type` `parent_id?` `contact_name?` `contact_phone?` `active?` `note?`；同院同名拒绝 |
| `POST /campaigns/query` | 经理、运营 | `page size status? campaign_type?` |
| `POST /campaigns/save` | 经理 | `id? version? name campaign_type org_id? location? starts_on? ends_on? owner_id? status? target_count? note?` |
| `GET /sla` | 经理、运营 | 五个风险等级各一行；未配置返回默认口径并注明 |
| `POST /sla/save` | 经理 | `risk_level first_contact_hours booking_days arrival_days lost_after_attempts note?` |
| `POST /templates/query` | 经理、运营 | `page size channel? scene? active? keyword?` |
| `POST /templates/save` | 经理 | `id? version? code channel scene title content active?`；编码唯一 |
| `POST /message-logs/create` | 经理、运营 | `patient_id task_id? channel template_code? content sent_at evidence request_key`；幂等；只登记已发，不发送；关联任务首次登记时写 `reminder_sent_at` |
| `POST /message-logs/query` | 经理、运营 | `page size patient_id? task_id? channel? from? to?` |

## 患者池与邀约

| 接口 | 权限 | 契约 |
| --- | --- | --- |
| `POST /screenings/query` | 经理、运营 | `page size keyword? source_type? pool_status? risk_level? org_id? campaign_id? owner_id? screened_from? screened_to? import_batch?`；非本人负责的行姓名与电话脱敏 |
| `POST /screenings/create` | 经理、运营 | `source_type name gender age? phone id_card_tail? screened_at finding category? org_id? campaign_id? owner_id? external_id? note?`；同来源同 external_id 返回既有行 |
| `POST /screenings/import` | 经理、运营 | `source_type import_batch org_id? campaign_id? owner_id? rows[]{name gender? age? phone id_card_tail? screened_at? finding category? external_id?}`，最多 500 行；批次号不可重复；返回 `import_batch created skipped messages[]` |
| `POST /screenings/judge` | 经理、运营（本人负责） | `id version pool_status(HIGH_RISK/NON_HIGH_RISK/DISCARDED) risk_level? risk_evidence? non_high_risk_reason? owner_id? note?`；高危必须 HIGH/CRITICAL 并附院方依据 |
| `POST /screenings/enroll` | 经理、运营 | `id version existing_patient_id? department? disease? doctor_id? owner_id? patient_type? source_scene? outreach? note?`；NEW 不可入组；默认开出 OUTREACH 任务 `request_key=outreach-screening-{id}` |
| `POST /invitations/query` | 经理、运营 | `page size patient_id? screening_id? campaign_id? result? method? actor_id? invited_from? invited_to? reached?` |
| `POST /invitations/create` | 经理、运营 | `patient_id screening_id? campaign_id? invited_at method result planned_visit_mode? summary next_invite_at? evidence request_key`；轮次自动递增；未联系上（NO_ANSWER/BUSY/WRONG_NUMBER）必须填 `next_invite_at`；WILLING 必须填到院方式；接通类完成所有开放 OUTREACH 任务并推进阶段到 CONTACTED；DECEASED 直接结案；连续未联系上达到 SLA `lost_after_attempts` 自动创建 P1 ALERT（alert_source=LOST_CONTACT），开放期间不重复 |

## 预约到诊

| 接口 | 权限 | 契约 |
| --- | --- | --- |
| `POST /appointments/query` | 经理、运营 | `page size patient_id? status? appointment_type? channel? from? to? clinician_id? department? open?` |
| `POST /appointments/create` | 经理、运营 | `patient_id task_id? invitation_id? referral_id? appointment_type channel appointment_at department clinician_id? evidence request_key`；患者同时只能有一条未到院预约；指定 `task_id` 时必须是该患者 PENDING/NO_SHOW 的 REVISIT 任务，否则自动创建 REVISIT 任务；任务置 BOOKED 并写 `appointment_id`；患者阶段推进到 BOOKED |
| `POST /appointments/transition` | 经理、运营 | `id version action(REMIND/ARRIVE/NO_SHOW/CANCEL/COMPLETE) at? effective? no_show_reason? outcome? outcome_note? evidence?`；REMIND 需凭证并写任务 `reminder_sent_at`；ARRIVE 需凭证，默认有效到诊，任务 ARRIVED、患者 ARRIVED；NO_SHOW 需原因，任务 NO_SHOW；CANCEL 需原因，任务回 PENDING；COMPLETE 需结果，任务 COMPLETED |

## 服务包、方案、签约实例

| 接口 | 权限 | 契约 |
| --- | --- | --- |
| `POST /plans/query` | 经理、运营 | `page size keyword? status? disease?`；返回节点列表 |
| `POST /plans/save` | 经理 | `id? version? name disease entry_scene description? nodes[]{seq stage offset_days task_type title priority checklist?}`；序号唯一；更新时整体替换节点；已停用不可改 |
| `POST /plans/status` | 经理 | `id version status(ACTIVE/RETIRED)`；有启用中服务包引用时不可停用 |
| `POST /packages/query` | 经理、运营 | `page size keyword? status? tier? scene?`；返回 `plan_name active_enrollments` |
| `POST /packages/save` | 经理 | `id? version? code name disease tier scene period_days price_cents followup_count? assessment_count? review_count? device_note? privilege_note? service_hours? content? red_lines? plan_id?`；价格仅记录 |
| `POST /packages/status` | 经理 | `id version status(ACTIVE/RETIRED)`；启用必须已关联启用中方案 |
| `POST /enrollments/query` | 经理、运营 | `page size patient_id? package_id? status? end_from? end_to? expiring_soon?`；返回任务数、完成数、剩余天数 |
| `POST /enrollments/create` | 经理、运营 | `patient_id package_id order_no? signed_at consent_at consent_evidence summary? activate_now? request_key`；服务包必须启用；患者同时只能有一条待激活/进行中实例；写患者 `service_package_id` |
| `POST /enrollments/transition` | 经理、运营 | `id version action(ACTIVATE/CLOSE/EXPIRE/UPGRADE) start_date? reason? upgrade_package_id? upgrade_order_no?`；ACTIVATE 按方案节点生成任务（`request_key=enrollment-{id}-{seq}`，带 `enrollment_id plan_node_seq`，服务期 = start + period_days，患者阶段 MANAGING）；CLOSE 需原因并作废未完成任务；EXPIRE 需服务期已满，患者阶段 REVISIT_DUE；UPGRADE 旧实例 UPGRADED、任务作废，新实例立即激活并返回 |

## 转诊、用药、患者扩展

| 接口 | 权限 | 契约 |
| --- | --- | --- |
| `POST /referrals/query` | 经理、运营 | `page size patient_id? direction? referral_type? status? from_org_id? to_org_id? from? to? open? overdue?`；`overdue` = INITIATED/ACCEPTED 且超过 `sla_due_at` |
| `POST /referrals/create` | 经理、运营 | `patient_id direction referral_type from_org_id? to_org_id? reason risk_level? initiated_at? evidence request_key`；至少一个机构；同患者同时只能有一条进行中；到达 SLA = 发起时间 + 风险 `arrival_days` |
| `POST /referrals/transition` | 经理、运营 | `id version action(ACCEPT/ARRIVE/FEEDBACK/CLOSE/REJECT) at? feedback_department? feedback_clinician_id? feedback_diagnosis? feedback_disposition? reason? evidence?`；ACCEPT/ARRIVE 需凭证；FEEDBACK 需诊断与处置；REJECT 需原因；ARRIVE 推进患者 ARRIVED；CLOSE 且 reason=TRANSFERRED 推进 TRANSFERRED |
| `POST /medications/query` | 经理、运营 | `patient_id status?`，最多 100 条 |
| `POST /medications/save` | 经理、运营 | `id? version? patient_id drug_name dosage? frequency? start_date? end_date? status? source adherence? note?`；只记录，不建议 |
| `POST /patients/consent` | 经理、运营 | `id version consent_at consent_version consent_evidence` |
| `POST /patients/timeline` | 经理、运营 | `patient_id limit?(≤200)`；合并任务、联系、邀约、预约、记录、转诊、签约、消息、用药与关键审计，倒序 |
| `POST /patients/create` | 经理、运营 | 新增可选 `id_card birth_date address emergency_contact emergency_phone inpatient_no bed_no patient_type source_scene org_id referrer_id channel_id tags[] risk_level risk_evidence outreach`；`outreach=true` 开出 OUTREACH 任务 |
| `POST /patients/update` | 经理、运营 | 新增上述档案字段与 `lifecycle_reason`；`lifecycle` 十态，进入 PAUSED/TRANSFERRED/LOST/CLOSED 必填原因；LOST 写 `lost_since`；`service_package_id` 必须指向启用中的 `service_package` |
| `POST /patients/query` | 经理、运营 | 新增 `lifecycle source_scene org_id owner_id doctor_id tag overdue open_alert revisit_pending created_from created_to contact_from contact_to` |
| `POST /records/observation` | 经理、运营 | `patient_id occurred_at systolic? diastolic? heart_rate? weight? glucose? content? needs_contact? source(PHONE/DEVICE/HOME_VISIT/HOSPITAL)`；来源 STAFF_ENTRY；`needs_contact` 生成 ALERT（alert_source=OBSERVATION） |

## 任务扩展与报表

| 接口 | 权限 | 契约 |
| --- | --- | --- |
| `POST /tasks/create` | 经理、运营 | `task_type` 增加 OUTREACH；ALERT 可选 `alert_source`（默认 STAFF），按优先级写 `sla_due_at`（P0 2h / P1 24h / P2 72h，取与 due_at 较早者） |
| `POST /tasks/query` | 经理、运营 | 新增 `sla_overdue alert_source enrollment_id`；响应新增 `alert_source sla_due_at ack_at disposition appointment_id enrollment_id plan_node_seq reminder_sent_at sla_overdue` |
| `POST /tasks/claim` | 经理、运营 | ALERT 领取时写 `ack_at`（响应） |
| `POST /tasks/attempt` | 经理、运营 | OUTREACH 也可登记；`result` 增加 FAMILY_ANSWERED/NOT_COOPERATIVE/DECEASED/OTHER |
| `POST /tasks/contact` | 经理、运营 | 可选 `satisfaction(1-5) complaint` |
| `POST /tasks/transition` | 经理、运营 | ALERT COMPLETE 必填 `disposition`（OUTPATIENT/EMERGENCY/INPATIENT/OBSERVE/FALSE_ALARM/OTHER）；OUTREACH 可 COMPLETE（需 outcome 与 evidence）或 CANCEL |
| `POST /tasks/reassign` | 经理 | `id version assignee_id reason`；转交任务并审计原因 |
| `POST /reports/metrics` | 经理、运营 | `from_date to_date owner_id? campaign_id?`（≤366 天）；返回十项 `code name numerator denominator rate target met lower_is_better` 与字典版本 |
| `POST /reports/funnel` | 经理、运营 | 同上；全局漏斗 12 级与活动漏斗 |
| `POST /reports/operators` | 经理、运营（仅本人） | 按人：负责患者、高风险、邀约/触达、触达率、预约、有效到诊、到诊转化率、随访完成率、逾期、失访、评级 |
| `GET /reports/metric-dictionary` | 经理、运营 | 十项指标的分子、分母、排除规则、目标 |
| `POST /reports/daily` | 经理、运营 | `date`；13 项日统计 |
| `GET /reports/workbench` | 经理、运营 | 八个队列 `code name count route` |

运营视角下，OUTREACH 与 ALERT 的 `sla_overdue` = 未终态、`sla_due_at` 已过且 `ack_at` 为空。指标字典版本 `1.5`，归档快照沿用周报结构；漏斗与指标均从台账实时计算，不落库。

SQL：全量发版，备份后清库，执行 `sql/DDL.sql` → `sql/DML.sql` → `sql/dev/DML.sql`；仓库只保留 DDL 与 DML，不维护增量迁移脚本。本地 H2 用 `*-local.sql` 自动初始化。
