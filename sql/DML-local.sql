-- Reference service content only. The demo approval is not a hospital clinical approval.
INSERT INTO knowledge_entry (id,hospital_id,kind,department,title,content,source,version,status,reviewer_id,reviewed_at,creator) VALUES (1,1,'SOP','全科','首次联系与出院随访（演示）','1. 核对是否为本人或授权联系人，并确认现在方便沟通。
2. 了解近期身体感受，有无新的不适或希望医生处理的问题。
3. 核对是否按原医嘱执行，记录遇到的困难；不自行给出调药建议。
4. 核对原记录中的复诊日期与安排。
5. 总结本次反馈、下一步联系计划，并把需要医学判断的问题交给医生。','依据患者运营随访工作参考与护士执行表单整理；演示模板，正式使用须医院审批',1,'PUBLISHED',2,CURRENT_TIMESTAMP,'demo-seed') ON DUPLICATE KEY UPDATE id=id;
INSERT INTO knowledge_entry (id,hospital_id,kind,department,title,content,source,version,status,reviewer_id,reviewed_at,creator) VALUES (2,1,'SOP','心血管内科','心血管患者信息核对（演示）','请核对最近一次就诊时间、医生安排与复诊日期。请问近期身体感受与之前相比是否有变化？是否有需要医生解答的问题？如已测量血压、心率或体重，可提供测量时间与数值。请说明按原医嘱执行时遇到的困难。记录信息后提交责任医生判断，不根据本问卷自行诊断或调药。','参考全周期管理 V1.0 与运营流程；仅信息采集，不含临床阈值',1,'PUBLISHED',2,CURRENT_TIMESTAMP,'demo-seed') ON DUPLICATE KEY UPDATE id=id;
INSERT INTO knowledge_entry (id,hospital_id,kind,department,title,content,source,version,status,reviewer_id,reviewed_at,service_days,followup_count,creator) VALUES (3,1,'PACKAGE','全科','连续健康服务基础包（演示）','提供健康档案、服务咨询、指标记录、4次计划随访与复诊协调。具体服务范围、时间及费用以医院确认的服务说明为准。本演示不含诊断、处方或线上支付。','参考健康管理服务包汇总；不照搬医院价格与承诺',1,'PUBLISHED',2,CURRENT_TIMESTAMP,365,4,'demo-seed') ON DUPLICATE KEY UPDATE id=id;
INSERT INTO knowledge_entry (id,hospital_id,kind,department,title,content,source,version,status,creator) VALUES (4,1,'EDUCATION','全科','复诊前的资料准备','请按医院要求携带就诊资料、近期检查报告和目前正在使用的药物信息。就诊地点、时间和具体准备要求请向医院服务团队核实。','通用服务流程草稿，等待本院医生审核',1,'DRAFT','demo-seed') ON DUPLICATE KEY UPDATE id=id;
INSERT INTO integration_config (id,hospital_id,provider,endpoint,model_name,secret,is_enabled,creator) VALUES (1,1,'AI','https://dev.user.bgssai-tokenhub.cn/v1/chat/completions','', '',0,'seed') ON DUPLICATE KEY UPDATE endpoint=CASE WHEN endpoint='' THEN VALUES(endpoint) ELSE endpoint END;
