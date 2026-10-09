# 2.2 连续管理与服务摘要 API

继承 [2.1 受邀接口](patient-service-center-2.1.md)。所有新增接口 POST、JSON snake_case、ApiResponse 包装、Jwttoken 鉴权；请求专属 DTO，返回 DTO。医院与患者访问范围由服务端校验，平台账号不可访问患者。

| 管理端路径（前缀 /boruikang/admin） | 请求字段 | 结果 / 约束 |
| --- | --- | --- |
| /continuity/query | patient_id | 该患者全部长期计划 |
| /continuity/summary | patient_id | 团队、报告、旅程、任务、工单、预约、指标、计划 |
| /continuity/save | id?, version?, patient_id, baseline, goals, patient_instructions, next_review_date, evidence | 新建或调整；AF；增加 revision 并设 PENDING；编辑必须携带 version |
| /continuity/approve | id, version, approve, evidence | 当前责任医生批准 / 退回；审计保存快照 |
| /continuity/link | id, version, journey_id, evidence | 同院同患者旅程；相同关联不重复添加 |
| /continuity/review | id, version, journey_id?, summary, evidence, patient_message, assessment, next_review_date | 责任医生复盘；assessment=ON_TRACK / NEEDS_ADJUSTMENT / UNKNOWN；关联旅程须先入计划 |
| /continuity/transition | id, version, action, evidence | PAUSE / RESUME / CLOSE；结束仅责任医生 |
| /service_center/feedback_query | patient_id | 最近 50 条反馈与当前工单版本 |
| /service_center/feedback_reply | id, case_version, patient_reply | 工单 RESOLVED / CLOSED 后发布；临床必须责任医生，服务和投诉为运营 / 护士；不替代反馈核验 |

计划响应：id、patient_id、disease_code、status、approval_status、baseline、goals、patient_instructions、next_review_date、revision、version、reviewer_id、reviewed_at、journey_ids、history、history_count。history 每条含 kind / revision / summary / evidence / patient_message / assessment / journey_id / actor_id / next_review_date / created_at；最新 100 条，数据库全量保存。PLAN_SAVED、APPROVED、REJECTED 的 summary 是内容快照 JSON 文本。

2.1 portal / register / feedback 结果扩展 continuous_plans（id、disease、instructions、next_review_date、last_feedback）；仅 ACTIVE 且当前责任医生与当前授权下 APPROVED。feedback 扩展 handler、next_step、patient_reply、replied_at，续签后只查同一 contact_id + hospital_id + patient_id 的历史。患者反馈仍以 entry_id + request_id 去重，同键不同内容返回 409。

issue.path 改为 health.user-url + /service#token，可直接复制；须配置正确患者端域名，不能使用管理端域名。患者入口在人工核实时记录 service_consent_key；授权变化后旧令牌失败。新授权需新入口核实与计划重审。

并发：先锁患者，再锁计划；version 条件更新防覆盖。只允许一个未结束 AF 计划。反馈发布先锁患者再锁工单，增加 case.version；回复审计只追加。状态非法返回 400，不可见 404，权限 403，旧版本 409。患者端响应沿用 no-store 和限流。

[机器契约](../contracts/continuity-2.2.json) 从 Java DTO / Controller 与 SQL 生成。新增三表 continuous_care_plan / continuous_care_journey / continuous_care_review；旧受邀表加四列。升级路径见 [SQL 说明](../../sql/README.md)。
