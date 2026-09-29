# 1.5 验证记录（2026-09-29）

- 管理端 npm run build:deploy 成功，产物同步 Spring Boot static；主包约 1.42 MB，仍有体积提示。用户端本轮无改动。
- mvn -B test（本地 H2）：62 项通过，16 项 MySQL 专用用例按既有约定跳过。本轮新增 OperationsLedgerTest 12 项（患者池判定与入组开出 SLA 首触任务、导入去重与批次唯一、接通关首触与连续未联系上升级失联、预约镜像复诊任务与阶段推进、爽约重约、服务包激活展开方案与升级作废旧任务、转诊 SLA 与反馈、模板与已发登记幂等、用药与同意与时间轴、阶段退出必填原因与异常关闭必选处置、十项指标与漏斗与按人与日统计与队列、SLA 默认与覆盖）和 OperationsLedgerHttpTest 2 项（44 个新接口中关键接口的真实 HTTP 接线、角色门禁、校验拒绝，以及筛查 → 入组 → 邀约 → 预约 → 到院 → 时间轴 → 已发登记的整链）。
- 既有 HealthWorkflowTest 的异常关闭用例按新口径调整：ESCALATED 异常完成时必须选择处置去向。
- 种子在 H2 上暴露并修正两处约束：appointment.is_effective 非空、service_enrollment.start_date 允许待激活为空；三个含 is_ 布尔列的新表改用 resultMap 映射（自动映射会把 is_active 映射到不存在的 isActive）。
- 演示种子由 tools/generate-ledger-seed.py 生成，标记块可重复执行；日期固定按 2026-09-29 生成，MySQL 与 H2 文本一致。全部虚构。
- 本轮未执行真实浏览器逐页点击、真实 MySQL 迁移与 Jenkins 部署；MySQL 迁移脚本已提供但尚未在云端库执行，不宣称部署成功。

范围外：短信网关、企微、医院接口、支付均未接入，系统只登记人工凭证；AI 生成不参与任何医学判断。
