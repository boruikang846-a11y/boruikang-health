"""Generate the bulk fictional demo block in dev DML (MySQL/H2), so every console page has enough rows to look at.

Usage: python tools/generate-bulk-seed.py
Writes the block between "-- BEGIN BULK DEMO DATA 1.9" and "-- END BULK DEMO DATA 1.9" in sql/dev/DML.sql and
sql/dev/DML-local.sql; re-running replaces only that block. Never connects to a database.
Everything is fictional: names are random combinations, phone numbers start with 000 and cannot be dialled, WeChat ids
are made up, and clinical texts are marked as demo. Dates are relative to the time the DML is executed. Fixed ids live
in ranges no earlier block uses, and every row is insert-if-absent, so loading the block into a database that already
has the earlier seed only adds rows.
"""
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MARK = '-- BEGIN BULK DEMO DATA 1.9'
END = '-- END BULK DEMO DATA 1.9'
CREATOR = 'demo-bulk-1.9'
PATIENTS = 500
rnd = random.Random(20261004)

class Sql(str):
    pass
def value(v):
    if isinstance(v, Sql): return str(v)
    if v is None: return 'NULL'
    if isinstance(v, bool): return '1' if v else '0'
    if isinstance(v, (int, float)): return str(v)
    return "'" + str(v).replace("'", "''") + "'"
def ago(days, hours=0):
    return Sql(f"CURRENT_TIMESTAMP - INTERVAL '{days}' DAY - INTERVAL '{hours}' HOUR")
def future(days, hours=0):
    return Sql(f"CURRENT_TIMESTAMP + INTERVAL '{days}' DAY + INTERVAL '{hours}' HOUR")
def minutes(m):
    return Sql(f"CURRENT_TIMESTAMP - INTERVAL '{m}' MINUTE")
def day(offset):
    return Sql(f"CURRENT_DATE + INTERVAL '{offset}' DAY")
def lines(*parts):
    return Sql('CONCAT(' + ',CHAR(10),'.join(value(p) for p in parts) + ')')
rows = []
def insert(table, **fields):
    fields.setdefault('hospital_id', 1)
    fields.setdefault('creator', CREATOR)
    rows.append(f"INSERT INTO {table} ({','.join(fields)}) VALUES ({','.join(value(v) for v in fields.values())}) ON DUPLICATE KEY UPDATE id=id;")
def pick(weighted):
    total = sum(w for _, w in weighted); x = rnd.uniform(0, total)
    for item, w in weighted:
        x -= w
        if x <= 0: return item
    return weighted[-1][0]

departments = ['心血管内科','内分泌科','呼吸内科','神经内科','肾内科','消化内科','康复医学科','老年医学科','骨科','普通外科','全科','健康管理中心']
diseases = {'心血管内科': ['冠心病','高血压','心房颤动','心力衰竭'], '内分泌科': ['2 型糖尿病','甲状腺功能异常','血脂异常'], '呼吸内科': ['慢阻肺','哮喘','肺结节随访'],
            '神经内科': ['脑卒中恢复期','短暂性脑缺血发作'], '肾内科': ['慢性肾病','高血压肾损害'], '消化内科': ['慢性胃炎','脂肪肝'], '康复医学科': ['术后康复','卒中康复'],
            '老年医学科': ['多病共存','跌倒风险评估'], '骨科': ['骨折术后','骨质疏松'], '普通外科': ['胆囊术后','疝修补术后'], '全科': ['慢病综合管理'], '健康管理中心': ['体检异常随访']}

# Hospital staff added for the bulk block: one responsible doctor per department, two operators and two nurses.
# Operators belong to our team; the cardiology doctors 2/5 and the earlier operators and nurses come from older blocks.
new_doctors = [(30 + k, f'doctor_{k + 5:02d}', f'演示{dept}医生', dept) for k, dept in enumerate(departments)]
for id_, username, name, dept in new_doctors:
    insert('health_account', id=id_, username=username, password='HealthDemo@2026!', real_name=name, role_code='DOCTOR', department=dept, is_enabled=1, gmt_create=ago(60))
for id_, username, name, role, dept, wecom in [(42, 'operator_e', '演示运营专员戊', 'OPERATOR', None, 'demo.operator.e'), (43, 'operator_f', '演示运营专员己', 'OPERATOR', None, 'demo.operator.f'),
                                             (44, 'nurse_c', '演示护士丙', 'NURSE', '呼吸内科', 'demo.nurse.c'), (45, 'nurse_d', '演示护士丁', 'NURSE', '老年医学科', 'demo.nurse.d')]:
    insert('health_account', id=id_, username=username, password='HealthDemo@2026!', real_name=name, role_code=role, department=dept, is_enabled=1, wecom_user_id=wecom, gmt_create=ago(60))
for id_, wecom in [(20, 'demo.operator.b'), (21, 'demo.operator.c'), (22, 'demo.operator.d'), (6, 'demo.nurse.a'), (23, 'demo.nurse.b')]:
    rows.append(f"UPDATE health_account SET wecom_user_id='{wecom}' WHERE id={id_} AND wecom_user_id IS NULL;")
wecom_of = {3: 'demo.operator.a', 20: 'demo.operator.b', 21: 'demo.operator.c', 22: 'demo.operator.d', 6: 'demo.nurse.a', 23: 'demo.nurse.b',
            42: 'demo.operator.e', 43: 'demo.operator.f', 44: 'demo.nurse.c', 45: 'demo.nurse.d'}
roles = {3: 'OPERATOR', 20: 'OPERATOR', 21: 'OPERATOR', 22: 'OPERATOR', 42: 'OPERATOR', 43: 'OPERATOR', 6: 'NURSE', 23: 'NURSE', 44: 'NURSE', 45: 'NURSE'}
owners = [3, 3, 20, 21, 22, 42, 43, 6, 23, 44, 45]
dept_doctors = {dept: ([2, 5, 30] if dept == '心血管内科' else [30 + k]) for k, dept in enumerate(departments)}

# Organisations, campaigns, channels, knowledge and templates.
orgs = [(7, '演示南湖社区卫生服务中心', 'COMMUNITY', 1), (8, '演示桥东社区卫生服务中心', 'COMMUNITY', 1), (9, '演示青石镇卫生院', 'TOWNSHIP', 1), (10, '演示白沙镇卫生院', 'TOWNSHIP', 1),
        (11, '演示柳庄村卫生室', 'VILLAGE', 9), (12, '演示杏林村卫生室', 'VILLAGE', 10), (13, '演示第二体检中心', 'EXAM_CENTER', 1), (14, '演示呼吸专科分中心', 'BRANCH', 1)]
for id_, name, kind, parent in orgs:
    insert('care_org', id=id_, name=name, org_type=kind, parent_id=parent, contact_name='演示联络员', contact_phone=f'000000002{id_:02d}', is_active=1, note='虚构机构，仅用于演示')
campaigns = [(4, '演示：南湖社区高血压随访月', 'DAILY_INVITATION', 7, 'ACTIVE', 150, -20, 40, 3), (5, '演示：青石镇糖尿病早干预', 'EARLY_INTERVENTION', 9, 'ACTIVE', 90, -10, 50, 20),
             (6, '演示：第二体检中心异常结果回访', 'EARLY_INTERVENTION', 13, 'ACTIVE', 200, -30, 30, 21), (7, '演示：白沙镇慢阻肺义诊', 'CLINIC_EVENT', 10, 'CLOSED', 120, -80, -70, 22),
             (8, '演示：杏林村卒中风险筛查', 'SCREENING', 12, 'PLANNED', 100, 10, 40, 42), (9, '演示：桥东社区老年综合评估', 'SCREENING', 8, 'ACTIVE', 80, -5, 55, 43)]
for id_, name, kind, org, status, target, start, end, owner in campaigns:
    insert('campaign', id=id_, name=name, campaign_type=kind, org_id=org, location=name.split('：')[1][:6], starts_on=day(start), ends_on=day(end), owner_id=owner, status=status, target_count=target, note='虚构活动', version=0)
sources = ['OUTPATIENT', 'DISCHARGE', 'PRIMARY_CARE', 'EXAM', 'CAMPAIGN']
channels = {}
for k, dept in enumerate(departments):
    for j, label in enumerate(['门诊二维码', '出院随访卡']):
        id_ = 200 + k * 2 + j
        channels.setdefault(dept, []).append(id_)
        insert('intake_channel', id=id_, title=f'{dept}{label}（演示）', source=sources[(k + j) % 5], department=dept, doctor_id=dept_doctors[dept][0],
               owner_id=owners[(k * 2 + j) % len(owners)], token=f'health-demo-bulk-channel-{id_}', is_active=0 if id_ % 9 == 0 else 1,
               wecom_config_id=f'mock-config-{id_}' if j == 0 else None, wecom_qr_url=f'mock://wecom/contact-way/ch{id_}' if j == 0 else None,
               official_qr_url=f'mock://official/qrcode/ch{id_}' if j == 1 else None, gmt_create=ago(90))
topics = ['复诊资料准备', '居家自测记录方法', '出院后注意事项', '用药记录与提醒', '饮食与运动建议', '如何联系服务团队']
for k, dept in enumerate(departments):
    for j in range(2):
        id_ = 200 + k * 2 + j
        published = (k + j) % 3 != 0
        insert('knowledge_entry', id=id_, kind='EDUCATION', department=dept, title=f'{dept}{topics[(k + j) % 6]}（演示）',
               content='本条为虚构演示宣教：请按医院要求准备原报告和当前问题清单，自测记录请写明时间。具体诊疗安排以责任医生意见为准，本条不提供诊断、处方或用药调整。',
               source='虚构演示宣教；不代表医院临床批准', version=1, status='PUBLISHED' if published else 'DRAFT',
               reviewer_id=dept_doctors[dept][0] if published else None, reviewed_at=ago(20 + k) if published else None, gmt_create=ago(40))
mp_templates = [(103, 'DEMO_MP_FOLLOWUP', 'FOLLOWUP_REMINDER', '随访提醒（演示模板消息）', 'demo-template-followup', ['thing1=随访提醒', 'time2={随访日期}', 'thing3=健康管理团队将电话联系您，请留意来电']),
                (104, 'DEMO_MP_ARRIVAL', 'ARRIVAL_REMINDER', '到诊提醒（演示模板消息）', 'demo-template-arrival', ['thing1=到诊提醒', 'time2={就诊时间}', 'thing3=请携带身份证和既往报告按时报到']),
                (105, 'DEMO_MP_REPORT', 'FIRST_CONTACT', '报告解读预约（演示模板消息）', 'demo-template-report', ['thing1=报告解读预约', 'thing2={科室}', 'thing3=团队将协助您预约医生解读报告'])]
for id_, code, scene, title, external, parts in mp_templates:
    insert('message_template', id=id_, code=code, channel='MP_TEMPLATE', scene=scene, title=title, content=lines(*parts), is_active=1, version=0, external_template_id=external)
wechat_texts = [(106, 'DEMO_WECHAT_REVISIT', 'REVISIT_REMINDER', '复诊提醒（微信演示）', '您好，按医生安排您近期需要复诊。如还没有预约，回复「预约」或告诉我们方便的时间，团队协助安排。'),
                (107, 'DEMO_WECHAT_ARRIVAL', 'ARRIVAL_REMINDER', '到诊提醒（微信演示）', '温馨提醒：您预约的就诊时间临近，请携带身份证、既往检查报告和正在使用的药物按时报到。'),
                (108, 'DEMO_WECHAT_FIRST', 'FIRST_CONTACT', '首次联系（微信演示）', '您好，这里是医院健康管理团队（演示）。之后的随访提醒和复诊安排会通过这里和电话通知您。')]
for id_, code, scene, title, content in wechat_texts:
    insert('message_template', id=id_, code=code, channel='WECHAT', scene=scene, title=title, content=content, is_active=1, version=0, external_template_id='')

# Patients and their records, tasks, contacts and messages.
surnames = list('王李张刘陈杨黄赵吴周徐孙马朱胡郭何高林罗郑梁谢宋唐许韩冯邓曹彭曾肖田董袁潘于蒋蔡余杜叶程苏魏吕丁任沈姚卢姜崔钟谭陆汪范金石廖贾夏韦付方白邹孟熊秦邱江尹薛闫段雷侯龙史陶黎贺顾毛郝龚邵万钱严覃武戴莫孔向汤')
given = list('建国华明丽娟秀英玉兰桂芳志强海燕文静春梅德福永红淑珍俊杰晓东凤琴金凤国庆雪梅宏伟丽华小平亚军宝山翠萍子涵思远一鸣欣怡浩然佳琪')
districts = ['东城', '西湖', '南山', '北塘', '新港', '青山', '临江', '高新']
lifecycles = [('MANAGING', 34), ('ENROLLED', 10), ('CONTACTED', 9), ('BOOKED', 8), ('ARRIVED', 5), ('REVISIT_DUE', 10), ('PAUSED', 6), ('TRANSFERRED', 4), ('LOST', 6), ('CLOSED', 8)]
risks = [('UNKNOWN', 8), ('LOW', 25), ('MEDIUM', 32), ('HIGH', 25), ('CRITICAL', 10)]
states = ['PENDING', 'IN_PROGRESS', 'PENDING_REVIEW', 'APPROVED', 'CONTACTED', 'COMPLETED', 'REJECTED', 'COMPLETED', 'PENDING_REVIEW', 'CANCELLED']
failed = ['NO_ANSWER', 'BUSY', 'WRONG_NUMBER', 'REFUSED', 'IDENTITY_UNVERIFIED', 'FAMILY_ANSWERED']
advice_text = '【虚构已审核问询】请核对原医嘱执行中遇到的困难，记录近期反馈及需要医生解答的问题，核实复诊安排。'
terminal = ('PAUSED', 'TRANSFERRED', 'LOST', 'CLOSED')
patients = []
appointment_id, invitation_id, enrollment_id, referral_id, medication_id, log_id, screening_id = 1001, 1001, 1001, 1001, 1001, 1001, 1001
for i in range(PATIENTS):
    pid = 60001 + i
    dept = departments[i % 12]
    doctor = dept_doctors[dept][(i // 12) % len(dept_doctors[dept])]
    owner = owners[(i * 7 + i // 12) % len(owners)]
    lifecycle = pick(lifecycles)
    risk = pick(risks)
    age = rnd.randint(28, 89)
    gender = rnd.choice(['MALE', 'FEMALE'])
    name = rnd.choice(surnames) + rnd.choice(given) + (rnd.choice(given) if rnd.random() < 0.7 else '')
    scene = pick([('DISCHARGE', 40), ('OUTPATIENT', 30), ('EXAM', 12), ('ECG_NETWORK', 8), ('MANUAL', 10)])
    ptype = 'DISCHARGED' if scene == 'DISCHARGE' else 'INPATIENT' if i % 23 == 0 else 'OUTPATIENT' if scene in ('OUTPATIENT', 'ECG_NETWORK') else 'UNKNOWN'
    source = 'MANUAL' if scene == 'MANUAL' else 'FILE_IMPORT' if i % 17 == 0 else 'HOSPITAL_MOCK'
    joined = rnd.randint(6, 150)
    package = pick([(None, 35), (1, 30), (2, 22), (3, 13)]) if lifecycle not in ('ENROLLED', 'CONTACTED') + terminal else None
    disease = rnd.choice(diseases[dept])
    contacted_days = rnd.randint(0, min(joined, 20))
    patients.append(dict(id=pid, dept=dept, doctor=doctor, owner=owner, lifecycle=lifecycle, name=name, joined=joined, risk=risk, approved=[]))
    insert('patient', id=pid, source_system=source, hospital_patient_id=None if source == 'MANUAL' else f'DEMO-BULK-{i + 1:04d}', name=name, gender=gender, age=age,
           phone=f'0009{i + 1:07d}', department=dept, disease=disease, risk_level=risk, lifecycle=lifecycle, doctor_id=doctor, owner_id=owner,
           channel_id=channels[dept][i % 2], service_package_id=package, consent_at=ago(joined - 1) if lifecycle != 'ENROLLED' else None,
           consent_version='HEALTH-MVP-1' if lifecycle != 'ENROLLED' else None, consent_evidence='虚构电话口头同意记录' if lifecycle != 'ENROLLED' else None,
           birth_date=f'{2026 - age}-{rnd.randint(1, 12):02d}-{rnd.randint(1, 28):02d}', address=f'演示市{rnd.choice(districts)}区演示路{rnd.randint(1, 300)}号',
           emergency_contact=f'{name[0]}家属（演示）' if i % 3 else None, emergency_phone=f'0008{i + 1:07d}' if i % 3 else None,
           inpatient_no=f'DEMO-ZY-{i + 1:05d}' if ptype in ('INPATIENT', 'DISCHARGED') else None, patient_type=ptype, source_scene=scene,
           org_id=rnd.choice([1, 2, 3, 4, 6, 7, 8, 9, 13, None]), last_contact_at=ago(contacted_days, rnd.randint(1, 8)) if lifecycle not in ('ENROLLED',) else None,
           lost_since=ago(rnd.randint(5, 30)) if lifecycle == 'LOST' else None,
           tags=',演示,' + ('重点随访,' if risk in ('HIGH', 'CRITICAL') else '') + ('家属协助,' if i % 5 == 0 else ''),
           note='完全虚构的批量演示数据。姓名为随机组合，联系电话不可用于真实联系；风险由演示数据预设，不是系统诊断。', gmt_create=ago(joined))
    if package:
        insert('service_enrollment', id=enrollment_id, patient_id=pid, package_id=package, order_no=f'DEMO-BULK-ORD-{enrollment_id}', signed_at=ago(joined - 1), start_date=day(-(joined - 1)),
               end_date=day(-(joined - 1) + [0, 90, 365, 365][package]), status='ACTIVE', activated_at=ago(joined - 1, -1), activated_by=1, consent_at=ago(joined - 1),
               consent_evidence='虚构签约同意书', summary='演示签约', request_key=f'bulk-enroll-{pid}', version=1, gmt_create=ago(joined - 1))
        enrollment_id += 1
    elif lifecycle in ('ENROLLED', 'CONTACTED') and i % 3 == 0:
        insert('service_enrollment', id=enrollment_id, patient_id=pid, package_id=rnd.choice([1, 2]), signed_at=ago(2), status='PENDING_ACTIVATION', consent_at=ago(2),
               consent_evidence='电话口头同意（虚构录音编号）', summary='到院后激活', request_key=f'bulk-enroll-{pid}', version=0, gmt_create=ago(2))
        enrollment_id += 1

    record = 600000 + i * 4
    days = max(3, joined - rnd.randint(0, 3))
    primary = 'DISCHARGE' if scene == 'DISCHARGE' or ptype in ('INPATIENT', 'DISCHARGED') else 'OUTPATIENT'
    seen = i % 2 == 0
    insert('care_record', id=record, patient_id=pid, record_type=primary, occurred_at=ago(days),
           content=f'【虚构{"出院小结" if primary == "DISCHARGE" else "门诊记录"} B{i + 1:04d}】{disease}院后随访示例。服务团队需核对原报告、患者当前反馈和复诊安排；原医嘱中的具体用法须向责任医生确认。本示例无真实处方、临床阈值或诊断结论。',
           medication_cycle_days=None if i % 4 == 0 else [7, 14, 30][i % 3], next_visit_date=day(rnd.randint(-10, 30)), source_system='MANUAL' if source == 'MANUAL' else 'HOSPITAL_MOCK',
           external_id=f'DEMO-BULK-R1-{i + 1:04d}', doctor_viewed_at=ago(days - 1) if seen else None, doctor_viewer_id=doctor if seen else None,
           doctor_opinion='演示意见：已阅原报告，随访请重点核对复诊安排与执行原医嘱时的困难。' if seen and i % 4 == 0 else None, gmt_create=ago(days))
    insert('care_record', id=record + 1, patient_id=pid, record_type='EXAM' if i % 2 else 'OUTPATIENT', occurred_at=ago(days + rnd.randint(3, 40)),
           content='【虚构记录】用于检查病程时间线与关联原报告。请勿据此作医疗决策。', source_system='MANUAL' if source == 'MANUAL' else 'HOSPITAL_MOCK', external_id=f'DEMO-BULK-R2-{i + 1:04d}',
           doctor_viewed_at=ago(days) if i % 3 else None, doctor_viewer_id=doctor if i % 3 else None, gmt_create=ago(days))
    for k in range(i % 3):
        insert('care_record', id=record + 2 + k, patient_id=pid, record_type='OBSERVATION', occurred_at=ago(k * 3 + 1, rnd.randint(1, 10)),
               content='虚构人工录入体征，系统不据此自动判断风险。', systolic=rnd.randint(108, 158), diastolic=rnd.randint(64, 96), heart_rate=rnd.randint(58, 98),
               weight=rnd.randint(48, 92), glucose=round(rnd.uniform(4.6, 9.8), 1) if dept == '内分泌科' else None, source_system='DEMO')

    # Follow-up nodes: statuses follow the same rules as the 1.3 block (reviewer is the responsible doctor; contacted needs a connected call).
    for node, offset in enumerate([3, 7, 30]):
        task = 700000 + i * 10 + node
        status = ('COMPLETED' if node == 0 else 'CANCELLED') if lifecycle in terminal else states[(i * 3 + node * 7 + i // 5) % 10]
        if offset > joined + 2 and status not in ('CANCELLED',): status = 'PENDING'
        elif joined - offset > 10 and status not in ('COMPLETED', 'CANCELLED') and rnd.random() < 0.85: status = 'COMPLETED'  # a working team closes old nodes
        reviewed = status in ('APPROVED', 'CONTACTED', 'COMPLETED')
        connected = status in ('CONTACTED', 'COMPLETED')
        retry = status in ('PENDING', 'IN_PROGRESS', 'APPROVED') and i % 3 == 0 and offset <= joined
        result = 'CONNECTED' if connected else failed[(i + node) % 6] if retry else None
        due = joined - offset
        if reviewed: patients[-1]['approved'].append(task)
        insert('care_task', id=task, patient_id=pid, task_type='FOLLOWUP', title=f'{dept} · D{offset} 随访（演示）', priority=['P1', 'P2', 'P3'][(i + node) % 3], status=status,
               assignee_id=owner, doctor_id=doctor, due_at=ago(due), record_id=record, followup_stage=f'D{offset}',
               draft_text=None if status == 'PENDING' else advice_text, draft_origin=None if status == 'PENDING' else ['MANUAL', 'TEMPLATE', 'AI'][i % 3],
               approved_text=advice_text if reviewed else None, reviewer_id=doctor if reviewed else None, reviewed_at=ago(max(due, 0) + 1, 3) if reviewed else None,
               review_note='演示审核：已核对关联报告。' if reviewed else '演示退回：请补充患者需要核实的问题。' if status == 'REJECTED' else None,
               contact_result=result, identity_verified=1 if connected else 0, next_contact_at=future(1 + i % 3) if retry else None,
               handover_status=('ACKNOWLEDGED' if i % 2 else 'PENDING') if status == 'COMPLETED' else None,
               doctor_feedback='演示接收：已查看随访记录，请团队按记录安排继续跟进。' if status == 'COMPLETED' and i % 2 else None,
               acknowledged_at=ago(max(due, 0), -2) if status == 'COMPLETED' and i % 2 else None, completed_at=ago(max(due, 0)) if status == 'COMPLETED' else None,
               outcome='演示完成：反馈已记录，需要医生处理的问题已交接。' if status == 'COMPLETED' else '演示暂停或取消，保留历史记录。' if status == 'CANCELLED' else None,
               evidence='虚构电话记录：已核实本人身份并按审核内容完成问询。' if connected else None, request_key=f'demo-bulk-followup-{pid}-{node}', gmt_create=ago(joined))
        if connected or retry:
            method = 'WECHAT' if i % 5 == 0 and connected else 'PHONE'
            insert('contact_attempt', id=task, patient_id=pid, task_id=task, actor_id=owner, contact_at=ago(max(due, 0), 1), method=method, result=result,
                   identity_verified=1 if connected else 0, report_reviewed=1 if connected else 0, recipient_role=('AUTHORIZED_CONTACT' if i % 7 == 0 else 'PATIENT') if connected else None,
                   reason=None if connected else '虚构联系失败，尚未完成身份核对与问询。', next_contact_at=future(1 + i % 3) if retry else None,
                   next_plan='核对联系方式与联系意愿，再由工作人员处理。' if retry else None,
                   medication_feedback='演示反馈：待核对原医嘱中的安排，无调药建议。' if connected else None,
                   patient_questions=rnd.choice(['演示问题：希望确认复诊需携带的资料。', '演示问题：想了解检查结果什么时候能看。', '演示问题：询问下次随访时间。']) if connected else None,
                   satisfaction=rnd.choice([4, 5, 5, 3]) if status == 'COMPLETED' else None,
                   evidence='虚构电话演示凭证，无真实外呼。' if method == 'PHONE' else '虚构微信沟通记录，演示用。', request_key=f'demo-bulk-contact-{task}')
        if connected:
            insert('care_message', id=task, patient_id=pid, task_id=task, sender_id=owner, sender_role=roles[owner], direction='STAFF_TO_PATIENT', content=advice_text, gmt_create=ago(max(due, 0), 1))

    # Revisit: tied to an appointment for about half of the managed patients, otherwise a plain coordination task.
    revisit = 700000 + i * 10 + 3
    if lifecycle not in terminal and lifecycle != 'ENROLLED' and i % 2 == 0:
        appt_status = pick([('BOOKED', 25), ('REMINDED', 15), ('ARRIVED', 10), ('COMPLETED', 30), ('NO_SHOW', 12), ('CANCELLED', 8)])
        when = rnd.randint(1, 14) if appt_status in ('BOOKED', 'REMINDED') else -rnd.randint(1, 30)
        task_status = {'REMINDED': 'BOOKED'}.get(appt_status, appt_status)
        arrived = appt_status in ('ARRIVED', 'COMPLETED')
        at = future(when, rnd.randint(0, 7)) if when > 0 else ago(-when, rnd.randint(0, 7))
        outcome = rnd.choice(['OUTPATIENT_TREATED', 'EXAM_ORDERED', 'ADMITTED', 'REFERRED', 'NO_ACTION']) if appt_status == 'COMPLETED' else None
        reason = rnd.choice(['DISTANCE', 'COST', 'NO_SLOT', 'FORGOT', 'EXTERNAL_HOSPITAL', 'ILLNESS']) if appt_status == 'NO_SHOW' else None
        evidence = f'虚构医院核验记录 DEMO-BULK-ARRIVAL-{appointment_id}' if arrived else '演示预约：已核对科室、时间和地点。'
        insert('care_task', id=revisit, patient_id=pid, task_type='REVISIT', title=f'预约到诊：{dept}（演示）', priority='P1' if risk in ('HIGH', 'CRITICAL') else 'P2', status=task_status,
               assignee_id=owner, doctor_id=doctor, due_at=at, record_id=record, appointment_id=appointment_id, reminder_sent_at=ago(-when + 1) if appt_status == 'REMINDED' else None,
               completed_at=at if appt_status == 'COMPLETED' else None, outcome=outcome, evidence=evidence, request_key=f'appointment-appt-{appointment_id}', version=1, gmt_create=ago(joined))
        insert('appointment', id=appointment_id, patient_id=pid, task_id=revisit, appointment_type=rnd.choice(['OUTPATIENT', 'REVISIT', 'REVISIT', 'EXAM', 'SPECIALIST_CLINIC']),
               channel=rnd.choice(['STAFF_BOOKED', 'STAFF_BOOKED', 'SELF_BOOKED', 'ONLINE', 'GREEN_CHANNEL']), appointment_at=at, department=dept, clinician_id=doctor, status=appt_status,
               reminder_sent_at=ago(-when + 1) if appt_status == 'REMINDED' else None, arrived_at=at if arrived else None, is_effective=1 if appt_status == 'COMPLETED' else 0,
               no_show_reason=reason, outcome=outcome, outcome_note='演示结果：医生已按门诊情况处理。' if outcome else '演示：患者电话说明原因，待重新安排。' if reason else None,
               evidence=evidence, actor_id=owner, request_key=f'bulk-appt-{appointment_id}', version=1, gmt_create=ago(max(-when, 0) + rnd.randint(2, 6)))
        appointment_id += 1
    else:
        state = 'CANCELLED' if lifecycle in terminal else ['PENDING', 'BOOKED', 'PENDING', 'NO_SHOW'][i % 4]
        insert('care_task', id=revisit, patient_id=pid, task_type='REVISIT', title=f'{dept}复诊协调与到院核验（演示）', priority='P2', status=state, assignee_id=owner, doctor_id=doctor,
               due_at=future(rnd.randint(1, 20)) if state != 'NO_SHOW' else ago(rnd.randint(1, 10)), record_id=record,
               evidence='演示预约：已核对科室、时间和地点。' if state in ('BOOKED', 'NO_SHOW') else None,
               outcome='演示未到院：工作人员需核实原因和下一次安排。' if state == 'NO_SHOW' else '演示取消预约。' if state == 'CANCELLED' else None,
               request_key=f'demo-bulk-revisit-{pid}', gmt_create=ago(joined))
    if i % 4 == 1 and lifecycle not in terminal:
        state = ['PENDING', 'IN_PROGRESS', 'ESCALATED', 'COMPLETED', 'PENDING'][(i // 4) % 5]
        source_kind = ['PATIENT_REPORT', 'ECG', 'RULE', 'STAFF', 'PATIENT_REPORT'][(i // 4) % 5]
        due_hours = rnd.randint(-20, 20)
        insert('care_task', id=revisit + 1, patient_id=pid, task_type='ALERT', title=rnd.choice(['患者电话反馈症状变化（演示）', '心电预警待核实（演示）', '自测指标连续偏高待核实（演示）', '家属反映近期不适（演示）']),
               priority=['P0', 'P1', 'P1', 'P2'][i % 4], status=state, alert_source=source_kind, assignee_id=owner, doctor_id=doctor,
               due_at=future(0, due_hours) if due_hours > 0 else ago(0, -due_hours), sla_due_at=future(0, due_hours) if due_hours > 0 else ago(0, -due_hours),
               ack_at=ago(0, 2) if state in ('IN_PROGRESS', 'ESCALATED', 'COMPLETED') else None, record_id=record,
               disposition=rnd.choice(['OBSERVE', 'FALSE_ALARM', 'OUTPATIENT', 'OTHER']) if state == 'COMPLETED' else None,
               outcome='虚构处置：责任医生已核对并记录处理结果。' if state == 'COMPLETED' else None, completed_at=ago(0, 1) if state == 'COMPLETED' else None,
               request_key=f'demo-bulk-alert-{pid}', gmt_create=ago(1))
    if i % 4 == 2 and lifecycle not in terminal:
        state = ['PENDING', 'PENDING_REVIEW', 'APPROVED', 'COMPLETED'][(i // 4) % 4]
        reviewed = state in ('APPROVED', 'COMPLETED')
        text = '请按医院要求准备原始报告和近期问题清单，复诊时间请向服务团队核实。（虚构已审核答复）'
        if reviewed: patients[-1]['approved'].append(revisit + 2)
        insert('care_task', id=revisit + 2, patient_id=pid, task_type='CONSULTATION', title=rnd.choice(['咨询 · 复诊需要准备什么（演示）', '咨询 · 检查结果何时出来（演示）', '咨询 · 想换复诊时间（演示）']),
               priority='P2', status=state, assignee_id=owner, doctor_id=doctor, due_at=future(1), record_id=record,
               draft_text=None if state == 'PENDING' else text, draft_origin=None if state == 'PENDING' else 'MANUAL', approved_text=text if reviewed else None,
               reviewer_id=doctor if reviewed else None, reviewed_at=ago(1, 2) if reviewed else None, completed_at=ago(0, 3) if state == 'COMPLETED' else None,
               outcome='演示完成：已按审核答复联系患者。' if state == 'COMPLETED' else None, evidence='虚构电话记录：已核实本人身份并按审核内容答复。' if state == 'COMPLETED' else None,
               contact_result='CONNECTED' if state == 'COMPLETED' else None, identity_verified=1 if state == 'COMPLETED' else 0,
               request_key=f'demo-bulk-consult-{pid}', gmt_create=ago(2))
    if lifecycle in ('ENROLLED', 'CONTACTED', 'BOOKED'):
        done = lifecycle != 'ENROLLED'
        result = 'CONNECTED' if done else rnd.choice(['NO_ANSWER', 'BUSY', None])
        insert('care_task', id=revisit + 4, patient_id=pid, task_type='OUTREACH', title='首次联系并邀约到院', priority='P1' if risk in ('HIGH', 'CRITICAL') else 'P2',
               status='COMPLETED' if done else 'IN_PROGRESS' if result else 'PENDING', assignee_id=owner, doctor_id=doctor, due_at=ago(max(joined - 1, 0)), sla_due_at=ago(max(joined - 1, 0)),
               completed_at=ago(max(joined - 2, 0)) if done else None, outcome='WILLING' if done else None, contact_result=result, identity_verified=1 if done else 0,
               next_contact_at=future(1) if result in ('NO_ANSWER', 'BUSY') else None, request_key=f'outreach-bulk-{pid}', version=0, gmt_create=ago(joined))
        rounds = [('NO_ANSWER', 'PHONE'), ('BUSY', 'PHONE'), ('WILLING', 'PHONE')][: (3 if done else rnd.randint(1, 2))]
        if done and i % 2: rounds = rounds[-1:]
        for r, (res, method) in enumerate(rounds, start=1):
            insert('invitation', id=invitation_id, patient_id=pid, campaign_id=rnd.choice([1, 2, 4, 5, 6, None]), round=r, invited_at=ago(max(joined - r, 0), 2), method=method, result=res,
                   planned_visit_mode=rnd.choice(['SELF', 'FAMILY_ESCORT']) if res == 'WILLING' else None,
                   summary='接通本人，已说明随访安排，愿意到院' if res == 'WILLING' else '未接通，约定再次联系', next_invite_at=ago(max(joined - r - 1, 0)) if res != 'WILLING' else None,
                   actor_id=owner, evidence='虚构通话记录', request_key=f'bulk-invite-{pid}-{r}', gmt_create=ago(max(joined - r, 0), 2))
            invitation_id += 1
    if lifecycle == 'TRANSFERRED' or i % 13 == 0:
        status = pick([('INITIATED', 2), ('ACCEPTED', 3), ('ARRIVED', 2), ('FEEDBACK_RECORDED', 4)])
        outbound = lifecycle == 'TRANSFERRED' or i % 2 == 0
        start = rnd.randint(3, 40)
        insert('referral', id=referral_id, patient_id=pid, direction='OUTBOUND' if outbound else 'INBOUND', referral_type='DOWNWARD' if outbound else 'UPWARD',
               from_org_id=1 if outbound else rnd.choice([3, 7, 8, 9]), to_org_id=rnd.choice([3, 7, 8, 9]) if outbound else 1,
               reason='病情稳定，下转社区继续随访（演示）' if outbound else '基层发现异常，转上级医院复核（演示）', risk_level=risk, initiated_at=ago(start), sla_due_at=ago(start - 7),
               status=status, accepted_at=ago(start - 1) if status != 'INITIATED' else None, arrived_at=ago(start - 3) if status in ('ARRIVED', 'FEEDBACK_RECORDED') else None,
               feedback_department='全科' if status == 'FEEDBACK_RECORDED' else None, feedback_clinician_id=11 if status == 'FEEDBACK_RECORDED' else None,
               feedback_diagnosis='演示反馈：病情稳定' if status == 'FEEDBACK_RECORDED' else None, feedback_disposition='社区每月随访' if status == 'FEEDBACK_RECORDED' else None,
               feedback_at=ago(start - 4) if status == 'FEEDBACK_RECORDED' else None, evidence=f'虚构转诊单 DEMO-BULK-REF-{referral_id}', actor_id=owner,
               request_key=f'bulk-ref-{pid}', version=1, gmt_create=ago(start))
        referral_id += 1
    for k in range(rnd.choice([0, 1, 1, 2, 3])):
        status = 'STOPPED' if k == 2 else 'ACTIVE'
        insert('medication', id=medication_id, patient_id=pid, drug_name=f'演示{["降压药", "降糖药", "调脂药", "抗凝药", "护胃药", "止咳药"][(i + k) % 6]} {chr(65 + k)}',
               dosage=rnd.choice(['1 片', '半片', '2 粒', '1 袋']), frequency=rnd.choice(['每日一次', '每日两次', '每晚一次']), start_date=day(-joined),
               end_date=day(-rnd.randint(1, 10)) if status == 'STOPPED' else None, status=status, source=rnd.choice(['HOSPITAL_RECORD', 'HOSPITAL_RECORD', 'PATIENT_REPORT', 'STAFF']),
               adherence=rnd.choice(['GOOD', 'GOOD', 'PARTIAL', 'POOR', 'UNKNOWN']), note='虚构用药记录，仅用于演示；用法以医院原医嘱为准', version=0, gmt_create=ago(max(joined - 1, 0)))
        medication_id += 1
    if i % 3 == 0:
        channel, code, content = rnd.choice([('SMS', 'SMS_FOLLOWUP_REMINDER', '您好，健康管理团队将于近日对您进行例行随访，请准备自测记录。'),
                                             ('SMS', 'SMS_REVISIT_REMINDER', '您好，根据医生安排您需于近期复诊复查，如需协助预约请回电。'),
                                             ('PHONE_NOTE', None, '电话留言：请回电健康管理团队，协助安排复诊。')])
        insert('message_log', id=log_id, patient_id=pid, channel=channel, template_code=code, content=content, sent_at=(sent := ago(rnd.randint(1, 20), rnd.randint(1, 8))), actor_id=owner,
               evidence='虚构短信平台截图' if channel == 'SMS' else '虚构通话记录', request_key=f'bulk-msg-{log_id}', gmt_create=sent)
        log_id += 1
    insert('audit_event', id=900001 + i, patient_id=pid, actor_id=1, action='DEMO_INITIALIZED', resource_id=pid, after_state=lifecycle,
           detail='Fictional bulk demo patient. No real hospital or outbound contact event.', gmt_create=ago(joined))

# Patient pool: screening rows waiting for judgement, judged, discarded or enrolled.
screen_sources = [('ECG_NETWORK', 3, '心律失常'), ('EXAM', 13, '体检异常'), ('STROKE_SCREENING', 9, '卒中高危'), ('OUTPATIENT', 1, '门诊发现'), ('ECG_NETWORK', 7, '心电异常')]
findings = {'ECG_NETWORK': ['房颤波形，心室率偏快', 'ST 段轻度压低', '频发室性早搏', '窦性心动过缓'], 'EXAM': ['血压偏高，空腹血糖偏高', '颈动脉斑块，血脂偏高', '肺部小结节', '肝功能轻度异常'],
            'STROKE_SCREENING': ['卒中风险评分偏高', '高血压合并吸烟史'], 'OUTPATIENT': ['门诊血压明显偏高', '门诊发现心律不齐']}
enrolled_patients = iter([p for p in patients if p['lifecycle'] in ('ENROLLED', 'CONTACTED', 'BOOKED')])
for k in range(360):
    st, org, category = screen_sources[k % 5]
    status = pick([('NEW', 30), ('HIGH_RISK', 22), ('NON_HIGH_RISK', 18), ('DISCARDED', 8), ('ENROLLED', 22)])
    linked = next(enrolled_patients, None) if status == 'ENROLLED' else None
    if status == 'ENROLLED' and not linked: status = 'HIGH_RISK'
    judged = status != 'NEW'
    risk = 'UNKNOWN' if not judged else rnd.choice(['HIGH', 'HIGH', 'CRITICAL', 'MEDIUM']) if status in ('HIGH_RISK', 'ENROLLED') else rnd.choice(['LOW', 'MEDIUM'])
    at = rnd.randint(0, 60)
    insert('screening_record', id=screening_id, patient_id=linked['id'] if linked else None, org_id=org, campaign_id=rnd.choice([1, 2, 4, 5, 6, 9, None]),
           owner_id=owners[k % len(owners)], source_type=st, name=linked['name'] if linked else rnd.choice(surnames) + rnd.choice(given) + rnd.choice(given),
           gender=rnd.choice(['MALE', 'FEMALE']), age=rnd.randint(35, 85), phone=f'0007{k + 1:07d}', id_card_tail=f'{rnd.randint(0, 9999):04d}', screened_at=ago(at, rnd.randint(0, 8)),
           finding=rnd.choice(findings[st]) + '（演示）', category=category, risk_level=risk, risk_evidence='院方医生复核意见（虚构）' if judged else None,
           judged_by=owners[k % len(owners)] if judged else None, judged_at=ago(max(at - 1, 0)) if judged else None, pool_status=status,
           non_high_risk_reason='无症状，建议社区常规随访（演示）' if status == 'NON_HIGH_RISK' else None,
           external_id=f'DEMO-BULK-SCR-{screening_id}' if st in ('ECG_NETWORK', 'EXAM') else None, import_batch=f'DEMO-BULK-BATCH-{k // 40 + 1}' if st == 'EXAM' else None,
           note='已在外院治疗，不纳入（演示）' if status == 'DISCARDED' else '虚构筛查记录', version=0, gmt_create=ago(at))
    screening_id += 1

# WeChat: contacts for most bulk patients plus unbound friends and followers, with conversations that follow the 1.9 rules.
nicknames = ['晨曦', '老李', '阳光正好', '平安是福', '小雨', '清风徐来', '向日葵', '海阔天空', '静心', '知足常乐', '一帆风顺', '山水之间', '笑口常开', '春暖花开', '岁月静好', '老张',
             '王阿姨', '刘叔叔', '健康第一', '慢慢来', '风轻云淡', '白云', '大海', '幸福一家', '开心果', '花好月圆', '稻香', '远方', '老陈', '小周']
contact_id, message_id = 1001, 10001
def message(contact, channel, direction, kind, content, status, minutes_ago, actor=0, template=None, task=None, error=None, handled=None):
    global message_id
    insert('wechat_message', id=message_id, contact_id=contact, channel=channel, direction=direction, kind=kind, content=content, template_code=template, task_id=task, status=status,
           external_msg_id=None if status in ('FAILED', 'SENDING') or kind == 'EVENT' else (f'mock-in-{message_id}' if direction == 'INBOUND' else f'mock-bulk-{message_id}'),
           error=error, actor_id=actor, sent_at=minutes(minutes_ago), handled_at=minutes(handled[0]) if handled else None, handled_by=handled[1] if handled else None,
           is_mock=1, request_key=f'bulk-wx-{message_id}')
    message_id += 1
inbound_texts = ['请问复诊需要带哪些资料？', '这周三上午可以去复查吗？', '最近血压有点高，需要怎么记录？', '我妈妈出院后一直在吃药，想问下次随访什么时候', '检查结果出来了吗？',
                 '能帮忙改一下复诊时间吗', '收到，谢谢提醒', '家里血压计读数和医院不一样正常吗', '想问一下报告什么时候能拿', '好的，到时候我会准时到']
staff_texts = ['您好，本周安排例行随访，稍后电话联系您，请留意来电。', '您好，复诊资料请带好身份证、出院小结和近期检查报告。', '已收到您的留言，稍后由服务团队电话和您确认。',
               '您好，复诊时间已为您改到下周，具体以短信通知为准。', '提醒您按时做好自测记录，下次随访时我们会一起核对。']
template_bodies = {'DEMO_MP_REVISIT': ['thing1=复诊提醒', 'time2=下周三上午', 'thing3=请按医生安排复诊，改期请联系健康管理团队'],
                   'DEMO_MP_FOLLOWUP': ['thing1=随访提醒', 'time2=本周五', 'thing3=健康管理团队将电话联系您，请留意来电'],
                   'DEMO_MP_ARRIVAL': ['thing1=到诊提醒', 'time2=明天上午 9:30', 'thing3=请携带身份证和既往报告按时报到']}
welcome = '您好，这里是健康管理团队（演示）。留言会在服务时间内回复；如遇紧急情况请立即拨打 120 或前往急诊。'
consult_text = '请按医院要求准备原始报告和近期问题清单，复诊时间请向服务团队核实。（虚构已审核答复）'
def conversation(cid, channel, patient, staff, followed_min, removed):
    """Writes one contact's messages in time order; returns (last_inbound_min, last_min, preview, pending).
    Follows the 1.9 rules: Official Account text only within 48 hours of the patient's last message, WeCom sends wait for
    the member to confirm, and a successful send clears the patient's waiting messages."""
    official = channel == 'WECHAT_OFFICIAL'
    actor = staff or 3
    specs = [dict(direction='INBOUND', kind='EVENT', content=rnd.choice(['扫码关注公众号', '关注公众号']) if official else '通过渠道活码添加企业微信好友', status='HANDLED', t=followed_min),
             dict(direction='OUTBOUND', kind='WELCOME', content=welcome, status='SENT', t=followed_min - 1, template='DEMO_WECHAT_WELCOME', actor=0)]
    t, last_in = followed_min - 1, None
    steps = rnd.randint(1, 6)
    for s in range(steps):
        t -= rnd.randint(30, max(90, (t - 30) // (steps - s + 1)))
        if t < 15 or (removed and t < removed): break
        if official and rnd.random() < 0.45:
            specs.append(dict(direction='INBOUND', kind='TEXT', content=rnd.choice(inbound_texts), status='RECEIVED', t=t)); last_in = t
            continue
        if patient and patient['approved'] and rnd.random() < 0.3:
            task = rnd.choice(patient['approved'])
            specs.append(dict(direction='OUTBOUND', kind='APPROVED_ADVICE', content=consult_text if task % 10 == 5 else advice_text, task=task, actor=actor,
                              status='SENT' if official else rnd.choice(['SENT', 'PENDING_CONFIRM']), t=t))
        elif official and rnd.random() < 0.4:
            code = rnd.choice(list(template_bodies)); bad = rnd.random() < 0.1
            specs.append(dict(direction='OUTBOUND', kind='TEMPLATE', content=lines(*template_bodies[code]), preview=template_bodies[code][0], template=code, actor=actor,
                              status='FAILED' if bad else 'SENT', error='43004 require subscribe（模拟）' if bad else None, t=t))
        elif official:
            ok = last_in is not None and last_in - t < 48 * 60
            specs.append(dict(direction='OUTBOUND', kind='TEXT', content=rnd.choice(staff_texts), actor=actor, status='SENT' if ok else 'FAILED',
                              error=None if ok else '45015 response out of time limit（模拟）', t=t))
        else:
            status = rnd.choice(['SENT', 'SENT', 'PENDING_CONFIRM', 'FAILED']) if t > 600 else 'PENDING_CONFIRM'
            specs.append(dict(direction='OUTBOUND', kind='TEXT', content=rnd.choice(staff_texts), actor=actor, status=status,
                              error='84061 not external contact（模拟）' if status == 'FAILED' else None, t=t))
    if removed:
        specs.append(dict(direction='INBOUND', kind='EVENT', content='取消关注公众号' if official else '客户删除了企业微信好友', status='HANDLED', t=removed))
    # A successful send after a patient's message clears it; messages older than a day were answered by phone and marked handled.
    for n, m in enumerate(specs):
        if m['direction'] == 'INBOUND' and m['kind'] == 'TEXT':
            answer = next((x for x in specs[n + 1:] if x['direction'] == 'OUTBOUND' and x['status'] in ('SENT', 'PENDING_CONFIRM')), None)
            if answer: m.update(status='HANDLED', handled=(answer['t'], answer['actor']))
            elif m['t'] > 60 * 24: m.update(status='HANDLED', handled=(max(m['t'] - 45, 1), actor))
    for m in specs:
        message(cid, channel, m['direction'], m['kind'], m['content'], m['status'], m['t'], actor=m.get('actor', 0), template=m.get('template'), task=m.get('task'),
                error=m.get('error'), handled=m.get('handled'))
    last = specs[-1]
    preview = last.get('preview') or last['content']
    return last_in, last['t'], preview[:120], sum(1 for m in specs if m['status'] == 'RECEIVED')
def contact(channel, patient, staff, intake, followed_min, removed_min, bound_min, nickname):
    global contact_id
    cid = contact_id; contact_id += 1
    last_in, last, preview, pending = conversation(cid, channel, patient, staff if channel == 'WE_COM' else (patient['owner'] if patient else None), followed_min, removed_min)
    insert('wechat_contact', id=cid, channel=channel, external_id=(f'wm-bulk-{cid:05d}' if channel == 'WE_COM' else f'openid-bulk-{cid:05d}'), nickname=nickname if channel == 'WE_COM' else None,
           staff_user_id=wecom_of.get(staff) if channel == 'WE_COM' else None, staff_account_id=staff if channel == 'WE_COM' else None, intake_channel_id=intake,
           scene=f'ch{intake}' if intake else None, relation='REMOVED' if removed_min else 'ACTIVE', followed_at=minutes(followed_min), removed_at=minutes(removed_min) if removed_min else None,
           last_inbound_at=minutes(last_in) if last_in else None, last_message_at=minutes(last), last_message_preview=preview, pending_count=pending,
           patient_id=patient['id'] if patient else 0, bound_at=minutes(bound_min) if patient else None, bound_by=patient['owner'] if patient else None, is_mock=1, version=1 if patient else 0)
all_channels = [c for cs in channels.values() for c in cs]
for n, p in enumerate(patients):
    if p['lifecycle'] == 'ENROLLED' and n % 2: continue
    followed = min(p['joined'], 90) * 1440 - rnd.randint(0, 600)
    removed = rnd.randint(60, followed // 2) if n % 14 == 0 and followed > 240 else None
    channel_id = channels[p['dept']][n % 2]
    if n % 10 < 6:
        contact('WE_COM', p, p['owner'], channel_id, followed, removed, followed - rnd.randint(30, 600), rnd.choice(nicknames))
    if n % 10 >= 4:
        follow_official = followed - rnd.randint(0, 2000)
        contact('WECHAT_OFFICIAL', p, None, channel_id, follow_official, None if n % 21 else rnd.randint(600, max(700, follow_official // 2)), follow_official - rnd.randint(30, 600), None)
for k in range(70):
    followed = rnd.randint(30, 60 * 24 * 20)
    contact('WE_COM', None, owners[k % len(owners)], rnd.choice(all_channels + [None]), followed, rnd.randint(10, followed // 2) if k % 11 == 0 and followed > 100 else None, None, rnd.choice(nicknames))
for k in range(130):
    followed = rnd.randint(30, 60 * 24 * 25)
    contact('WECHAT_OFFICIAL', None, None, rnd.choice(all_channels + [None, None]), followed, rnd.randint(min(600, followed // 3), followed // 2) if k % 9 == 0 and followed > 100 else None, None, None)

for name in ['DML.sql', 'DML-local.sql']:
    path = ROOT / 'sql/dev' / name
    text = path.read_text(encoding='utf-8')
    block = MARK + '\n-- Bulk fictional demo data: random names, undialable 000 phone numbers, simulated WeChat ids. Not real patients, staff or conversations.\n' + '\n'.join(rows) + '\n' + END + '\n'
    if MARK in text:
        text = text[:text.index(MARK)] + block + text[text.index(END) + len(END) + 1:]
    else:
        text = text.rstrip('\n') + '\n' + block
    path.write_text(text, encoding='utf-8', newline='\n')
print(f'Generated {len(rows)} statements: {PATIENTS} patients, {contact_id - 1001} WeChat contacts, {message_id - 10001} WeChat messages, '
      f'{appointment_id - 1001} appointments, {screening_id - 1001} pool rows, {invitation_id - 1001} invitations.')
