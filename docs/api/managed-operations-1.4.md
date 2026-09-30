# 1.4 托管运营接口与数据契约

沿用 `/bgssai/admin`、`Jwttoken` 和现有 `ApiResponse`；请求/响应字段用 snake_case。只有 `MANAGER`、`OPERATOR`、`PLATFORM_ADMIN` 能登录管理端；平台账号仍只可管理接入配置。旧 `DOCTOR`、`NURSE` 账号即使存在也不能登录。

| 接口 | 权限 | 契约/作用 |
| --- | --- | --- |
| `GET /clinicians` | 经理、运营 | 返回本医院院方联系人 `id/name/department/active`；不是登录账号 |
| `POST /clinicians/create` | 经理 | 必填 `name`, `department`；同医院同名同科室重复返回 400 |
| `GET /staff` | 经理、运营 | 仅我方经理和运营账号，用于任务负责人 |
| `POST /tasks/review` | 经理、运营 | 既有 `id/version/approved/approved_text/review_note` 外，必填 `review_channel/review_evidence/reviewed_at`；院方责任医生来自患者联系人绑定；存储真实线下审核回执 |
| `POST /tasks/contact` | 经理、运营 | 仅在当前院方联系人审核凭证有效时允许人工联系 |
| `POST /tasks/acknowledge` | 经理、运营 | 必填 `id/version/feedback/channel/evidence/acknowledged_at`；表示运营人员收到院方实际反馈并登记 |
| `POST /knowledge/publish` | 经理 | 必填 `id/version/reviewer_id/review_channel/review_evidence/reviewed_at`；记录院方内容审核依据 |
| `POST /patients/update` | 经理、运营 | 变更 `risk_level` 时必填 `risk_evidence`；医生绑定指向 `hospital_clinician.id` |

渠道值为 `PHONE`, `IN_PERSON`, `HOSPITAL_SYSTEM`, `SIGNED_DOCUMENT`, `MANUAL_OTHER`。审核、反馈时间不能在未来，也不能早于对应任务或内容创建时间。乐观锁仍按 `version` 检查；事件保留操作账号和院方联系人两种身份，不混同。异常关闭必须记录院方临床处置依据。

SQL 全量发版顺序：`sql/DDL.sql` → `sql/DML.sql` → `sql/dev/DML.sql`。本地 H2 对应 `*-local.sql`。新表 `hospital_clinician` 不存口令；`care_task` 的 `review_channel/review_evidence/handover_channel/handover_evidence` 和知识条目审核凭证字段保留人工交接记录。演示 DML 只建我方登录账号，院方联系人独立建档。
