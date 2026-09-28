# 1.3 接口与数据设计

所有接口仍使用后台鉴权、医院隔离、当前患者归属和乐观锁。写入先锁患者，再条件更新任务；联系人/报告/审核人不得跨患者或医院引用。

- `POST /tasks/draft`：知识参考可选（`knowledge_id`），不再要求 SOP。
- `POST /tasks/schedule`：关联一份病历，提交明确的节点、日期及请求键，批量安排随访；不自动启用临床规则。
- `POST /tasks/attempt`：保存未成功联系记录与下一次处理计划，不改变已审核建议、不计完成；单独增加版本。
- `POST /tasks/contact`：保存已成功联系的结构化证据，须当前责任医生审批、身份核实、原报告核对；正文快照与联系记录同事务。
- `GET /tasks/{id}`：附原报告和最近联系记录。
- `POST /tasks/acknowledge`：责任医生确认接收已完成的随访记录。
- `POST /tasks/query`：增加 `contact_pending`、`handover_pending`、`revisit_pending`、`assignee_id`、`due_from` / `due_to` 筛选；响应含节点和下次联系时间。
- `POST /reports/weekly`：增加护士维度、逾期/再次联系、昨日复诊待核实统计，保持同一任务集合计算比率。
- `POST /reports/archive`、`POST /reports/archives/query`、`POST /reports/delivery`：日归档/周复盘保存快照，人工外发只登记用户实际执行的凭证；不调用外部发送接口。

任务保留原 `due_at`，另存 `next_contact_at`、`followup_stage`、最近联系结果与医生交接状态。联系记录单独追加，不覆盖历次失败原因。旧 `sop_id` 仅作兼容的可选知识引用存储，产品和新接口不再将其解释为 SOP 对象。
