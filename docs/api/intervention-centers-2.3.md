# 服务中心工作单接口 2.3

统一前缀 `/boruikang/admin`，POST JSON、snake_case、Jwttoken；响应遵循现有 `{ result, ... }` 包装。每接口独立 Controller，DTO 不返回 Entity。医院与人员身份由服务端会话获取，客户端不能指定。

| 接口 | 请求要点 | 返回 |
| --- | --- | --- |
| `/interventions/query` | center 必填；phase、patient_id、keyword、status、overdue 可选；page 从 0 开始，size 1–100 | page（items、page_num、page_size、total_size）和 metrics |
| `/interventions/get` | id | 完整工作单、原报告正文、只追加的操作历史 |
| `/interventions/save` | 新建无 id；修改含 id、version；patient_id、center、phase、category、title、content、clinical、due_at、reason 必填，record_id 可选 | 最新工作单和版本 |
| `/interventions/act` | id、version、action、note 必填；ARRIVAL 另传 occurred_at，RATE 另传 score | 最新工作单、版本和历史 |

center：OUTPATIENT / INPATIENT / EXAM / CONSULTATION / REFERRAL。phase：PRE / IN / POST。category 是最长 40 字的可编辑事项，title 最长 160 字，content 最长 4000 字，reason/note 最长 2000 字。due_at、occurred_at 使用现有管理端本地时间格式 `YYYY-MM-DDTHH:mm:ss`。截止时间可在过去以补录待办，但不超过未来五年。

状态：TODO 待处理、ACTIVE 处理中、REVIEW 待医生审核、READY 待执行、RESOLVED 待核验、CLOSED 已闭环。

| action | 前置条件 | 结果 |
| --- | --- | --- |
| START | TODO，运营/护士 | ACTIVE，记录首次处理时间 |
| SUBMIT | 临床单，TODO/ACTIVE，或已改派医生的 READY | REVIEW，清除旧审核 |
| APPROVE | REVIEW，当前责任医生本人，原报告本人已阅 | READY，保存已审正文快照和审核人 |
| REJECT | REVIEW，当前责任医生本人 | ACTIVE，清除审核 |
| COMPLETE | ACTIVE/READY；临床单必须已审正文不变、审核人为当前医生且服务授权有效 | RESOLVED，保存办理结果 |
| ACKNOWLEDGE | RESOLVED 临床单，当前责任医生本人 | 保存本人查收人 |
| CLOSE | RESOLVED；临床单还需当前医生本人查收 | CLOSED |
| REOPEN | RESOLVED/CLOSED，运营/护士 | ACTIVE，清除审核和查收，保留全部历史 |
| NOTE | 非 CLOSED，权限内任一医护/运营 | 追加协作记录 |
| ARRIVAL | 运营/护士、未登记到院；时间不在未来且不早于建单前一年 | 保存实际到院与凭据 |
| RATE | RESOLVED/CLOSED，运营/护士、未登记评价、score 为 1–5 | 保存患者实际评分及反馈 |

save 修改后转为 ACTIVE，重置医学审核及查收。不能改变患者，不能把临床单改为普通单；临床单必须关联同院同患者原报告。清空普通单的报告关联会写入 NULL。所有修改、状态操作、日志和审计在事务内完成，先锁患者，再按工作单 version 条件更新；过期版本返回 HTTP 409。越权患者/跨医院返回 404，岗位不允许返回 403，状态或业务校验不满足返回 400。

metrics：total、todo、active、review、ready、resolved、closed、overdue、arrived、rated、positive、complaints；overdue 是未完成且截止早于当前时间，complaints 是 category=投诉协办 且未闭环。统计和列表使用相同医院、患者权限、中心/阶段/标题条件；状态和超时筛选仅影响列表。

日志记录 actor_id、action、note、before_json、after_json、at，只有追加接口。临床正文及历史仅对患者当前责任团队可见。主任/主管身份不能替代患者责任医生的本人操作。

迁移文件：`sql/INTERVENTION-2.3-migration.sql`。沿用已有部署流程，迁移尚未在 dev/prod 执行。
