# 博瑞康企微与房颤连续管理 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 交付博瑞康企微受邀服务闭环、诊后患者统一视图、房颤跨旅程连续管理，保留品牌“博瑞康 Health”，不采用被用户否定的平台定位。

**Architecture:** 在现有 Java/React 模块中整合 PR #20 的受邀 H5，复用患者权限、授权、旅程、审核及工单。房颤长期计划独立于就医旅程，保存版本、医生确认、旅程关联及阶段复盘；未审核计划不对患者公开。企微主体为博瑞康，业务仍按医院隔离。

**Tech Stack:** Java 21、Spring Boot、MyBatis Example、MySQL/H2、React 18、Ant Design、Vite。

---

用户已授权继续开发并选择房颤。直接顺序实施，不创建子代理、不等待重复授权。按仓库 PR-only 流程交付草稿 PR；未授权合并和部署。

## Task 1: 整合已存在的受邀服务实现

- 合入 `origin/codex/wecom-service-center` 到独立 `codex/wecom-af-continuity` 工作树。
- 保留最新 `src/App.jsx` 的 13 项流程导航，将 `ServiceCenter.jsx` 嵌入企业微信。
- 处理 `AGENTS.md`、README、契约和原型冲突，保留已有业务和用户原型。
- 验证限时邀请、登记授权、人工核实、撤销、跨患者/医院隔离以及反馈幂等。

## Task 2: 房颤长期管理数据和 API

- 新增 `continuity` DTO/Service、`ContinuousCarePlan`/`ContinuousCareReview` Model、Example、Mapper/XML；采用现有基础类和返回 DTO。
- 新增 `sql/CONTINUITY-2.2-migration.sql` 并同步 DDL 与 DDL-local；只做加法迁移。
- 管理计划含病种 AF、目标、基线、下一复盘日期、管理状态、内容修订号、医生审核人、审核时点、患者可见建议。
- 创建/修改：运营及本人责任医生按患者范围办理；医学审核仅当前责任医生；修改产生新内容修订并使旧审核失效；审计保留历史。
- 旅程关联：同院同患者校验；计划可关联多次旅程；结案不自动结束计划；暂停/恢复/结束有依据，撤回授权阻断写入。
- 复盘：责任医生写目标变化、结果、依据及下一安排；每次记录追加，保留来源旅程。
- Controller 每个接口一个文件，POST DTO，乐观锁和患者行锁保护并发。

## Task 3: 诊后统一服务摘要

- 新增患者服务摘要接口：患者/责任团队、最近报告、当前旅程、待办、未结工单、预约、指标时间序列、长期计划。
- 显式标记来源与核实边界；不把发送成功等同于有效联系或到院。
- 在 `Patients.jsx` 内增加摘要首屏与 `ContinuousCare.jsx`，入口不脱离诊后工作区；保留旧页签。
- 计划、审核、关联旅程、医生复盘和管理状态均能通过正式 React 办理。

## Task 4: 患者持续访问与反馈

- 扩展 `PatientServiceCenter`/`PatientPortalResponse`，仅返回已审核且当前有效的长期安排。
- 反馈跨入口续签可追溯同一联系人和患者，患者公开进度与下一步说明不泄露内部医学备注。
- 保留令牌到期和撤回保护，页面提供失效重新联系提示；不保存令牌到 localStorage。

## Task 5: 可执行原型及契约同步

- 在既有企业微信/诊后原型中增加连续管理入口和虚构房颤案例，明确演示数据和未接通状态。
- `docs/feature/wecom-af-continuity-2.2.md`、`docs/api/continuity-2.2.md` 记录范围与字段。
- 更新 `tools/sync-implementation-contract.cjs` 生成物及四层基线；不删除既有路径和测试。

## Task 6: 验收与验证

- 新增 Java 集成测试：一例登记—核实—跨次旅程—计划审核—患者反馈—医生处理—患者进度—复盘完整闭环。
- 新增连续批量虚构患者验收：隔离、幂等、版本冲突、审核、撤回、旧邀请失效、不混患者、不丢反馈。
- 验证命令：`mvn -B verify`；两个 React `npm test`（如有）及 `npm run build:deploy`；`node tools/sync-implementation-contract.cjs`；`node --test docs/demo-static/tests/*.test.cjs`。
- 浏览器核查正式界面及手机 H5；真实企微凭据和医院事件未提供时记录联调待办，不能宣称真实患者结果已验收。
- 更新 `docs/review/wecom-af-continuity-2.2.md`，分别记录单例测试、批量测试、实际试点证据。

## Task 7: 可审阅交付

- 检查变更、提交到独立分支、推送、创建 draft PR 并附加到本聊天。
- 报告代码/测试结果与真实试点尚需的企微配置、医院接口和医护确认内容。
