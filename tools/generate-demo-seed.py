"""Regenerate the append-only fictional scenario section in dev DML (MySQL/H2).
Never connect to a database. Existing demo sections and user data are not overwritten.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MARKER = '-- BEGIN COMPREHENSIVE FICTIONAL SCENARIOS 1.3'
class Sql(str):
    pass
def value(v):
    if isinstance(v, Sql): return str(v)
    if v is None: return 'NULL'
    if isinstance(v, (int, float)): return str(v)
    return "'" + str(v).replace("'", "''") + "'"
def ago(days, hours=0):
    return Sql(f"CURRENT_TIMESTAMP - INTERVAL '{days}' DAY - INTERVAL '{hours}' HOUR")
def future(days):
    return Sql(f"CURRENT_TIMESTAMP + INTERVAL '{days}' DAY")
rows = []
def insert(table, **fields):
    fields.setdefault('hospital_id', 1)
    fields.setdefault('creator', 'demo-scenarios-1.3')
    fields.setdefault('gmt_create', ago(45))
    rows.append(f"INSERT INTO {table} ({','.join(fields)}) VALUES ({','.join(value(v) for v in fields.values())}) ON DUPLICATE KEY UPDATE id=id;")

# Operators are our team; doctors and nurses are hospital staff who log in (1.6). Ids 2/5 (doctors) and 6 (nurse) live in the head section.
for id, username, role, name, department in [
    (20, 'operator_b', 'OPERATOR', '演示运营专员乙', None), (21, 'operator_c', 'OPERATOR', '演示运营专员丙', None),
    (22, 'operator_d', 'OPERATOR', '演示服务协调员', None),
    (10, 'doctor_c', 'DOCTOR', '演示内科医生', '内科'), (11, 'doctor_d', 'DOCTOR', '演示综合科医生', '综合科'),
    (23, 'nurse_b', 'NURSE', '演示护士乙', '内分泌科')]:
    insert('health_account', id=id, username=username, password='HealthDemo@2026!', real_name=name, role_code=role, department=department, is_enabled=1)
roles = {3: 'OPERATOR', 20: 'OPERATOR', 21: 'OPERATOR', 22: 'OPERATOR', 6: 'NURSE', 23: 'NURSE'}
departments = ['心血管内科','内分泌科','呼吸内科','神经内科','肾内科','消化内科','康复医学科','老年医学科','骨科','普通外科','全科','健康管理中心']
sources = ['PRIMARY_CARE','EXAM','OUTPATIENT','DISCHARGE','CAMPAIGN']
for i, dept in enumerate(departments):
    insert('intake_channel', id=100+i, title=f'{dept}服务来源（演示）', source=sources[i%5], department=dept,
           doctor_id=[2,5,10,11][i%4], owner_id=[3,20,21,22][i%4], token=f'health-demo-scenario-channel-{i+1:02d}', is_active=0 if i==11 else 1)
    insert('knowledge_entry', id=100+i, kind='EDUCATION', department=dept, title=f'{dept}复诊资料准备（演示）',
           content='请按医院要求准备原报告和当前问题清单。请向服务团队核实时间、地点和所需资料。本条不提供诊断、处方或用药调整。',
           source='虚构演示宣教；不代表该科室知识覆盖或医院临床批准', version=1, status='PUBLISHED' if i%2==0 else 'DRAFT',
           reviewer_id=[2,5,10,11][i%4] if i%2==0 else None, reviewed_at=ago(30) if i%2==0 else None)

states = ['PENDING','IN_PROGRESS','PENDING_REVIEW','APPROVED','CONTACTED','COMPLETED','REJECTED','CANCELLED']
revisits = ['PENDING','BOOKED','ARRIVED','COMPLETED','NO_SHOW','CANCELLED']
failed = ['NO_ANSWER','BUSY','WRONG_NUMBER','REFUSED','IDENTITY_UNVERIFIED']
for i in range(72):
    patient = 10001+i
    doctor = [2,5,10,11][i%4]
    owner = [3,20,21,22,6,23][(i//4)%6]
    dept = departments[i%12]
    lifecycle = 'PAUSED' if i%17==0 else 'CLOSED' if i%19==0 else 'ENROLLED' if i%7==0 else 'MANAGING'
    insert('patient', id=patient, source_system='HOSPITAL_MOCK', hospital_patient_id=f'DEMO-FULL-{i+1:03d}',
           name=f'虚构患者{i+1:03d}', gender='MALE' if i%2 else 'FEMALE', age=35+i%48, phone=f'000{i+1:08d}',
           department=dept, disease=f'{dept}院后服务示例', risk_level=['UNKNOWN','LOW','MEDIUM','HIGH','CRITICAL'][i%5],
           lifecycle=lifecycle, doctor_id=doctor, owner_id=owner, channel_id=100+i%12, service_package_id=3 if i%3 else None,
           consent_at=ago(40), note='完全虚构的功能演示。风险由演示数据预设，不是系统诊断；联系电话不可用于真实联系。')
    record = 20000+i*3
    statuses = [('CANCELLED' if node>0 else 'COMPLETED') if lifecycle in ['PAUSED','CLOSED'] else states[(i+node)%8] for node in range(3)]
    seen = i%2==0 or any(s in ['APPROVED','CONTACTED','COMPLETED'] for s in statuses)
    days = 4+i%28
    insert('care_record', id=record, patient_id=patient, record_type='DISCHARGE', occurred_at=ago(days),
           content=f'【虚构出院小结 {i+1:03d}】服务团队需核对原报告、患者当前反馈和复诊安排。原医嘱中的具体用法须向责任医生确认。本示例无真实处方、临床阈值或诊断结论。',
           medication_cycle_days=None if i%4==0 else [7,14,30][i%3],
           next_visit_date=Sql(f"CURRENT_DATE + INTERVAL '{i%9-3}' DAY"), source_system='HOSPITAL_MOCK', external_id=f'DEMO-FULL-DC-{i+1:03d}',
           doctor_viewed_at=ago(days-1) if seen else None, doctor_viewer_id=doctor if seen else None,
           doctor_opinion='演示意见：已阅原报告，随访请重点核对复诊安排与执行原医嘱时的困难。' if i%4==0 else None)
    insert('care_record', id=record+1, patient_id=patient, record_type='OUTPATIENT' if i%2 else 'EXAM', occurred_at=ago(days+2),
           content='【虚构记录】用于检查病程时间线与关联原报告。请勿据此作医疗决策。', source_system='HOSPITAL_MOCK', external_id=f'DEMO-FULL-OP-{i+1:03d}',
           doctor_viewed_at=ago(days) if i%3 else None, doctor_viewer_id=doctor if i%3 else None)
    if i%3==0:
        insert('care_record', id=record+2, patient_id=patient, record_type='OBSERVATION', occurred_at=ago(1),
               content='虚构人工录入体征，系统不据此自动判断风险。', systolic=120+i%14, diastolic=70+i%10, heart_rate=65+i%15,
               weight=60+i%20, source_system='DEMO')
    for node, offset in enumerate([3,7,30]):
        task=30000+i*10+node
        status=statuses[node]
        reviewed=status in ['APPROVED','CONTACTED','COMPLETED']
        connected=status in ['CONTACTED','COMPLETED']
        retry=status in ['PENDING','IN_PROGRESS','APPROVED'] and i%3==0
        result='CONNECTED' if connected else failed[(i+node)%5] if retry else None
        text='【虚构已审核问询】请核对原医嘱执行中遇到的困难，记录近期反馈及需要医生解答的问题，核实复诊安排。'
        insert('care_task', id=task, patient_id=patient, task_type='FOLLOWUP', title=f'{dept} · D{offset} 随访（演示）',
               priority=['P1','P2','P3'][i%3], status=status, assignee_id=owner, doctor_id=doctor,
               due_at=ago(days-offset), record_id=record, followup_stage=f'D{offset}',
               draft_text=None if status=='PENDING' else text, draft_origin=None if status=='PENDING' else 'MANUAL',
               approved_text=text if reviewed else None, reviewer_id=doctor if reviewed else None, reviewed_at=ago(2,3) if reviewed else None,
               review_note='演示审核：已核对关联报告。' if reviewed else '演示退回：请补充患者需要核实的问题。' if status=='REJECTED' else None,
               contact_result=result, identity_verified=1 if connected else 0, next_contact_at=future(1) if retry else None,
               handover_status=('ACKNOWLEDGED' if i%2 else 'PENDING') if status=='COMPLETED' else None,
               doctor_feedback='演示接收：已查看随访记录，请团队按记录安排继续跟进。' if status=='COMPLETED' and i%2 else None,
               acknowledged_at=ago(0,1) if status=='COMPLETED' and i%2 else None,
               completed_at=ago(1) if status=='COMPLETED' else None,
               outcome='演示完成：反馈已记录，需要医生处理的问题已交接。' if status=='COMPLETED' else '演示暂停或取消，保留历史记录。' if status=='CANCELLED' else None,
               evidence='虚构电话记录：已核实本人身份并按审核内容完成问询。' if connected else None,
               request_key=f'demo-full-followup-{i+1}-{node}')
        if connected or retry:
            insert('contact_attempt', id=task, patient_id=patient, task_id=task, actor_id=owner, contact_at=ago(1,1),
                   method='PHONE', result=result, identity_verified=1 if connected else 0, report_reviewed=1 if connected else 0,
                   recipient_role='PATIENT' if connected else None, reason=None if connected else '虚构联系失败，尚未完成身份核对与问询。',
                   next_contact_at=future(1) if retry else None, next_plan='核对联系方式与联系意愿，再由工作人员处理。' if retry else None,
                   medication_feedback='演示反馈：待核对原医嘱中的安排，无调药建议。' if connected else None,
                   patient_questions='演示问题：希望确认复诊需携带的资料。' if connected else None,
                   evidence='虚构电话演示凭证，无真实外呼。', request_key=f'demo-full-contact-{task}')
        if connected:
            insert('care_message', id=task, patient_id=patient, task_id=task, sender_id=owner, sender_role=roles[owner],
                   direction='STAFF_TO_PATIENT', content=text, gmt_create=ago(1,1))
    revisit=30000+i*10+3
    state=revisits[i%6]
    insert('care_task', id=revisit, patient_id=patient, task_type='REVISIT', title=f'{dept}复诊协调与到院核验（演示）',
           priority='P2', status=state, assignee_id=owner, doctor_id=doctor, due_at=ago(3-i%9), record_id=record,
           evidence=f'虚构医院核验记录 DEMO-ARRIVAL-{i+1:03d}；点击页面不视为到院。' if state in ['ARRIVED','COMPLETED'] else '演示预约：已核对科室、时间和地点。' if state in ['BOOKED','NO_SHOW'] else None,
           outcome='虚构复诊结果已核对并留存。' if state=='COMPLETED' else '演示未到院：工作人员需核实原因和下一次安排。' if state=='NO_SHOW' else '演示取消预约。' if state=='CANCELLED' else None,
           completed_at=ago(1) if state=='COMPLETED' else None, request_key=f'demo-full-revisit-{i+1}')
    if i%3==0:
        state=['PENDING','IN_PROGRESS','ESCALATED','COMPLETED'][(i//3)%4]
        insert('care_task', id=revisit+1, patient_id=patient, task_type='ALERT', title='需责任医生核实的患者反馈（演示）',
               priority=['P0','P1','P2','P3'][(i//3)%4], status=state, assignee_id=owner, doctor_id=doctor, due_at=ago(i%2), record_id=record,
               outcome='虚构处置：责任医生已核对并记录处理结果。' if state=='COMPLETED' else None,
               completed_at=ago(0,2) if state=='COMPLETED' else None, request_key=f'demo-full-alert-{i+1}')
    if i%3==1:
        insert('care_task', id=revisit+2, patient_id=patient, task_type='CONSULTATION', title='电话咨询转后台处理（演示）',
               priority='P2', status='PENDING_REVIEW', assignee_id=owner, doctor_id=doctor, due_at=future(1), record_id=record,
               draft_text='请核实患者关于复诊资料的疑问，具体说明由责任医生审核。', draft_origin='MANUAL', request_key=f'demo-full-consult-{i+1}')
    insert('audit_event', id=50000+i, patient_id=patient, actor_id=1, action='DEMO_INITIALIZED', resource_id=patient,
           after_state=lifecycle, detail='Fictional comprehensive scenario. No real hospital or outbound contact event.')

for name in ['DML.sql','DML-local.sql']:
    path=ROOT/'sql/dev'/name
    original=path.read_text(encoding='utf-8').split(MARKER)[0].rstrip()
    path.write_text(original+'\n\n'+MARKER+'\n'+'\n'.join(rows)+'\n', encoding='utf-8', newline='\n')
print(f'Generated {len(rows)} fictional rows in both dev DML files; 72 additional patients.')
