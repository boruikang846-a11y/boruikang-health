# HEALTH-MVP-1.2 页面与 API 映射

前缀 A=/bgssai/admin。页面路径由各端 PAGE-FLOW.html 维护。

| 页面 | API | 操作 |
| --- | --- | --- |
| 管理端 /overview | 无业务 API | 公开 HTML 系统关系图、角色、报告依据与流程；登录页和侧栏均可达 |
| 管理登录 | A/login、A/me、A/logout | 账号登录、会话恢复、退出 |
| workbench | A/dashboard、A/tasks/query | 汇总、优先待办、跳转处理 |
| patients、patients/:id | A/patients/query、create、update、A/patients/{id}、A/staff | 建档、分派、医生分层 |
| patients/:id 时间轴 | A/records/query、create、A/messages/query、A/audits/query | 原记录、人工沟通与审计 |
| followups、alerts、revisits | A/tasks/query、A/tasks/{id}、create、claim、draft、submit-review、review、contact、transition | 版本保护的任务处理抽屉 |
| knowledge | A/knowledge/query、save、publish | 运营团队制定/发布 SOP；医生只读 SOP，审核发布宣教/服务包 |
| channels | A/channels、A/channels/create、toggle | 经理维护渠道，二维码本地生成 |
| reports | A/reports/weekly | 日期范围统计、浏览器打印 |
| hospital | A/hospital/status、mock/query、sync、A/staff | 经理预览/同步虚构医院数据、查看幂等结果 |
| settings | A/integrations、A/integrations/save | 接入状态、平台管理员保存 AI 配置 |
| 用户端 /、/join/:token | 无 | 系统全貌、角色、出院报告依据、三模式规划、页内导航与语言切换 |

MANUAL/TEMPLATE/AI 均生成待审核草稿。列表隐藏内部 note，授权医护详情可查看。所有查询失败必须显示错误和重试，不用零值冒充统计结果。报告打印只包含当前已加载范围。