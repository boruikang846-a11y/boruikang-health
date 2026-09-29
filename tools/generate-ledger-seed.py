"""Generate the 1.5 operations-ledger demo seed (all fictional) and append it to the four DML files.

Usage: python tools/generate-ledger-seed.py [--date 2026-09-29]
Appends an idempotent block after the marker "-- BEGIN OPERATIONS LEDGER 1.5"; re-running replaces the block.
Base DML gets message templates and SLA defaults; dev DML gets organisations, campaign, plans, packages,
screening pool, invitations, appointments, enrollments, referrals, medications, message logs and outreach tasks.
Dates are absolute and derived from --date so H2 and MySQL receive identical text.
"""
import argparse, datetime as dt, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MARK = "-- BEGIN OPERATIONS LEDGER 1.5"
END = "-- END OPERATIONS LEDGER 1.5"
def q(v):
    if v is None: return "NULL"
    if isinstance(v, bool): return "1" if v else "0"
    if isinstance(v, (int, float)): return str(v)
    return "'" + str(v).replace("\\", "\\\\").replace("'", "''") + "'"
def ins(table, **cols):
    return "INSERT INTO %s (%s) VALUES (%s) ON DUPLICATE KEY UPDATE id=id;" % (table, ",".join(cols), ",".join(q(v) for v in cols.values()))
def upd(table, id_, **cols):
    return "UPDATE %s SET %s WHERE id=%d;" % (table, ",".join("%s=%s" % (k, q(v)) for k, v in cols.items()), id_)

def base_block(today):
    out = ["-- Message templates and SLA defaults (fictional demo content; wording adapted from generic follow-up scripts, no hospital names)."]
    templates = [
        ("SMS_FIRST_CONTACT","SMS","FIRST_CONTACT","首次联系短信","您好，我是{医院}健康管理团队{姓名}。您近期的{检查}结果建议由专科医生进一步评估，我们将于{时间}致电与您沟通，请留意来电。回复TD退订。"),
        ("SMS_HIGH_RISK","SMS","HIGH_RISK","高风险提醒短信","您好，{医院}健康管理团队提醒：您的{检查}结果提示需尽快到院复核，已为您预留{日期}{科室}号源，请携带既往资料按时到院。如需改期请回电{电话}。"),
        ("SMS_ARRIVAL_REMINDER","SMS","ARRIVAL_REMINDER","到诊提醒短信","温馨提醒：您预约的{日期}{时间}{科室}就诊即将到期，请携带身份证、既往检查报告及在用药物到{地点}报到。如有变动请回电{电话}。"),
        ("SMS_FOLLOWUP_REMINDER","SMS","FOLLOWUP_REMINDER","随访提醒短信","您好，{医院}健康管理团队将于{日期}对您进行例行随访，请准备近期血压、心率等自测记录。如时间不便请回复调整。"),
        ("SMS_REVISIT_REMINDER","SMS","REVISIT_REMINDER","复诊提醒短信","您好，根据医生安排您需于{日期}前复诊复查。如尚未预约，可回电{电话}由我们协助安排。"),
        ("SMS_NO_SHOW","SMS","NO_SHOW","未到院跟进短信","您好，未见您于{日期}到院就诊。若因故未能前来，可回电{电话}重新安排，团队将协助您完成检查。"),
        ("SCRIPT_FIRST_CONTACT","SCRIPT","FIRST_CONTACT","首次电话话术","1 核实身份：请问是{姓名}本人或家属吗？2 说明来意：我是{医院}健康管理团队，因为您{日期}的{检查}结果需要专科评估。3 了解现状：最近有无不适、是否已就诊。4 邀约：建议{日期}前到{科室}复核，我们可协助预约。5 记录：意愿、到院方式、下次联系时间。"),
        ("SCRIPT_HIGH_RISK","SCRIPT","HIGH_RISK","高风险邀约话术","强调结果提示需要医生尽快复核，说明绿色通道与已预留号源；询问是否需要家属陪同；明确到院时间和地点；如患者犹豫，记录顾虑并约定 24 小时内再联系；任何医学判断转交医生。"),
        ("SCRIPT_FAMILY","SCRIPT","FAMILY","家属接听话术","确认家属身份与患者关系；说明联系目的但不透露具体诊断细节；请家属转告并约定患者本人方便的回电时间；记录家属联系方式作为备用。"),
        ("SCRIPT_HESITANT","SCRIPT","HESITANT","犹豫患者话术","倾听顾虑（费用、路程、时间、担心结果）；对应说明检查项目与大致费用、可预约时间段、家属陪同；不做承诺、不夸大病情；约定再次联系时间。"),
        ("SCRIPT_REFUSED","SCRIPT","REFUSED","拒绝患者话术","尊重患者选择，简要说明风险由医生判断，留下团队电话；记录拒绝原因；按 SLA 安排一次后续关怀联系，不重复骚扰。"),
        ("SCRIPT_COMPLAINT","SCRIPT","COMPLAINT","投诉处理话术","先致歉并倾听，不辩解；记录投诉内容、时间、涉及环节；承诺 1 个工作日内由主管回复；转交主管并登记投诉。"),
        ("SCRIPT_URGENT","SCRIPT","URGENT","紧急情况话术","若患者描述胸痛、呼吸困难、意识改变等急症表现，立即建议拨打急救电话或前往急诊，不做任何处理建议；随后登记异常并通知责任医生。"),
        ("WECHAT_FOLLOWUP_REMINDER","WECHAT","FOLLOWUP_REMINDER","随访提醒（微信）","{姓名}您好，本周是您的第{N}次随访，请在方便时回复近期血压、体重和用药情况，或告知方便的通话时间。"),
    ]
    for i, (code, ch, scene, title, content) in enumerate(templates, start=1):
        out.append(ins("message_template", id=i, hospital_id=1, code=code, channel=ch, scene=scene, title=title, content=content, is_active=True, version=0, creator="demo-seed"))
    slas = [("CRITICAL",2,1,1,2,"重点关注：2 小时内首触，1 天内预约与到院"),("HIGH",24,3,7,3,"高风险：24 小时首触，3 天预约，7 天到院"),("MEDIUM",72,7,30,3,"中风险：3 天首触"),("LOW",168,30,90,3,"低风险：一周内首触"),("UNKNOWN",168,30,90,3,"未评估按低风险口径")]
    for i, (risk, h, b, a, lost, note) in enumerate(slas, start=1):
        out.append(ins("sla_config", id=i, hospital_id=1, risk_level=risk, first_contact_hours=h, booking_days=b, arrival_days=a, lost_after_attempts=lost, note=note, version=0, creator="demo-seed"))
    return out

def dev_block(today):
    d = lambda days, hour=9, minute=0: (dt.datetime.combine(today, dt.time(hour, minute)) + dt.timedelta(days=days)).strftime("%Y-%m-%d %H:%M:%S")
    dd = lambda days: (today + dt.timedelta(days=days)).isoformat()
    out = ["-- Fictional organisations, campaigns, plans, packages and ledgers for the 1.5 operations demo. No real hospital, patient or price."]
    orgs = [(1,"演示总院","HOSPITAL",None,"演示医务科","00000000100"),(2,"演示心血管分中心","BRANCH",1,"演示分中心联络员","00000000101"),(3,"演示东街社区卫生服务中心","COMMUNITY",1,"演示社区医生","00000000102"),(4,"演示西河镇卫生院","TOWNSHIP",1,"演示镇卫生院医生","00000000103"),(5,"演示北村卫生室","VILLAGE",4,"演示村医","00000000104"),(6,"演示体检中心","EXAM_CENTER",1,"演示体检中心客服","00000000105")]
    for id_, name, t, parent, cn, cp in orgs:
        out.append(ins("care_org", id=id_, hospital_id=1, name=name, org_type=t, parent_id=parent, contact_name=cn, contact_phone=cp, is_active=True, note="虚构机构，仅用于演示", creator="demo-seed"))
    out.append(ins("campaign", id=1, hospital_id=1, name="演示：社区心电网络日常邀约", campaign_type="DAILY_INVITATION", org_id=3, location="演示东街社区", starts_on=dd(-30), ends_on=dd(60), owner_id=3, status="ACTIVE", target_count=120, note="虚构活动", version=0, creator="demo-seed"))
    out.append(ins("campaign", id=2, hospital_id=1, name="演示：秋季体检高危早干预", campaign_type="EARLY_INTERVENTION", org_id=6, location="演示体检中心", starts_on=dd(-14), ends_on=dd(30), owner_id=20, status="ACTIVE", target_count=80, note="虚构活动", version=0, creator="demo-seed"))
    out.append(ins("campaign", id=3, hospital_id=1, name="演示：镇卫生院卒中筛查义诊", campaign_type="SCREENING", org_id=4, location="演示西河镇", starts_on=dd(-60), ends_on=dd(-45), owner_id=21, status="CLOSED", target_count=200, note="虚构活动，已结束", version=0, creator="demo-seed"))
    plans = [(1,"演示：出院后 90 天随访方案","心血管慢病","POST_DISCHARGE","ACTIVE",[(1,"ENROLLMENT",1,"FOLLOWUP","出院后首次随访：核对出院医嘱与用药","P1","核对身份;核对出院报告;用药困难;复诊日期"),(2,"D7",7,"FOLLOWUP","出院 7 天随访","P2","症状变化;用药依从;自测指标"),(3,"D30",30,"FOLLOWUP","出院 30 天随访","P2","症状;用药;复诊准备"),(4,"D30",30,"REVISIT","出院 1 个月复诊复查","P2","预约;资料准备"),(5,"M3",90,"FOLLOWUP","出院 3 个月随访与阶段总结","P2","阶段总结;服务期评估")]),
             (2,"演示：门诊高危一年管理方案","房颤/高血压","POST_VISIT","ACTIVE",[(1,"ENROLLMENT",1,"FOLLOWUP","入组首次随访","P2","核对身份;宣教;自测指导"),(2,"D30",30,"FOLLOWUP","月度随访","P2","指标;用药"),(3,"M3",90,"REVISIT","季度复诊复查","P2","预约;报告"),(4,"M6",180,"FOLLOWUP","半年随访","P3","指标趋势"),(5,"Y1",365,"REVISIT","年度复查","P3","预约;年度总结")]),
             (3,"演示：筛查阳性 30 天早干预方案","心电网络高危","SCREENING","DRAFT",[(1,"ENROLLMENT",0,"FOLLOWUP","筛查阳性首次沟通","P1","解释结果;邀约"),(2,"D7",7,"REVISIT","7 天内到院复核","P1","绿色通道;到院核验")])]
    nid = 1
    for pid, name, disease, scene, status, nodes in plans:
        out.append(ins("followup_plan", id=pid, hospital_id=1, name=name, disease=disease, entry_scene=scene, description="虚构方案，节点与间隔仅为演示", status=status, version=0, creator="demo-seed"))
        for seq, stage, off, tt, title, pri, chk in nodes:
            out.append(ins("followup_plan_node", id=nid, hospital_id=1, plan_id=pid, seq=seq, stage=stage, offset_days=off, task_type=tt, title=title, priority=pri, checklist=chk, creator="demo-seed")); nid += 1
    pkgs = [(1,"PKG-BASIC-90","演示基础随访包（90 天）","心血管慢病","BASIC","POST_DISCHARGE",90,0,4,1,1,"无","随访提醒;复诊协调","工作日 9:00-17:00",1,"ACTIVE"),
            (2,"PKG-STANDARD-365","演示标准管理包（一年）","房颤/高血压","STANDARD","POST_VISIT",365,59900,12,2,4,"演示家用血压计（按需）","专属健康管家;复诊协调;报告解读转交医生","工作日 8:30-20:00",2,"ACTIVE"),
            (3,"PKG-PREMIUM-365","演示重点管理包（一年）","冠心病/心衰","PREMIUM","LONG_TERM",365,199900,24,4,4,"演示动态心电贴片（按需）","绿色通道;家属沟通;个案汇总","每日 8:00-22:00",2,"ACTIVE"),
            (4,"PKG-SCREEN-30","演示筛查早干预包（30 天）","心电网络高危","BASIC","SCREENING",30,0,2,1,1,"无","到院复核协助","工作日 9:00-17:00",3,"DRAFT")]
    for id_, code, name, disease, tier, scene, days, price, fc, ac, rc, dev, priv, hours, plan, status in pkgs:
        out.append(ins("service_package", id=id_, hospital_id=1, code=code, name=name, disease=disease, tier=tier, scene=scene, period_days=days, price_cents=price, followup_count=fc, assessment_count=ac, review_count=rc, device_note=dev, privilege_note=priv, service_hours=hours, content="演示内容：随访、指标记录、复诊协调；不含诊断、处方与支付。", red_lines="不做诊断;不调药;不承诺疗效;价格以医院公示为准", plan_id=plan, status=status, version=0, creator="demo-seed"))
    # patient profile extensions for the baseline demo patients
    exts = [(1001,"INPATIENT","DISCHARGE",2,2,"演示家属一","00000000901",d(-2,15,20)),(1002,"OUTPATIENT","OUTPATIENT",1,5,"演示家属二","00000000902",d(-5,10,0)),(1003,"DISCHARGED","DISCHARGE",2,2,"演示家属三","00000000903",d(-9,11,0)),(2001,"OUTPATIENT","ECG_NETWORK",3,None,None,None,None),(2002,"OUTPATIENT","EXAM",6,None,None,None,d(-1,16,0))]
    for pid, ptype, scene, org, ref, ec, ep, last in exts:
        out.append(upd("patient", pid, patient_type=ptype, source_scene=scene, org_id=org, referrer_id=ref, emergency_contact=ec, emergency_phone=ep, last_contact_at=last, tags=",演示,重点随访," if pid in (1001,1003) else ",演示,", consent_version="HEALTH-MVP-1" if pid < 2000 else None))
    # screening pool
    scr = [(1,"ECG_NETWORK",3,1,3,"演示筛查甲","MALE",66,"00000000201","1234",d(-3,8,30),"房颤波形，心室率 118","心律失常","HIGH","院方心电室复核：持续性房颤，建议门诊复核",1,d(-3,10,0),"ENROLLED",None,"ECG-2026-0001",None),
           (2,"ECG_NETWORK",3,1,3,"演示筛查乙","FEMALE",58,"00000000202","5678",d(-3,9,0),"ST 段压低 0.1mV","缺血样改变","HIGH","院方心电室复核：建议一周内专科评估",1,d(-3,10,5),"HIGH_RISK",None,"ECG-2026-0002",None),
           (3,"ECG_NETWORK",3,1,20,"演示筛查丙","MALE",49,"00000000203","9012",d(-2,9,30),"窦性心动过缓 52 次/分","传导异常","LOW",None,1,d(-2,11,0),"NON_HIGH_RISK","无症状，建议社区随访",None,None),
           (4,"EXAM",6,2,20,"演示筛查丁","FEMALE",61,"00000000204","3456",d(-2,10,0),"血压 168/102，空腹血糖 8.9","高血压+血糖异常","MEDIUM","体检中心医生初判：需门诊复核",20,d(-2,14,0),"HIGH_RISK",None,None,"EXAM-BATCH-20"),
           (5,"EXAM",6,2,20,"演示筛查戊","MALE",55,"00000000205","7890",d(-2,10,10),"颈动脉斑块，LDL 4.8","动脉硬化","MEDIUM",None,None,None,"NEW",None,None,"EXAM-BATCH-20"),
           (6,"EXAM",6,2,21,"演示筛查己","FEMALE",44,"00000000206","2345",d(-1,9,0),"心电图正常，血脂轻度升高","血脂异常","UNKNOWN",None,None,None,"NEW",None,None,"EXAM-BATCH-20"),
           (7,"STROKE_SCREENING",4,3,21,"演示筛查庚","MALE",71,"00000000207","6789",d(-50,9,0),"卒中高危评分 5 分","卒中高危","HIGH","义诊医生评估：建议神经内科评估",21,d(-50,12,0),"DISCARDED","已在外院治疗，不纳入",None,"STROKE-0729"),
           (8,"OUTPATIENT",1,None,3,"演示筛查辛","FEMALE",63,"00000000208","0123",d(-1,15,0),"门诊发现血压 175/100","高血压","HIGH","门诊医生：建议纳入管理并三日内复诊",3,d(-1,15,30),"HIGH_RISK",None,None,None)]
    for r in scr:
        id_, st, org, camp, owner, name, g, age, ph, tail, at, finding, cat, risk, ev, jb, ja, ps, reason, ext, batch = r
        out.append(ins("screening_record", id=id_, hospital_id=1, patient_id=2001 if id_ == 1 else None, org_id=org, campaign_id=camp, owner_id=owner, source_type=st, name=name, gender=g, age=age, phone=ph, id_card_tail=tail, screened_at=at, finding=finding, category=cat, risk_level=risk, risk_evidence=ev, judged_by=jb, judged_at=ja, pool_status=ps, non_high_risk_reason=reason if ps == "NON_HIGH_RISK" else None, external_id=ext, import_batch=batch, note=reason if ps == "DISCARDED" else "虚构筛查记录", version=0, creator="demo-seed"))
    # outreach tasks
    outreach = [(40001,2001,"首次联系并邀约到院","P1","COMPLETED",3,d(-3,10,30),d(-2,16,0),"outreach-screening-1","WILLING"),(40002,2002,"首次联系并邀约到院","P2","IN_PROGRESS",3,d(0,16,0),None,"outreach-patient-2002","NO_ANSWER"),(40003,1003,"首次联系并邀约到院","P1","PENDING",3,d(-1,10,0),None,"outreach-patient-1003",None)]
    for id_, pid, title, pri, status, owner, due, done, key, cr in outreach:
        out.append(ins("care_task", id=id_, hospital_id=1, patient_id=pid, task_type="OUTREACH", title=title, priority=pri, status=status, assignee_id=owner, doctor_id=2, due_at=due, sla_due_at=due, completed_at=done, outcome="WILLING" if done else None, contact_result=cr, next_contact_at=d(1,10,0) if cr == "NO_ANSWER" else None, request_key=key, version=0, creator="demo-seed"))
    out.append(ins("care_task", id=40004, hospital_id=1, patient_id=1002, task_type="ALERT", title="连续3次未联系上，疑似失联", priority="P1", status="PENDING", alert_source="LOST_CONTACT", assignee_id=3, doctor_id=5, due_at=d(0,18,0), sla_due_at=d(0,18,0), request_key="lost-contact-1002-"+dd(-1), version=0, creator="demo-seed"))
    out.append(ins("care_task", id=40005, hospital_id=1, patient_id=1001, task_type="ALERT", title="患者电话报告夜间胸闷", priority="P0", status="IN_PROGRESS", alert_source="PATIENT_REPORT", assignee_id=3, doctor_id=2, due_at=d(0,12,0), sla_due_at=d(-1,20,0), ack_at=d(-1,19,30), request_key="alert-1001-chest-"+dd(-1), version=1, creator="demo-seed"))
    # invitations
    inv = [(1,2001,1,1,1,d(-3,10,30),"PHONE","NO_ANSWER",None,"首次拨打无人接听",d(-2,15,0),3,"通话记录：未接通"),(2,2001,1,1,2,d(-2,15,30),"PHONE","WILLING","FAMILY_ESCORT","接通本人，已解释心电结果，愿意由家属陪同到院",None,3,"通话记录 3 分 12 秒"),
           (3,2002,None,2,1,d(-1,16,0),"PHONE","BUSY",None,"占线",d(0,10,0),3,"通话记录：占线"),(4,2002,None,2,2,d(0,10,10),"PHONE","NO_ANSWER",None,"无人接听",d(1,10,0),3,"通话记录：未接通"),
           (5,1002,None,None,1,d(-6,10,0),"PHONE","NO_ANSWER",None,"无人接听",d(-5,10,0),3,"通话记录"),(6,1002,None,None,2,d(-5,10,0),"PHONE","NO_ANSWER",None,"无人接听",d(-4,10,0),3,"通话记录"),(7,1002,None,None,3,d(-4,10,0),"SMS","NO_ANSWER",None,"短信无回复",d(-1,10,0),3,"短信截图"),
           (8,1003,None,None,1,d(-9,11,0),"PHONE","UNDECIDED","UNDECIDED","患者担心费用，约定再联系",d(-1,10,0),3,"通话记录 5 分钟")]
    for id_, pid, sid, camp, rnd, at, m, res, mode, summ, nxt, actor, ev in inv:
        out.append(ins("invitation", id=id_, hospital_id=1, patient_id=pid, screening_id=sid, campaign_id=camp, round=rnd, invited_at=at, method=m, result=res, planned_visit_mode=mode, summary=summ, next_invite_at=nxt, actor_id=actor, evidence=ev, request_key="invite-%d-%d" % (pid, rnd), creator="demo-seed"))
    # appointments (+ revisit tasks)
    appts = [(1,2001,40011,2,"OUTPATIENT","GREEN_CHANNEL",d(1,9,30),"心血管内科",2,"REMINDED",d(0,9,0),None,None,None,None,None,"绿色通道预约单 A-001"),
             (2,1001,40012,None,"REVISIT","STAFF_BOOKED",d(-1,10,0),"心血管内科",2,"COMPLETED",d(-2,9,0),d(-1,10,5),True,None,"OUTPATIENT_TREATED","医生调整随访计划","门诊签到记录"),
             (3,1003,40013,None,"EXAM","STAFF_BOOKED",d(-3,8,30),"心血管内科",2,"NO_SHOW",d(-4,9,0),None,None,"COST",None,"患者电话表示费用顾虑","预约记录"),
             (4,2002,40014,None,"OUTPATIENT","SELF_BOOKED",d(3,14,0),"内科",10,"BOOKED",None,None,None,None,None,None,"患者自行预约，运营核对")]
    for id_, pid, tid, inv_id, at_type, ch, at, dept, clin, status, remind, arrived, eff, nsr, outcome, note, ev in appts:
        tstatus = {"REMINDED":"BOOKED","BOOKED":"BOOKED","COMPLETED":"COMPLETED","NO_SHOW":"NO_SHOW"}[status]
        out.append(ins("care_task", id=tid, hospital_id=1, patient_id=pid, task_type="REVISIT", title="预约到诊："+dept, priority="P1" if pid in (2001,1001) else "P2", status=tstatus, assignee_id=3, doctor_id=clin, due_at=at, appointment_id=id_, reminder_sent_at=remind, completed_at=arrived if status == "COMPLETED" else None, outcome=outcome, evidence=ev, request_key="appointment-appt-%d" % id_, version=1, creator="demo-seed"))
        out.append(ins("appointment", id=id_, hospital_id=1, patient_id=pid, task_id=tid, invitation_id=inv_id, appointment_type=at_type, channel=ch, appointment_at=at, department=dept, clinician_id=clin, status=status, reminder_sent_at=remind, arrived_at=arrived, is_effective=bool(eff), no_show_reason=nsr, outcome=outcome, outcome_note=note, evidence=ev, actor_id=3, request_key="appt-%d" % id_, version=1, creator="demo-seed"))
    # enrollments
    out.append(ins("service_enrollment", id=1, hospital_id=1, patient_id=1001, package_id=3, order_no="DEMO-ORD-0001", signed_at=d(-40,14,0), start_date=dd(-40), end_date=dd(325), status="ACTIVE", activated_at=d(-40,14,30), activated_by=1, consent_at=d(-40,14,0), consent_evidence="虚构签约同意书扫描件", summary="演示重点管理包", request_key="enroll-1001-premium", version=1, creator="demo-seed"))
    out.append(ins("service_enrollment", id=2, hospital_id=1, patient_id=1002, package_id=2, order_no="DEMO-ORD-0002", signed_at=d(-370,10,0), start_date=dd(-370), end_date=dd(-5), status="EXPIRED", activated_at=d(-370,10,30), activated_by=1, consent_at=d(-370,10,0), consent_evidence="虚构签约同意书", summary="演示标准包，已到期待续", closed_at=d(-5,0,0), close_reason="服务期满", request_key="enroll-1002-standard", version=2, creator="demo-seed"))
    out.append(ins("service_enrollment", id=3, hospital_id=1, patient_id=2001, package_id=1, order_no=None, signed_at=d(-1,17,0), status="PENDING_ACTIVATION", consent_at=d(-1,17,0), consent_evidence="电话口头同意，录音编号 DEMO-REC-3", summary="到院后激活", request_key="enroll-2001-basic", version=0, creator="demo-seed"))
    # referrals
    out.append(ins("referral", id=1, hospital_id=1, patient_id=2001, direction="INBOUND", referral_type="UPWARD", from_org_id=3, to_org_id=1, reason="社区心电网络发现房颤，转上级医院复核", risk_level="HIGH", initiated_at=d(-3,11,0), sla_due_at=d(4,11,0), status="ACCEPTED", accepted_at=d(-3,12,0), evidence="社区转诊单 DEMO-REF-001", actor_id=3, request_key="ref-2001-in", version=1, creator="demo-seed"))
    out.append(ins("referral", id=2, hospital_id=1, patient_id=1001, direction="OUTBOUND", referral_type="DOWNWARD", from_org_id=1, to_org_id=3, reason="病情稳定，下转社区继续随访", risk_level="MEDIUM", initiated_at=d(-20,10,0), sla_due_at=d(10,10,0), status="FEEDBACK_RECORDED", accepted_at=d(-19,9,0), arrived_at=d(-15,10,0), feedback_department="全科", feedback_clinician_id=11, feedback_diagnosis="房颤，抗凝治疗中", feedback_disposition="社区每月随访，异常回转", feedback_at=d(-15,11,0), evidence="社区反馈单 DEMO-REF-002", actor_id=1, request_key="ref-1001-out", version=3, creator="demo-seed"))
    # medications
    meds = [(1,1001,"演示抗凝药 A","1 片","每日一次",dd(-40),None,"ACTIVE","HOSPITAL_RECORD","GOOD","出院医嘱，患者自述规律服用"),(2,1001,"演示控率药 B","半片","每日两次",dd(-40),None,"ACTIVE","HOSPITAL_RECORD","PARTIAL","偶有漏服，已转医生"),(3,1002,"演示降压药 C","1 片","每日一次",dd(-300),dd(-30),"STOPPED","PATIENT_REPORT","POOR","患者自行停药，已登记待医生判断"),(4,1003,"演示利尿药 D","1 片","每日一次",dd(-9),None,"ACTIVE","HOSPITAL_RECORD","UNKNOWN","尚未随访核实")]
    for id_, pid, name, dose, freq, s, e, st, src, adh, note in meds:
        out.append(ins("medication", id=id_, hospital_id=1, patient_id=pid, drug_name=name, dosage=dose, frequency=freq, start_date=s, end_date=e, status=st, source=src, adherence=adh, note=note, version=0, creator="demo-seed"))
    # message logs
    logs = [(1,2001,40011,"SMS","SMS_ARRIVAL_REMINDER","温馨提醒：您预约的明日 9:30 心血管内科就诊即将到期，请携带资料到门诊二楼报到。",d(0,9,0),3,"短信平台发送截图 DEMO-SMS-1"),(2,1002,None,"SMS","SMS_FOLLOWUP_REMINDER","您好，健康管理团队将于近日对您进行例行随访，请准备自测记录。",d(-4,10,0),3,"短信平台发送截图 DEMO-SMS-2"),(3,1003,None,"PHONE_NOTE",None,"电话留言：请回电健康管理团队，协助安排检查。",d(-2,15,0),3,"通话记录")]
    for id_, pid, tid, ch, code, content, at, actor, ev in logs:
        out.append(ins("message_log", id=id_, hospital_id=1, patient_id=pid, task_id=tid, channel=ch, template_code=code, content=content, sent_at=at, actor_id=actor, evidence=ev, request_key="msg-%d" % id_, creator="demo-seed"))
    # patient lifecycle alignment with ledgers
    out.append(upd("patient", 2001, lifecycle="BOOKED", risk_level="HIGH", last_contact_at=d(-2,15,30)))
    out.append(upd("patient", 2002, lifecycle="ENROLLED"))
    out.append(upd("patient", 1001, lifecycle="MANAGING", service_package_id=3))
    out.append(upd("patient", 1002, lifecycle="REVISIT_DUE", service_package_id=2))
    out.append(upd("patient", 1003, lifecycle="CONTACTED", service_package_id=None))
    return out

def apply(path, lines):
    text = open(path, encoding="utf-8").read()
    block = MARK + "\n" + "\n".join(lines) + "\n" + END + "\n"
    if MARK in text:
        text = re.sub(re.escape(MARK) + r".*?" + re.escape(END) + r"\n", block, text, flags=re.S)
    else:
        text = text.rstrip("\n") + "\n" + block
    open(path, "w", encoding="utf-8", newline="\n").write(text)
    print("updated", os.path.relpath(path, ROOT), len(lines), "statements")

if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("--date", default=dt.date.today().isoformat()); args = ap.parse_args()
    today = dt.date.fromisoformat(args.date)
    base = base_block(today); dev = dev_block(today)
    for name in ("sql/DML.sql", "sql/DML-local.sql"): apply(os.path.join(ROOT, name), base)
    for name in ("sql/dev/DML.sql", "sql/dev/DML-local.sql"): apply(os.path.join(ROOT, name), dev)
