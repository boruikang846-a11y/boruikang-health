# HEALTH 2.0 页面与 API 映射

当前全量口径见 [同步基线](../contracts/README.md)，全旅程字段及 Controller 见 [生成契约](journey-2.0.md)。下方 1.x 表保留兼容接口，角色和 SOP 的历史表述按 1.6 / 2.0 修正。

前缀 A=/boruikang/admin。页面路径由各端 PAGE-FLOW.html 维护。

| 页面 | API | 操作 |
| --- | --- | --- |
| 管理端 /overview | 无业务 API | 公开 HTML 系统关系图、角色、报告依据与流程；登录页和侧栏均可达 |
| 管理登录 | A/login、A/me、A/logout | 账号登录、会话恢复、退出 |
| workbench | A/dashboard、A/tasks/query | 汇总、优先待办、跳转处理 |
| patients、patients/:id | A/patients/query、create、update、A/patients/{id}、A/staff | 建档、分派、医生分层 |
| patients/:id 时间轴 | A/records/query、create、A/messages/query、A/audits/query | 原记录、人工沟通与审计 |
| followups、alerts、revisits | A/tasks/query、A/tasks/{id}、create、claim、draft、submit-review、review、contact、transition | 版本保护的任务处理抽屉 |
| knowledge | A/knowledge/query、save、publish | 服务内容草稿、责任医生审核发布宣教；正式 SOP 是系统外使用流程 |
| channels | A/channels、A/channels/create、toggle | 经理维护渠道，二维码本地生成 |
| reports | A/reports/weekly | 日期范围统计、浏览器打印 |
| hospital | A/hospital/status、mock/query、sync、A/staff | 经理预览/同步虚构医院数据、查看幂等结果 |
| settings | A/integrations、A/integrations/save | 接入状态；运营主管或平台管理员保存 DeepSeek 模型、API Key 与启用状态（端点固定），密钥不回显 |
| 用户端 /、/join/:token | 无 | 系统全貌、角色、出院报告依据、三模式规划、页内导航与语言切换 |

MANUAL/TEMPLATE/AI 均生成待审核草稿。列表隐藏内部 note，授权医护详情可查看。所有查询失败必须显示错误和重试，不用零值冒充统计结果。报告打印只包含当前已加载范围。

## 1.6 医生、护士登录新增映射

| 页面 | API | 操作 |
| --- | --- | --- |
| 登录、顶栏修改密码 | A/login、A/me、A/password | 医生进入 /doctor，其他角色进入 /workbench；改密后换发新登录 |
| doctor（医生工作台） | A/doctor/workbench、A/tasks/query、A/records/reports | 四个待办数与三个短清单 |
| doctor/reviews、doctor/results、doctor/alerts | A/tasks/query（status、handover_status、task_type）、A/tasks/{id}、A/tasks/review、acknowledge、transition | 审核通过或退回、查收反馈、异常处置 |
| doctor/reports、patients/:id 就诊记录页签 | A/records/reports、A/records/review、A/records/query | 待阅 / 已阅筛选，确认已阅与写意见 |
| patients、patients/:id（医生） | A/patients/query、A/patients/{id} 及各页签查询 | 只读；不显示建档、录入、邀约、预约、签约、转诊、联系按钮 |
| knowledge（医生：宣教审核） | A/knowledge/query、A/knowledge/publish | 医生审核发布草稿 |
| accounts（运营主管） | A/accounts/query、create、status、reset-password | 开通、停用 / 启用、重置密码 |

## 1.5 运营台账新增映射

| 页面 | API | 操作 |
| --- | --- | --- |
| workbench 队列 | A/reports/workbench | 八个队列计数与跳转 |
| screening | A/screenings/query、create、import、judge、enroll、A/orgs、A/campaigns/query、A/staff、A/clinicians | 患者池录入、粘贴/文件导入（1.8 模板、校验、预览确认，复用 import）、判定、建档入组 |
| invitations、patients/:id 邀约页签 | A/invitations/query、create、A/templates/query | 逐轮邀约登记与话术参考 |
| appointments、patients/:id 预约页签、任务抽屉结构化预约 | A/appointments/query、create、transition | 预约、提醒、到院、爽约、取消、结果 |
| packages | A/packages/query、save、status、A/plans/query、save、status、A/enrollments/query、create、transition | 服务包 SKU、随访方案节点、签约实例生命周期 |
| referrals、patients/:id 转诊页签 | A/referrals/query、create、transition、A/orgs | 转诊四步与反馈 |
| settings 机构/活动/SLA/模板 | A/orgs、orgs/save、A/campaigns/query、save、A/sla、sla/save、A/templates/query、save | 经理维护配置 |
| patients/:id 扩展 | A/patients/timeline、consent、A/medications/query、save、A/message-logs/query、create、A/records/observation | 时间轴、同意、用药、已发消息、代录指标 |
| followups、alerts、revisits 抽屉 | A/tasks/reassign、A/message-logs/create、A/appointments/create；transition 增加 disposition | 转交、短信登记、结构化预约、处置去向 |
| reports 扩展 | A/reports/metrics、funnel、operators、daily、metric-dictionary | 十项指标、漏斗、按人绩效、日统计、字典 |


## 1.8 文件导入

| 页面 | API | 行为 |
| --- | --- | --- |
| patients | A/patients/import、A/staff、A/clinicians、A/orgs | 文件批量建档、逐行校验、统一分配、来源编号/证件号去重；见 patient-file-import-1.8.md |
| screening | A/screenings/import | 文件预览校验后导入待判定池；见 screening-file-import-1.8.md |

## 1.9 企业微信与公众号

| 页面 | API | 行为 |
| --- | --- | --- |
| wecom、official-account | A/wechat/contacts/query（channel 固定为本页通道）、sync、bind、unbind、handle、A/wechat/messages/query、send、refresh、consult、A/wechat/mock/inbound、A/integrations | 会话列表、绑定、三类发送、刷新群发结果、转咨询、模拟事件；企业微信与公众号各一页，见 wechat-channels-1.9.md |
| settings 外部接入 | A/integrations、A/integrations/wechat/save、verify | 企业微信、公众号凭证与真实连接测试 |
| settings 模板 | A/templates/query、save | 新增公众号模板消息（微信模板 ID）与欢迎语 |
| channels | A/channels/wechat-qr | 企业微信"联系我"与公众号带参二维码 |
| accounts | A/accounts/wecom | 登记企业微信成员账号 |
| patients/:id 企业微信、公众号页签、时间轴 | A/wechat/contacts/query（patient_id、channel）、A/wechat/messages/query、A/patients/timeline | 医生只读，运营可发 |
| followups 抽屉 | A/wechat/contacts/query、A/wechat/messages/send（APPROVED_ADVICE）、A/tasks/contact（method=WECHAT） | 微信发送已审核正文；联系方式新增微信 |
| 微信服务器 | O/wecom/callback/{hospital_id}、O/wechat/callback/{hospital_id} | 公开回调，凭签名校验 |
| 用户端 /#wechat | 无 | 页面内虚构演示，不请求后端 |

O 表示 `/boruikang/open` 前缀。

## 2.0 当前全旅程与诊后队列

| 页面 | API | 行为 |
| --- | --- | --- |
| /journeys | A/journeys/query、create | 两类事件旅程、状态/患者筛选，FULL / AFTER_CARE |
| /journeys/:id | A/journeys/detail、handoff_accept、step、status、plan_draft、plan_review、case_open、case_action、no_revisit | 本人接单、本次原报告、计划审批与任务、问题四阶段、复诊及满意度结案 |
| /after-care | A/journeys/summary、cases_query | 五项统计、跨旅程问题队列、类型/状态/超时筛选 |
| /patients/:id 旅程 | A/journeys/query（patient_id） | 同一患者多次就诊历史 |
| /patients 文件上传 | A/patients/import-file、import | 服务端 CSV / XLSX 解析及整批校验，首次联系按 SLA，无手填截止字段 |

前缀 A=/boruikang/admin，新增旅程接口全部 POST。变更需 id/version/request_id；退出不算正常结案，撤回本用途授权停止所有未结束旅程，安全事项可继续处置。
