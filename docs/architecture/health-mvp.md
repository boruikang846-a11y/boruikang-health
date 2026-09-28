# HEALTH-MVP-1.1 技术设计

需求基线：[health-mvp.md](../feature/health-mvp.md)。原型先于本设计落盘，代码按本设计实现。图示：[服务闭环](../feature/health-flow.html)。

## 工程与运行

骨架来源 bgssai-skeleton，Java 21 / Spring Boot 4.1.0 / MyBatis 4 / PageHelper / React 18 / Ant Design 5 / Vite 7，管理端 React Router 7（仍为 React 18）。前端依赖升级至 npm audit 无已知告警的补丁线，移除未使用的网络和状态库。保留 admin/admin 与 admin/admin-react、user/user 与 user/user-react 结构；增加 common Maven 模块，承载同一医患业务域的持久层和服务，避免两端维护两套状态机。两端 Controller 和静态前端独立打包；common 不单独部署。

MySQL 8 为部署数据库，H2 MySQL 模式仅供本地自包含演示和集成测试，默认 local。MySQL 权威结构在 sql/DDL.sql，种子在 sql/DML.sql（业务模板）与 sql/dev/DML.sql（虚构账号和患者）。演示库不得含原始参考中的真实个人信息。非 local 环境在配置不完整时失败关闭。

由于用户指定 admin/user 同机（46.250.162.15，私网 192.168.0.173），各进程监听 8080，分别绑定 127.0.0.2 和 127.0.0.3，Nginx 按域名反代，以满足骨架端口规范且避免冲突。dev/prod 都从 develop 发布，profile 区分环境。部署委托中央 Jenkins，应用不新增另一套部署编排。

## 数据模型

所有表都有规范要求的 id / del_flag / creator / modifier / gmt_create / gmt_modified。单数 snake_case，MyBatis Entity / Example / Mapper XML 手工维护。

| 表 | 职责与关键字段 |
| --- | --- |
| health_account | username, password, real_name, role_code, hospital_id, current_session_id, enabled；开发期口令口径继承骨架，发布限制见 security |
| patient | account_id 唯一绑定，hospital_id, name, gender, age, phone, department, disease, risk_level, lifecycle, doctor_id, owner_id, channel_id, service_package_id, consent_at, note, version |
| care_task | 单一任务中心：patient_id, hospital_id, task_type, title, priority, status, assignee_id, doctor_id, due_at, record_id, sop_id, draft_text, draft_origin, approved_text, review_note, reviewer_id, reviewed_at, completed_at, outcome, evidence, request_key, version |
| care_record | patient_id, hospital_id, record_type, occurred_at, content, medication_cycle_days, next_visit_date, systolic, diastolic, heart_rate, weight, glucose, needs_contact, source_system, external_id |
| care_message | patient_id, hospital_id, task_id, sender_id, sender_role, direction, content；已审核建议的人工联系留痕，不代表外部发信 |
| knowledge_entry | hospital_id, kind, department, title, content, source, version, status, reviewer_id, reviewed_at, service_days, followup_count |
| intake_channel | hospital_id, title, source, department, doctor_id, owner_id, token, active |
| audit_event | hospital_id, patient_id, actor_id, action, resource_id, before_state, after_state, detail；只追加，无修改/删除 API |
| integration_config | hospital_id, provider, endpoint, model_name, secret, enabled；业务配置落库，响应不返回密钥 |

任务共用一个状态机服务，但按 task_type 强制允许动作，不能靠任意 status 覆盖。医生和负责人从患者记录绑定，任务保存当前医生/负责人，审计保留分派历史。修改负责人限制在本院有效账号并记录审计。

## 权限、事务与并发

登录签名 JWT 带账号/角色/sid；每次请求校验数据库 enabled、current_session_id、医院与角色；不相信客户端 role_code 或 patient_id 所有权。管理端登录限制医护或平台角色；查询始终 hospital_id + doctor_id/owner_id 范围。用户端仅公开介绍，不提供账号接口。

写任务要求 version，以 id + hospital_id + version + 原状态为 Example 条件 updateByExampleSelective，受影响行非 1 返回 HTTP 409。触达记录时条件改 CONTACTED 与写 message/audit 同一事务；结果完整提交或整体回滚。患者账号绑定与任务 request_key 由唯一约束保护；人工建档仍由医护核对重复患者；重复 key 只允许同患者/同请求类型幂等返回，否则拒绝。审计失败导致临床变更回滚。

写操作 actor 从身份上下文取得。敏感正文和密钥不写应用日志。每个服务入口显式日志记录动作与 ID。患者端不提供业务记录查询。

## 建议来源与外部 AI

TEMPLATE：使用已发布 SOP 内容 + 患者已有记录摘要组织问询草稿；标注模板来源。

审核上下文按 task.record_id 精确查原记录，并按 task_id 查相关咨询消息；不以最近记录代替原始依据。

AI：管理员显式启用 TokenHub 兼容端点和模型后可调用。请求仅包含原记录类型、原始疗程天数、复诊日期及已发布 SOP，不发送自由文本病历。SOP 需审核，禁止混入患者身份信息。限制超时和输出长度，失败返回错误，禁止自动生成触达事实。将外部内容作为不可信建议，所有内容进入待审核流程。AI 不在数据库事务内调用：先读取范围/版本，网络返回后以原 version 保存；过期则拒绝。

## 统计

所有列表 PageHelper 紧贴 selectByExample；页面大小最多 100。统计 countByExample，无 SQL JOIN、自定义聚合或内存分页。报告按 [from_date 00:00, to_date + 1 day 00:00) Asia/Shanghai 统计。应随访=区间内到期的 FOLLOWUP（排除取消）；完成=这些任务中 COMPLETED；按时=完成时间不晚于截止时间（必要时分批读取统计）；到院=区间内到期的 REVISIT 且 ARRIVED/COMPLETED。指标始终同一数据权限与口径，零分母返回 null。

## 医院交接

HIS/EMR 字段参考《慢病系统所需数据说明》：医院患者号、病历类型、就诊/出院时间、科室、主治医生、摘要、用药周期、建议复诊日期、来源记录 ID。医院提供数据授权、接口与字段字典。身份映射、重复/乱序事件处理、撤销事件语义须医院联调后开启。

企微与公众号：企业主体、AppID、授权回调、签名与消息加解密由医院提供；UnionID 是可缺省的渠道身份，不能替代 patient_id 或就诊证据。当前渠道二维码仅打开公开介绍，后台可记录人工联系，无患者 Web 消息或医院通道发信。医生周报在系统生成并可打印，外部投递待接通后单独验收。

## 接续实现细则

患者更新在事务内先锁定患者行，再逐批读取全部任务，按原 version 条件更新归属与 version；责任医生变更时将 PENDING_REVIEW/APPROVED 退回 IN_PROGRESS 并清空批准正文。读写任务权限使用当前患者归属；doctor_id/assignee_id 表示当前责任归属，历史审核人和执行记录保存在 reviewer_id 与审计中。内部 note 只在授权医护详情中可见。前端会话存于 sessionStorage，401 清理后返回登录，409 保留错误并允许刷新重新处理。

所有任务写入在短事务内先以 PatientExample 锁定患者行，再条件更新任务，防止分派与创建/触达记录同时发生时越权或漏同步。主键锁查询最多返回一行，不叠加 PageHelper；分页仍用于列表。

## 2026-09-28 用户端范围调整

患者端部署公开介绍 SPA，不注册任何 /bgssai/user 业务 Controller。只保留基础健康检查与静态页面服务。前端不调用患者 API，不储存会话；只记语言偏好。企业微信、小程序、患者 Web 均为规划渠道。管理端 /tasks/contact 仅保存人工完成的联系证据，更新 CONTACTED 并写 STAFF_TO_PATIENT 沟通留痕，不调用任何发送通道，account_id 是否存在不影响人工联系记录。患者消息/指标服务保留在共享领域中的已有基础代码，不在 user 部署中暴露，后续需求另行评审。
