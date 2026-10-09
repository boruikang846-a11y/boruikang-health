# 患者服务中心 2.1 API

全部 POST，JSON snake_case、现有 ApiResponse 包装。管理接口需要 Jwttoken；患者接口使用 256 位随机 token，禁止用患者编号登录。

| 路径 | 请求 | 结果 |
| --- | --- | --- |
| /boruikang/admin/service_center/issue | contact_id | id, token, path, expires_at, mock；旧入口撤销 |
| /boruikang/admin/service_center/query | page(0开始), size(1-100), status(可选) | 当前权限内分页登记队列 |
| /boruikang/admin/service_center/verify | id, version, patient_id, evidence | 人工核实后绑定；患者档案必须已有授权、负责人和医生 |
| /boruikang/admin/service_center/revoke | id, version, reason | 撤销入口；不等同于撤回患者全部服务授权 |
| /boruikang/user/service_center/portal | token | 状态、脱敏姓名、mock、旅程摘要、本人入口反馈进度 |
| /boruikang/user/service_center/register | token, patient_name, phone, relation(SELF/FAMILY), entry_phase(FULL/AFTER_CARE), consent(true) | 登记后待核实 |
| /boruikang/user/service_center/feedback | token, journey_id, request_id, kind(SERVICE/CLINICAL/COMPLAINT), content | 生成现有 journey_case，返回更新门户 |

未核实不能反馈。无效 token/不可见记录 404；过期、撤销或业务前置条件失败 400；权限 403；旧版本或同键不同内容 409；过频 429。患者响应 Cache-Control: no-store。

只存令牌 SHA-256，7 天有效，路径 /service#token；页面移除 fragment，当前标签页 sessionStorage 支持刷新，关闭后结束。链接属于访问凭证，必须企微私发。接口不返回报告、病情、工作人员内部意见、AI 草稿或未经审核临床建议。

SQL：新增 patient_service_entry、patient_service_feedback；全量 DDL 与 PATIENT-SERVICE-2.1-migration.sql 一致，不执行清库。现有患者、企微联系人、旅程、工单、审计表复用。
