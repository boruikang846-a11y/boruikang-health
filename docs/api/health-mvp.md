# HEALTH-MVP-1.2 API 契约

所有响应 `{code,message,success,result}`，成功 code="0"。请求 JSON snake_case；鉴权头 `Jwttoken`。HTTP 401 失效会话，403 无权，404 不存在/不可见资源，409 状态或版本冲突，400 校验错误，429 限流。分页 result 为 `{items,page_num,page_size,total_size}`，请求 page 从 0 起、size 1–100。

端前缀 A=`/bgssai/admin`。每个端点独立 Controller、独立请求 DTO（通用 IdRequest 除外）。写操作身份仅从令牌获取；写入时间按服务器处理时间，发生时间由记录字段提供。

| 方法与路径 | 请求 / 主要响应 |
| --- | --- |
| POST A/login | identifier,password → jwt_token,user_id,real_name,role_code |
| POST A/logout | 空 body；失效 current_session_id |
| GET A/me | 当前身份 |
| GET A/dashboard | 真实可见数据的工作台汇总 |
| POST A/patients/query | page,size,keyword,risk_level,department |
| POST A/patients/create | name,gender,age,phone,department,disease,doctor_id,owner_id,note |
| GET A/patients/{id} | 患者详情 |
| POST A/patients/update | id,version,doctor_id,owner_id,lifecycle,risk_level,note,service_package_id |
| GET A/staff | 同院医生/护士/运营可分配账号（不含凭据） |
| POST A/tasks/query | page,size,patient_id,task_type,status,priority,overdue |
| GET A/tasks/{id} | task,record,messages；供审核时核对关联病历与原始咨询 |
| POST A/tasks/create | patient_id,task_type,title,priority,due_at,record_id,sop_id,request_key |
| POST A/tasks/claim | id,version |
| POST A/tasks/draft | id,version,sop_id,mode=TEMPLATE/AI/MANUAL,draft_text（人工编辑可选） |
| POST A/tasks/submit-review | id,version |
| POST A/tasks/review | id,version,approved,approved_text,review_note；仅绑定医生 |
| POST A/tasks/contact | id,version,evidence；记录人工联系证据，正文取数据库 approved_text，不发送网络消息 |
| POST A/tasks/transition | id,version,action, outcome,evidence；COMPLETE/ESCALATE/BOOK/ARRIVE/NO_SHOW/CANCEL，按任务类型校验 |
| POST A/records/query | page,size,patient_id,record_type |
| POST A/records/create | patient_id,record_type,occurred_at,content,medication_cycle_days,next_visit_date；自动创建关联随访，复诊日期非空时创建复诊任务 |
| POST A/messages/query | page,size,patient_id；查询人工沟通留痕，无患者发送接口 |
| POST A/audits/query | page,size,patient_id |
| POST A/knowledge/query | page,size,kind,keyword,status |
| POST A/knowledge/save | id 可空,title,kind,department,content,source,version,service_days,followup_count；保存为新/更新草稿；SOP 仅 MANAGER，其他类型 MANAGER/DOCTOR；更新不可变更 kind |
| POST A/knowledge/publish | id,version；SOP 仅 MANAGER 发布，EDUCATION/PACKAGE 仅 DOCTOR 审核发布 |
| GET A/channels | 本院分页渠道列表 |
| POST A/channels/create | title,source,department,doctor_id,owner_id |
| POST A/channels/toggle | id,active |
| POST A/reports/weekly | from_date,to_date；真实统计，最长 93 天 |
| GET A/integrations | 接入状态，secret 仅返回 configured 布尔 |
| POST A/integrations/save | provider=AI,endpoint,model_name,secret,enabled；仅 PLATFORM_ADMIN |

完整字段与状态以 PRD、PAGE-FLOW 和 Request/Response DTO 为共同契约。临床数值限制仅为输入合理范围，不是诊断阈值；后端不自动下风险诊断。
HEALTH-MVP-1.2：用户端仅公开介绍，没有 /bgssai/user 业务 API。旧患者 API 全部返回 404。CONTACTED 表示医护确认的人工联系记录，不能据此宣称任何患者通道已接通。


## 医院接口模拟契约

- GET A/hospital/status：mode=MOCK/DISABLED, real_connected=false, source_system=HOSPITAL_MOCK；医护可读。
- POST A/hospital/mock/query：{scenario:NORMAL/EMPTY/UNAVAILABLE} → {source_system,scenario,patients:[{hospital_patient_id,name,gender,age,phone,department,disease,records:[{external_id,record_type,occurred_at,content,medication_cycle_days,next_visit_date}]}]}。MANAGER 专用，模拟医院的一个有界响应批次，不是数据库列表分页。
- POST A/hospital/sync：{scenario,doctor_id,owner_id} → {source_system,created_patients,existing_patients,created_records,skipped_records,patient_ids}。MANAGER 专用；要求本院有效责任医生与运营/护理负责人。503 表示模拟接口不可用，禁用模式 409，无同步副作用。
- PatientResponse 新增 source_system（MANUAL/HOSPITAL_MOCK）、hospital_patient_id；RecordResponse 新增 external_id。来源 ID 保留用于追溯，不作为患者权限凭据。
