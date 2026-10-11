# HEALTH 1.5 运营台账：患者池、邀约到诊、服务包履约与十项指标

版本：1.5，2026-09-29。依据 《需求对照与差距报告 2026-09-29》（历史输入，原文件未纳入本仓） 第三节 A–H 的 P0 与 P1 项，把运营团队目前在《回访邀约跟踪表》《驻院经营表》《10 项核心指标统计表》里手填的内容搬进系统。1.2–1.4 的随访审核、人工联系、院方回执、交接与归档全部保留，本版只做增量。

## 拍板项的默认口径（用户未另行拍板前按此执行）

| 拍板项 | 本版口径 |
| --- | --- |
| PRD V1.0 与 1.4 边界冲突 | 后台先补齐台账闭环；AI 对话、扫码入组、企微、患者端、医生登录本版不做 |
| 患者状态口径 | 系统内用完整生命周期（见下），报表可映射到台账 P7/P8/P9/P11 |
| 服务包价格与订单 | 记录 SKU 价格、签约单号、周期与履约证据；不做支付、不做结算 |
| 心电/体检数据接入 | 粘贴表格导入 + 人工录入；字段按华信接口文档预留 external_id |
| 短信/企业微信通道 | 模板库 + "人工已发"登记；不接网关，不显示已接通 |
| 机构维度 | 引入机构表（医院/分院/社区/乡镇/村站/体检中心），单院也可只建一条 |
| 患者端形态 | 不变，仍为介绍页 |

## 业务路径（本版覆盖的部分）

```
检出记录（心电一张网 / 体检 / 健康筛查 / 卒中筛查 / 门诊 / 住院 / 活动，粘贴导入或人工录入）
  → 运营登记院方判定（记高危 / 标记非高危 + 原因）
  → 建档入组（生成首次触达任务，按 SLA 配置计算截止）
  → 邀约（第一次建立信任 / 第二次种草跟进 / 第三次关怀反馈，结果结构化）
  → 预约（类型 / 科室 / 医生 / 时间 / 渠道）→ 到诊提醒登记 → 到院核验（有效到诊 / 未到诊原因）→ 接诊结果
  → 服务包签约（SKU、单号、周期、知情同意）→ 激活（按随访方案自动生成节点任务）→ 履约 → 结案小结 / 升级
  → 随访 / 异常 / 复诊（沿用 1.3–1.4）+ 短信登记 + 失联升级 + 转诊闭环
  → 十项核心指标、漏斗、按人绩效、日统计、指标字典
```

## 角色

MANAGER、OPERATOR、PLATFORM_ADMIN 与 1.4 相同。机构、活动、SLA、服务包 SKU、随访方案、模板由 MANAGER 维护；OPERATOR 只能操作分配给自己的患者及其检出记录、邀约、预约、服务实例、转诊。院方医生仍是联系人，不登录。

## 功能与验收

| 编号 | 功能 | 可验证结果 |
| --- | --- | --- |
| L01 | 患者池（检出记录） | 按来源类型分池列表；粘贴导入按外部编号幂等；人工新增；记高危/标记非高危必须写院方判定人与依据；非高危池可回看 |
| L02 | 建档入组 | 从检出记录建档：复制基本信息、来源场景、机构、活动；可选关联已有患者（不按手机号自动合并）；建档同时生成 OUTREACH 首次触达任务，截止按 SLA 配置；重复建档拒绝 |
| L03 | 邀约记录 | 一患者多轮，轮次自动递增；结果字典 11 种；接通类结果自动完成待处理的首次触达任务并更新患者"已触达"与最后联系时间；未接通类保留任务并写下次联系时间；按记录/按患者两种视图 |
| L04 | 预约与到诊 | 结构化预约（类型、渠道、时间、科室、医生）；到诊提醒登记；到院核验必须写核验证据并标记有效到诊与接诊结果；未到诊原因字典；关联复诊任务时同步任务状态；患者状态随之变为已预约/已到院 |
| L05 | 患者主档扩展 | 身份证（列表脱敏）、出生日期、地址、家属联系人与电话、住院号/床位、患者类型、来源场景、机构、推荐医生、标签、知情同意（时间/版本/凭证）；生命周期扩展到 10 态 |
| L06 | 患者列表筛选 | 关键字、风险、科室、生命周期、来源场景、机构、负责人、医生、标签、建档区间、最后联系区间、仅逾期、有未处理异常、待复诊 |
| L07 | 患者时间轴 | 就诊记录、任务、联系记录、邀约、预约、短信登记、服务实例、转诊、审计按时间合并分页 |
| L08 | 指标与用药 | 运营可录入体征观察（血压/心率/体重/血糖）形成趋势；用药清单（药名、用法、起止、依从性、来源） |
| L09 | 服务包 SKU | 编号、名称、病种、档位、场景、周期、价格（仅记录）、随访/评估/复查次数、设备、权益、服务时段、内容、合规红线、关联随访方案；草稿/启用/停用 |
| L10 | 随访方案 | 按病种/入口定义节点序列（阶段、偏移天数、任务类型、标题、优先级、要点）；发布后可套用到患者（选锚点记录）；套用幂等 |
| L11 | 服务实例 | 签约（单号、时间、开始日期、知情同意）→ 激活（生成节点任务）→ 到期/结案（阶段小结）/升级（关闭旧实例、建新实例）；履约统计=已完成随访/约定次数 |
| L12 | 联系结果字典 | 联系记录结果扩到 11 种（新增家属接听、患方不合作、死亡、其他）；可填满意度 1–5 与投诉 |
| L13 | 短信与话术模板 | 模板库（短信/话术/企微，按场景）；"人工已发"登记（模板、正文、时间、凭证）进入患者时间轴；不发送 |
| L14 | 失联升级 | 同一患者自上次接通后连续未接通（邀约+联系记录）达到 SLA 配置次数（默认 3）时自动生成 P1 异常"转告家属/社区并确认是否失访"，幂等；运营确认后可把患者置为失访并记录时间 |
| L15 | 异常对象补全 | 触发来源、SLA 截止、确认时间、处置去向、误报；P0/P1 超过 SLA 在列表标红；关闭仍需院方处置凭证 |
| L16 | 转诊 | 发起/接收两向；上转/下转/平转；来源机构与目标机构；SLA 截止；接受→到院→接诊反馈（科室/医生/诊断/处置）→关闭；拒绝需原因 |
| L17 | 机构与活动 | 机构树（类型、上级、联系人）；活动（类型、机构、地点、起止、负责人、目标）；检出、邀约、患者可挂活动；报表按活动出漏斗 |
| L18 | SLA 配置 | 按风险等级配置首次触达小时数、预约天数、到院天数、失联判定次数；MANAGER 可改；建档与转诊按其计算截止 |
| L19 | 任务转交 | 单个任务改负责人并写审计；批量按患者改负责人沿用 1.2 |
| L20 | 十项指标 | 应管理人数、有效触达率、高风险及时处理率、预约率、预约履约率、有效到诊率、入组率、随访完成率、复诊复查完成率、失访率；每项固定分子/分母/目标值，报表页显示口径；无分母显示 -- |
| L21 | 漏斗与按人绩效 | 全局漏斗（检出→高危→邀约→愿意→预约→到院→入组→随访完成→复诊完成）；活动维度漏斗；按运营人员：负责患者、已触达、触达率、预约、有效到诊、到诊转化率、高风险数、待随访数、评级（优秀/良好/合格/待改进） |
| L22 | 日统计与工作台 | 指定日期的 12 项日统计；工作台队列：今日待触达、超 SLA 高危、今日随访、待再次联系、明日到诊提醒、7 天内待复诊、待院方确认、失联待确认 |
| L23 | 指标字典 | 接口返回每个指标的编码、名称、分子、分母、排除规则、目标值；报表与归档快照引用同一份 |

## 状态与枚举

- 患者 `lifecycle`：ENROLLED 已建档待触达 → CONTACTED 已触达 → BOOKED 已预约 → ARRIVED 已到院 → MANAGING 管理中 → REVISIT_DUE 待复诊复查；旁路 PAUSED 暂缓/拒绝、TRANSFERRED 转外院管理、LOST 失访、CLOSED 结案。旧值 ENROLLED/MANAGING/PAUSED/CLOSED 含义不变。状态由动作推进（邀约接通→CONTACTED，预约→BOOKED，到院→ARRIVED，服务实例激活→MANAGING），也可人工修改。
- 患者 `source_scene`：ECG_NETWORK 心电一张网、EXAM 体检、COMMUNITY_SCREENING 社区筛查、PRIMARY_REFERRAL 基层上转、OUTPATIENT 门诊、INPATIENT 住院、DISCHARGE 出院、CAMPAIGN 活动、MANUAL 人工。`patient_type`：OUTPATIENT/INPATIENT/DISCHARGED/UNKNOWN。
- 检出记录 `source_type`：ECG_NETWORK/EXAM/HEALTH_SCREENING/STROKE_SCREENING/OUTPATIENT/INPATIENT/CAMPAIGN；`pool_status`：NEW → HIGH_RISK | NON_HIGH_RISK → ENROLLED；DISCARDED 作废。
- 邀约 `result`：WILLING 愿意就诊、UNDECIDED 犹豫、REFUSED 拒绝、ALREADY_TREATED 已治疗、TREATED_ELSEWHERE 外院就诊、NO_ANSWER 无人接听、BUSY 忙线、WRONG_NUMBER 号码错误、FAMILY_ANSWERED 家属接听、DECEASED 死亡、OTHER 其他。接通类 = 除 NO_ANSWER/BUSY/WRONG_NUMBER 之外。`method`：PHONE/SMS/WECHAT/IN_PERSON/OTHER。`planned_visit_mode`：SELF/FAMILY_ESCORT/GREEN_CHANNEL/UNDECIDED。
- 预约 `appointment_type`：OUTPATIENT/EXAM/REVISIT/INPATIENT/SPECIALIST_CLINIC；`channel`：GREEN_CHANNEL/STAFF_BOOKED/SELF_BOOKED/ONLINE；`status`：BOOKED → REMINDED → ARRIVED → COMPLETED，或 NO_SHOW / CANCELLED；`no_show_reason`：DISTANCE/COST/NO_SLOT/FORGOT/EXTERNAL_HOSPITAL/REFUSED/ILLNESS/OTHER；`outcome`：OUTPATIENT_TREATED/EXAM_ORDERED/ADMITTED/REFERRED/NO_ACTION/OTHER。
- 任务 `task_type` 新增 OUTREACH 首次触达：PENDING → IN_PROGRESS → COMPLETED / CANCELLED；由接通类邀约完成；不需要院方审核。
- 联系记录 `result`：CONNECTED 及失败类 NO_ANSWER/BUSY/WRONG_NUMBER/REFUSED/IDENTITY_UNVERIFIED/FAMILY_ANSWERED/NOT_COOPERATIVE/DECEASED/OTHER。
- 异常 `alert_source`：STAFF/PATIENT_REPORT/OBSERVATION/ECG/LOST_CONTACT/RULE；`disposition`：OUTPATIENT/EMERGENCY/INPATIENT/OBSERVE/FALSE_ALARM/OTHER。
- 服务包 `tier`：BASIC/STANDARD/PREMIUM；`scene`：POST_VISIT/POST_DISCHARGE/POST_SURGERY/SCREENING/LONG_TERM；`status`：DRAFT/ACTIVE/RETIRED。
- 服务实例 `status`：PENDING_ACTIVATION → ACTIVE → EXPIRED / CLOSED / UPGRADED。
- 随访方案 `status`：DRAFT/ACTIVE/RETIRED；节点 `task_type`：FOLLOWUP/REVISIT；`stage` 自由编码（ENROLLMENT/D3/D7/D14/D30/M3/M6/Y1/CUSTOM）。
- 转诊 `direction`：OUTBOUND 发起/INBOUND 接收；`referral_type`：UPWARD/DOWNWARD/LATERAL；`status`：INITIATED → ACCEPTED → ARRIVED → FEEDBACK_RECORDED → CLOSED，或 REJECTED。
- 机构 `org_type`：HOSPITAL/BRANCH/COMMUNITY/TOWNSHIP/VILLAGE/EXAM_CENTER/OTHER。活动 `campaign_type`：DAILY_INVITATION/EARLY_INTERVENTION/CLINIC_EVENT/SCREENING；`status`：PLANNED/ACTIVE/CLOSED。
- 模板 `channel`：SMS/SCRIPT/WECHAT；`scene`：FIRST_CONTACT/HIGH_RISK/URGENT/FAMILY/ARRIVAL_REMINDER/FOLLOWUP_REMINDER/REVISIT_REMINDER/NO_SHOW/HESITANT/REFUSED/COMPLAINT/OTHER。短信登记 `channel`：SMS/WECHAT/PHONE_NOTE。
- 用药 `status`：ACTIVE/STOPPED；`adherence`：GOOD/PARTIAL/POOR/UNKNOWN；`source`：HOSPITAL_RECORD/PATIENT_REPORT/STAFF。

## 十项指标口径（统计区间 [from, to]，按北京时间）

| 编码 | 指标 | 分子 | 分母 | 目标 |
| --- | --- | --- | --- | --- |
| MANAGED | 应管理人数 | 区间末仍在管（lifecycle 不在 CLOSED/TRANSFERRED）的患者数 | 基数不计算 | -- |
| REACH_RATE | 有效触达率 | 区间内到期的 OUTREACH 任务中，有接通类邀约或接通联系记录的患者数 | 区间内到期的 OUTREACH 任务患者数 | 95% |
| HIGH_RISK_TIMELY | 高风险及时处理率 | 高/重点风险 OUTREACH 任务在 SLA 截止前接通 | 区间内到期的高/重点风险 OUTREACH 任务 | 95% |
| BOOKING_RATE | 预约率 | 区间内新建预约的去重患者数 | 区间内被有效触达的去重患者数 | 60% |
| BOOKING_KEPT | 预约履约率 | 区间内预约时间落在区间且到院（ARRIVED/COMPLETED） | 区间内预约时间落在区间且未取消 | 50% |
| EFFECTIVE_ARRIVAL | 有效到诊率 | 区间内到院且标记有效到诊的去重患者数 | 区间内被邀约的去重患者数 | 50% |
| ENROLL_RATE | 入组率 | 区间内激活的服务实例去重患者数 | 区间内有效到诊的去重患者数 | 40% |
| FOLLOWUP_DONE | 随访完成率 | 区间内到期且完成的随访任务 | 区间内到期且未取消的随访任务 | 90% |
| REVISIT_DONE | 复诊复查完成率 | 区间内到期且完成的复诊任务 | 区间内到期且未取消的复诊任务 | 75% |
| LOST_RATE | 失访率 | 区间内置为失访的患者数 | 应管理人数 | 5% 以下 |

分母为 0 显示 --。归档快照连同当时的指标字典版本一起保存。

## 数据模型（新增/变更，MySQL；字段含义详见 docs/architecture/health-mvp.md 1.5 节）

- `patient` 新增：id_card、birth_date、address、emergency_contact、emergency_phone、inpatient_no、bed_no、patient_type、source_scene、org_id、referrer_id、last_contact_at、lost_since、consent_version、consent_evidence、tags；`service_package_id` 改为引用 `service_package`。
- `care_task` 新增：alert_source、sla_due_at、ack_at、disposition、appointment_id、enrollment_id、plan_node_seq、reminder_sent_at；`task_type` 增加 OUTREACH。
- `contact_attempt` 新增：satisfaction、complaint。
- 新表：care_org、campaign、screening_record、invitation、appointment、service_package、followup_plan、followup_plan_node、service_enrollment、referral、message_template、message_log、medication、sla_config。

## 页面路径

管理端新增：/screening 患者池、/invitations 邀约记录、/appointments 预约到诊、/packages 服务包与随访方案、/referrals 转诊、/settings 增加机构 / 活动 / SLA / 模板四个分区；/patients/:id 增加时间轴、邀约、预约、服务实例、用药、指标、短信登记、标签与同意；/followups、/alerts、/revisits 抽屉增加短信登记、转交、异常处置字段、结构化预约；/reports 增加十项指标、漏斗、活动漏斗、按人绩效、日统计、指标字典；/workbench 增加八个队列。原型见 ../demo-static/web/admin/。

## 不做与边界

不接心电设备、HIS、短信网关、企微；不做分成结算与订单支付；不做自动风险判定（判定人与依据为人工登记）；不做患者端；不给医生账号。所有自动生成的任务与升级都是运营待办，不代表医学结论。演示数据全部虚构。
