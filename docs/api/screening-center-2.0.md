# 筛查中心查询、统计及报告分级契约

接口为 POST `/boruikang/admin/screenings/*`，请求/响应使用 snake_case。权限沿用筛查池：MANAGER 当前医院，OPERATOR/NURSE 当前医院且 owner_id 为本人；DOCTOR/PLATFORM_ADMIN 不进入正式运营筛查池。原型医生工作流单独说明于需求文件。

## query 与 statistics

两者使用 `ScreeningQueryRequest`，保留所有原有条件，新增：

| 字段 | 含义 |
| --- | --- |
| phone | 联系电话包含查询，最大 24 字符 |
| id_card_tail | 已留存证件尾号精确匹配，最大 8 字符 |
| category | 已登记分类精确匹配，最大 80 字符 |
| category_group | ARRHYTHMIA / CORONARY，使用固定分类集合，不分析报告正文 |
| high_risk | true 时风险 HIGH/CRITICAL，且状态不为 DISCARDED |
| ecg_grade | CRITICAL / WARNING / NORMAL 精确匹配并剔除作废；UNASSESSED 匹配空分级 |

检出起止日期包含当日，结束边界为下一日 00:00；起日大于止日拒绝。固定来源条件和其他条件同时生效，不能绕开医院/负责人权限。query 保持零起始页码及既有分页上限。

statistics 忽略分页，只统计筛选范围：`total`、`pending`（NEW）、`high_risk`、`critical`（本次 ECG CRITICAL 且未作废）、`enrolled`（ENROLLED），以及 `sources`、`risks` 两个枚举计数字典。来源/风险分布含作废，条数之和均等于 total。patient risk_level 与 ecg_grade 独立。

## judge

可选新增 `ecg_grade`（仅 CRITICAL / WARNING / NORMAL）、`ecg_scope`（REST_12_LEAD / ARRHYTHMIA_REFERENCE）、`ecg_evidence`（最多 1000 字符）。未传分级保持原值，不自动推导；传分级必须同时提交有效范围和非空证据。证据应包含原报告编号、院方审核人和具体判据，前端明确为登记院方已审核报告。

沿用版本并发校验。分级在筛查记录保存，同时追加 SCREENING_ECG_GRADE_RECORDED 审计；审计 detail 上限 500 字符，长证据按 400 字符分段，以 version、part 关联，避免截断历史依据。原接口只传患者风险字段继续兼容。

ScreeningResponse 新增 `ecg_grade`、`ecg_scope`、`ecg_evidence`，空值在页面显示待核实。

## SQL 与上线顺序

`screening_record` 新增三列：ecg_grade VARCHAR(16)、ecg_scope VARCHAR(32)、ecg_evidence VARCHAR(1000)，均默认 NULL。全量 MySQL / H2 DDL、Model、Example 白名单与 Mapper 同步。表数量仍为 34。

已有数据库在发布新版服务前执行 [SCREENING-CENTER-migration.sql](../../sql/SCREENING-CENTER-migration.sql) 一次；新数据库使用全量 DDL。禁止将历史 risk_level 批量回填为 ECG 分级。该迁移尚未对开发/生产数据库执行。回滚应用可保留新增可空列，避免删除已登记依据。

## 回归范围

`ScreeningCenterTest` 覆盖日期边界、查询/统计一致、当前医院/负责人隔离、来源/分类组合、作废排除、分级与风险独立、分级证据必填及完整追加审计。HTML 测试覆盖七目录、来源与日期、统计、导出防公式、迁移后编辑、医生权限、改报告重新核实以及导入整批校验/去重；既有导航、筛查详情和服务台账测试继续运行。
