# 1.6 医生、护士登录接口与数据契约

沿用 `/bgssai/admin` 前缀、`Jwttoken` 头、`ApiResponse{code,message,success,result}` 与分页 `result={items,page_num,page_size,total_size}`；字段 snake_case；POST 参数全部在 body；每个接口一个 Controller。`经理`=MANAGER，`运营`=OPERATOR，`护士`=NURSE，`医生`=DOCTOR。所有写操作追加审计，乐观锁按 `version`。需求见 [1.6 需求](../feature/clinical-login-1.6.md)。

## 角色与范围

| 角色 | 可见患者与任务 | 可调用的写接口 |
| --- | --- | --- |
| 经理 | 全院 | 全部运营写接口、配置、医护账号 |
| 运营、护士 | `patient.owner_id` / `care_task.assignee_id` 为本人 | 建档、记录、任务执行（领取、起草、提交审核、联系、尝试、复诊核实、升级异常）、邀约、预约、签约、转诊、用药、短信登记、患者池 |
| 医生 | `patient.doctor_id` / `care_task.doctor_id` 为本人 | 只读档案与各页签明细；只能调用 `/tasks/review`、`/tasks/acknowledge`、已升级异常的 `COMPLETE`、`/records/review`、`/knowledge/publish` |
| 平台管理员 | 无 | 接入设置 |

台账列表（患者池、邀约、预约、签约、转诊、短信登记、运营统计与归档）不带 `patient_id` 时医生返回 403；带 `patient_id` 时按患者可见范围返回，供档案页签只读展示。越出范围的单条资源返回 404，无权限的动作返回 403。

## 账号

| 接口 | 权限 | 契约 |
| --- | --- | --- |
| `POST /login` | 后台角色 | 管理端放行 MANAGER、OPERATOR、NURSE、DOCTOR、PLATFORM_ADMIN；返回 `jwt_token user_id real_name role_code hospital_id`；新登录使旧会话失效 |
| `POST /password` | 已登录账号 | `old_password new_password(8–64)`；原密码错误或新旧相同返回 400；成功后旧会话失效，返回新的登录结果 |
| `POST /accounts/query` | 经理 | `page size role_code? keyword? enabled?` → `items[]{id username real_name role_code department enabled gmt_create}`；不返回口令与会话 |
| `POST /accounts/create` | 经理 | `username`（`[a-zA-Z0-9_.-]{3,40}`，全局唯一）`real_name role_code(DOCTOR/NURSE/OPERATOR) department password(8–64)`；医生、护士科室必填 |
| `POST /accounts/status` | 经理 | `id enabled`；只能改本院医生、护士、运营人员；停用或启用都结束该账号当前登录 |
| `POST /accounts/reset-password` | 经理 | `id password(8–64)`；结束该账号当前登录 |
| `GET /clinicians` | 后台业务角色 | 本院医生账号 `[{id name department active}]`，含已停用（仅用于显示历史姓名，选择时只取 `active`） |
| `GET /staff` | 后台业务角色 | 本院运营主管、运营人员、护士 `[{user_id real_name role_code hospital_id}]` |

`POST /clinicians/create` 已删除；院方医生通过 `/accounts/create` 开通账号。

## 医生工作

| 接口 | 权限 | 契约 |
| --- | --- | --- |
| `GET /doctor/workbench` | 医生 | `patient_count high_risk_count pending_review_count unread_report_count pending_result_count escalated_alert_count as_of`，均按本人负责患者统计 |
| `POST /records/reports` | 医生 | `page size viewed? record_type?(DISCHARGE/OUTPATIENT/EXAM) patient_id?` → `items[]{id patient_id patient_name(脱敏) department disease record_type occurred_at content medication_cycle_days next_visit_date source_system external_id doctor_viewed_at doctor_viewer_id doctor_opinion gmt_create}`；体征记录不在列表 |
| `POST /records/review` | 责任医生 | `id opinion?`；首次提交写入已阅时间与本人；已阅后再次提交只更新意见，此时 `opinion` 必填；体征记录返回 400；非本人负责患者返回 404 |
| `POST /tasks/review` | 责任医生 | `id version approved approved_text? review_note?`；通过时 `approved_text` 必填（可改写），退回时 `review_note` 必填；审核人与审核时间由系统写入；同时把任务关联报告记为已阅；其他角色 403 |
| `POST /tasks/acknowledge` | 责任医生 | `id version feedback`；只对已完成且待查收的随访；查收时间由系统写入 |
| `POST /tasks/transition` | 见说明 | 医生只能对已升级（ESCALATED）的异常执行 `COMPLETE`，必须 `disposition outcome`；运营与护士执行 `ESCALATE`；失联异常（`alert_source=LOST_CONTACT`）由运营与护士在 PENDING / IN_PROGRESS 直接 `COMPLETE`，必须 `outcome evidence`；运营与护士不能关闭其他异常 |
| `POST /knowledge/publish` | 医生 | `id version`；发布人与时间由系统写入；经理与运营返回 403 |
| `POST /tasks/query` | 后台业务角色 | 新增 `handover_status(PENDING/ACKNOWLEDGED)` 筛选；医生只看到 `doctor_id` 为本人的任务 |

## 字段与表变化

- `TaskResponse` 删除 `review_channel review_evidence handover_channel handover_evidence`；`reviewer_id reviewed_at doctor_feedback acknowledged_at` 由登录医生写入。
- `KnowledgeResponse` 删除 `review_channel review_evidence`。
- `RecordResponse` 增加 `doctor_viewed_at doctor_viewer_id doctor_opinion`。
- 删除 `hospital_clinician` 表；`patient.doctor_id / referrer_id`、`care_task.doctor_id / reviewer_id`、`intake_channel.doctor_id`、`appointment.clinician_id`、`referral.feedback_clinician_id`、`knowledge_entry.reviewer_id` 均指向医生账号。
- `health_account` 增加 `department`；`care_record` 增加 `doctor_viewed_at doctor_viewer_id doctor_opinion`。

## 审计动作

`DOCTOR_APPROVED`、`DOCTOR_RETURNED`、`DOCTOR_ACKNOWLEDGED`、`REPORT_VIEWED_BY_DOCTOR`、`REPORT_OPINION_UPDATED`、`DOCTOR_KNOWLEDGE_PUBLISHED`、`STAFF_ACCOUNT_CREATED`、`STAFF_ACCOUNT_ENABLED`、`STAFF_ACCOUNT_DISABLED`、`STAFF_PASSWORD_RESET`；异常关闭沿用 `TASK_COMPLETE`。审计不记录口令。
