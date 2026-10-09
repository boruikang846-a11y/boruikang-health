# 2.2 当前增量基线

最新范围：[需求](../feature/wecom-af-continuity-2.2.md)、[API](../api/continuity-2.2.md)、[验收](../review/wecom-af-continuity-2.2.md)、[机器契约](continuity-2.2.json)。首期博瑞康企微 + 受邀 H5 + 诊后患者摘要 + 房颤连续管理；全量 39 表。企业微信受邀入口统一在 `/wecom?tab=service`，保留 13 项主导航。Java / React 实现与离线原型分别验证，原型不调用真实接口。

增加 `node tools/sync-continuity-contract.cjs [--write]` 漂移检查，覆盖新增 DTO、接口及三表增量结构。2.1 增量升级按 SQL README，历史仅介绍页 / 医院自有企微 / 清库等口径由当前增量覆盖，不据此执行部署。

以下 2.0 / 2.1 记录按当时版本保留；开发库 34 表的旧检查不代表本轮 39 表已迁移。

# 2.1 患者服务中心增量

2026-10-08 用户确认并启动开发。当前新增范围见 [服务中心需求](../feature/patient-service-center-2.1.md)、[API](../api/patient-service-center-2.1.md)、[机器契约](patient-service-center-2.1.json)、[原型](../demo-static/web/admin/patient-service-center-2.1.html)。HEALTH-USER 新增受邀 H5 服务，不再仅公开介绍。此前完整自助入组探索不等同于本次受邀入组。数据库加法新增 2 表，全量 36 表；不清库。

以下为 2.0 版本基线记录；涉及仅介绍页、34 表及未开放患者 H5 的叙述以本次增量为准。

# HEALTH 2.0 四层同步基线

导航增量核对日期：2026-10-09；后端业务基线核对日期：2026-10-05。业务基线包含 PR #16 全旅程、PR #17 开发数据库配置和 PR #18 原型契约同步（`a3fc7bd`）。在此基线上补齐正式 React 工作台的公共框架、患者分类统计、患者档案旅程入口与全旅程页面结构；后端新增患者类型筛选及权限范围内的统计接口，数据库沿用现有 34 张表。

当前需求以 [全旅程 2.0](../feature/journey-2.0.md) 为最新增量，叠加 1.9 微信通道、1.8 文件导入、1.7 随访 AI、1.6 医护登录和 1.5 台账。旧文件是对应版本的历史记录；1.4 的院方医护不登录、早期 SOP 配置/培训、患者自助业务等口径已失效。未实现的设计不能当作已交付功能。

| 范围 | 已实施口径 / 本次同步 | 对应依据 |
| --- | --- | --- |
| 导航与权限 | 13 项一级菜单按全旅程、企微、公众号、诊前筛查、诊后干预、宣教、服务包、渠道、复盘、医院、账号、设置、介绍排序；患者池/患者中心及操作台账归入阶段。旧路由权限与菜单展示分离，医生按本人患者，护士/运营按分派，平台仅设置及介绍 | React `App.jsx`、[流程导航方案](../plans/2026-10-09-care-navigation-design.md)、当前 HTML 原型 |
| 正式页面 | 深色全宽顶栏及侧栏、绿色主操作；患者分类/统计/文件导入/清单；患者旅程页；全旅程阶段责任表与纵向详情 | [页面设计](../design/admin-workspace-2.0.md)、[患者中心需求](../feature/patient-file-import-1.8.md) |
| 两类旅程 | 门诊 8 阶段、出院 7 阶段；FULL / AFTER_CARE；诊后跳过前段但仍核对本次原报告 | `JourneyService`、[需求](../feature/journey-2.0.md) |
| 交接 | 建立为 INTAKE；当前负责人本人接收才 ACTIVE，重分派后重新交接 | `handoff_accept`、`status` |
| 临床报告 | 当前责任医生本人确认已阅；本事件时间之后的同类报告；报告不可跨事件复用；保存快照 | `records/review`、`journeys/step` |
| 个案计划 | 运营起草、责任医生通过或退回；通过才生成多节点任务；替换取消旧未完成任务并保留历史 | `plan_draft`、`plan_review`、`journey_plan` / `journey_task_link` |
| 随访与结案 | 当前计划全部随访完成且医生查收；未结异常/咨询阻止结案；复诊为报告之后独立到院及已核验诊疗结果，或责任医生确认无需复诊 | `FOLLOWUP` / `CLOSE`、`no_revisit` |
| 满意度 | RATED（1–5 分）、DECLINED、NO_RESPONSE、NOT_INVITED；缺失不算评分 | `CompleteJourneyStepRequest` |
| 状态与授权 | 暂停、恢复、退出本次旅程、撤回本用途授权各自独立；撤回停止全部未结束旅程；新授权不恢复旧旅程 | `ServiceAuthorization`、`service_consent_withdrawal` |
| 咨询 / 异常 / 投诉 | OPEN → ACCEPTED → RESOLVED → CLOSED；临床由医生处理、运营/护士核验反馈；退出后安全事项仍可处置 | `case_open`、`case_action`、`cases_query` |
| 文件导入 | XLSX / CSV ≤5 MiB、≤500 行；整批校验、来源编号/证件号去重；ENROLLED / UNKNOWN、未取得服务授权；首次联系按医院 SLA 计算，无手填截止字段 | `PatientFileImportService`、`ImportPatientFileRequest`、`OutreachService` |
| 微信 | 手工核实绑定；企微创建待成员确认任务、公众号按通道限制发送；真实返回不代表已读；两通道独立 | [1.9 契约](../api/wechat-channels-1.9.md)、专项原型 |
| 数据库 | 全量 34 表，包含 7 张旅程增量表；MySQL / H2、Mapper / Model 字段相同；旅程增量 DDL 与全量定义相同 | `sql/DDL.sql`、`DDL-local.sql`、`JOURNEY-2.0-migration.sql` |

本次只读查询了开发 MySQL 的表及字段，34 张预期表全部存在、字段集合一致；未写入、清库、导入、迁移或查询患者正文。此结果不代表生产库或外部接口验收。部署仍由部署仓执行，dev / prod 同用 `develop`，分别使用 `application-dev.properties` / `application-prod.properties`。

## 当前原型与历史设计

[原型入口](../demo-static/web/index.html) → [当前实现交互](../demo-static/web/interactive.html)。原型使用虚构内存状态，不调用后端或外部服务，刷新恢复；正式 React/Java 的持久化、事务、身份认证和幂等响应以代码为准。微信专项拥有独立虚构记录，不与旅程内存共享。

此前 3.0–3.4 是原型探索编号，不代表完整后端版本。全量扫码服务入组、患者 H5、独立 AI 管理计划、报告解析、独立风险复核、质量保障中心、数据接入测试等未实施设计已移出当前导航；相关旧 JS 和页面保留历史参考。HEALTH-USER 仍只有公开介绍。正式 SOP 尚未取得，系统没有 SOP 配置/发布/培训业务。

## 更新与检查

机器契约由 `tools/sync-implementation-contract.cjs` 从后端阶段、DTO、Controller、React 导航及 SQL 生成，原型直接消费阶段、状态和导航，避免再维护另一份阶段清单。

```powershell
node tools/sync-implementation-contract.cjs --write
node tools/sync-implementation-contract.cjs
node docs/demo-static/tests/platform-prototype.test.cjs
node docs/demo-static/tests/implementation-prototype.test.cjs
node docs/demo-static/tests/patient-upload.test.cjs
```

默认命令只校验；`--write` 更新 JSON 与原型 JS。CI 对生成物漂移、SQL/Mapper/Model 不一致、旅程和上传行为回归直接失败。需求变更仍需人工更新本表及业务行为，自动提取不能替代需求裁决。

开发库可选只读检查（自行替换本地已有 MySQL 驱动位置）：

```powershell
java -cp <mysql-connector-j.jar> tools/CheckDatabaseSchema.java boruikang-health-admin/boruikang-health-admin/src/main/resources/application-dev.properties sql/DDL.sql
```

凭证仅从本地 properties 读取，输出不打印地址、账号或密码。验证证据见 [同步验证](../review/prototype-sync-2.0.md)。

## 2026-10-09 导航增量边界

本轮合并的是工作入口、页面与办理步骤，复用原业务 API、权限和数据表，不新增临床规则或数据库迁移。诊前和诊后的邀约、预约、转诊共用既有台账，页面入口不会自动改变患者阶段，也不会凭菜单替代医生判断或服务交接。

离线原型保留本地已有的三类诊后服务及筛查详情编辑；这些探索内容与正式 React/Java 的实现范围分别说明，不能由导航统一推断生产已具备原型全部能力。
