import React, { useEffect, useRef, useState } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router-dom'
import { Alert, Button, DatePicker, Descriptions, Drawer, Form, Input, Select, Space, Switch, Tag } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { ContactExecution, ContactHistory, ScheduleFollowups, contactNames } from './FollowupExecution'
import { api, useLoad } from '../api'
import { AppointmentDialog } from './Appointments'
import { MessageLogDialog } from './Configuration'
import { ReportReviewDialog, ReportStatus } from './ReportReview'
import { DataTable, dateText, FormDialog, LoadState, names, options, PageTitle, required, Status } from '../ui'

const ended = ['COMPLETED', 'CANCELLED']
export default function Tasks({ taskType, patientId, compact = false }) {
  const account = useOutletContext()
  const doctor = account.role_code === 'DOCTOR'
  const [search, setSearch] = useSearchParams()
  const [type, setType] = useState(taskType || 'FOLLOWUP')
  const [status, setStatus] = useState(undefined)
  const [priority, setPriority] = useState(undefined)
  const [overdue, setOverdue] = useState(search.get('overdue') === '1')
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState(Number(search.get('task')) || null)
  const [create, setCreate] = useState(false)
  const [schedule, setSchedule] = useState(false)
  const [contactPending, setContactPending] = useState(search.get('contact') === '1')
  const [handoverPending, setHandoverPending] = useState(search.get('handover') === '1')
  const [keyword, setKeyword] = useState('')
  const [slaOverdue, setSlaOverdue] = useState(search.get('sla_overdue') === 'true')
  const requestKey = useRef('')
  useEffect(() => { setType(search.get('task_type') || taskType || 'FOLLOWUP'); setStatus(undefined); setPage(0); setSelected(Number(search.get('task')) || null) }, [taskType])
  const state = useLoad(() => api('/tasks/query', { page, size: 10, patient_id: patientId, task_type: type, status, priority, overdue, contact_pending: contactPending, handover_pending: handoverPending, revisit_pending: search.get('pending') === '1', assignee_id: Number(search.get('assignee')) || undefined, due_from: search.get('due_from') || (search.get('due') === 'today' ? dayjs().format('YYYY-MM-DD') : undefined), due_to: search.get('due_to') || (search.get('due') === 'today' ? dayjs().format('YYYY-MM-DD') : undefined), sla_overdue: slaOverdue || undefined, alert_source: search.get('alert_source') || undefined }), [page, patientId, type, status, priority, overdue, contactPending, handoverPending, slaOverdue, search.toString()])
  const patients = useLoad(() => create ? api('/patients/query', { page: 0, size: 100, keyword }) : Promise.resolve({ items: [] }), [create, keyword])
  const title = taskType === 'ALERT' ? '异常处理' : taskType === 'REVISIT' ? '复诊跟踪' : '随访与咨询'
  function closeTask() { setSelected(null); if (search.has('task')) { search.delete('task'); setSearch(search, { replace: true }) } }
  const newButton = !doctor && <Button type="primary" icon={<PlusOutlined />} onClick={() => { requestKey.current = crypto.randomUUID(); setCreate(true) }}>新建任务</Button>
  return <>{!compact && <PageTitle title={title} subtitle={taskType === 'ALERT' ? '响应、核实后升级责任医生，由医生在系统里记录处置结果。' : taskType === 'REVISIT' ? '以核实的预约、到院证据和诊疗结果跟踪复诊。' : '依据原报告起草随访意见，责任医生审核通过后联系患者，完成后由医生查收。'} extra={<Space>{type === 'FOLLOWUP' && <Button onClick={() => setSchedule(true)}>安排随访节点</Button>}{newButton}</Space>} />}
    <div className={compact ? '' : 'table-panel'}><div className="toolbar">
      {!taskType && <Select aria-label="任务类型" value={type} style={{ width: 150 }} options={options(['FOLLOWUP', 'CONSULTATION', 'OUTREACH', ...(compact ? ['ALERT', 'REVISIT'] : [])])} onChange={value => { setType(value); setPage(0) }} />}
      <Select aria-label="任务状态" value={status} placeholder="全部状态" allowClear style={{ width: 155 }} options={options(type === 'ALERT' ? ['PENDING', 'IN_PROGRESS', 'ESCALATED', 'COMPLETED'] : type === 'REVISIT' ? ['PENDING', 'BOOKED', 'ARRIVED', 'COMPLETED', 'NO_SHOW', 'CANCELLED'] : ['PENDING', 'IN_PROGRESS', 'PENDING_REVIEW', 'REJECTED', 'APPROVED', 'CONTACTED', 'COMPLETED', 'CANCELLED'])} onChange={value => { setStatus(value); setPage(0) }} />
      <Select aria-label="优先级" value={priority} placeholder="全部优先级" allowClear style={{ width: 145 }} options={options(['P0', 'P1', 'P2', 'P3'])} onChange={value => { setPriority(value); setPage(0) }} />
      <Space><Switch checked={overdue} onChange={value => { setOverdue(value); setPage(0) }} aria-label="仅看逾期" />仅看逾期</Space>
      {['ALERT', 'OUTREACH'].includes(type) && <Space><Switch checked={slaOverdue} onChange={value => { setSlaOverdue(value); setPage(0) }} />超 SLA 未响应</Space>}
      {type === 'FOLLOWUP' && <><Space><Switch checked={contactPending} onChange={v => { setContactPending(v); setPage(0) }} />待再次联系</Space><Space><Switch checked={handoverPending} onChange={v => { setHandoverPending(v); setPage(0) }} />待医生查收</Space></>}
      <Button icon={<ReloadOutlined />} onClick={state.reload}>刷新</Button>{compact && !doctor && <Space>{type === 'FOLLOWUP' && <Button onClick={() => setSchedule(true)}>安排随访节点</Button>}{newButton}</Space>}
    </div>
    <DataTable state={state} page={page} setPage={setPage} columns={taskColumns(setSelected)} /></div>
    <ScheduleFollowups open={schedule} patientId={patientId} onClose={() => setSchedule(false)} onSaved={state.reload} />
    <TaskDrawer id={selected} onClose={closeTask} onChanged={state.reload} />
    <FormDialog title="新建服务任务" open={create} initialValues={{ patient_id: patientId, task_type: taskType || type, priority: 'P2', due_at: dayjs().add(1, 'day') }}
      onClose={() => setCreate(false)} onSubmit={async values => { const task = await api('/tasks/create', { ...values, due_at: values.due_at.format('YYYY-MM-DDTHH:mm:ss'), request_key: requestKey.current }); state.reload(); setSelected(task.id) }}>
      {patientId ? <Form.Item name="patient_id" hidden><Input /></Form.Item> : <LoadState state={patients}>{data => <Form.Item name="patient_id" label="患者（可搜索）" rules={required}><Select showSearch filterOption={false} onSearch={setKeyword} options={data.items.map(row => ({ value: row.id, label: row.name + ' #' + row.id }))} /></Form.Item>}</LoadState>}
      <Form.Item name="title" label="任务标题" rules={required}><Input maxLength={160} /></Form.Item><div className="form-grid">
        <Form.Item name="task_type" label="任务类型" rules={required}><Select options={options(['FOLLOWUP', 'CONSULTATION', 'ALERT', 'REVISIT', 'OUTREACH'])} /></Form.Item>
        <Form.Item name="priority" label="优先级" rules={required}><Select options={options(['P0', 'P1', 'P2', 'P3'])} /></Form.Item></div>
      <Form.Item name="due_at" label="截止时间" rules={required}><DatePicker showTime style={{ width: '100%' }} /></Form.Item>
      <Form.Item noStyle shouldUpdate={(a, b) => a.task_type !== b.task_type}>{({ getFieldValue }) => getFieldValue('task_type') === 'ALERT' && <Form.Item name="alert_source" label="异常来源"><Select options={options(['STAFF', 'PATIENT_REPORT', 'OBSERVATION', 'ECG', 'RULE'])} /></Form.Item>}</Form.Item>
    </FormDialog>
  </>
}

export function taskColumns(open) {
  return [
    { title: '患者', dataIndex: 'patient_name', render: (value, row) => <Link to={'/patients/' + row.patient_id}>{value}</Link> },
    { title: '任务', dataIndex: 'title', render: (value, row) => <><strong>{value}</strong><div className="muted">#{row.id} / {names[row.task_type]} {row.followup_stage && ' / ' + row.followup_stage}</div></> },
    { title: '优先级', dataIndex: 'priority', render: value => <Status value={value} /> },
    { title: '状态', dataIndex: 'status', render: value => <Status value={value} /> },
    { title: '截止时间', dataIndex: 'due_at', render: (value, row) => <><span className={row.overdue ? 'danger-text' : ''}>{dateText(value)}</span>{row.overdue && <div className="danger-text">已逾期</div>}{row.sla_overdue && <div className="danger-text">超 SLA 未响应</div>}{row.alert_source && <div className="muted">{names[row.alert_source]}</div>}</> },
    { title: '联系进度', render: (_, row) => <>{row.contact_result && <Tag color={row.contact_result === 'CONNECTED' ? 'green' : 'orange'}>{contactNames[row.contact_result]}</Tag>}{row.next_contact_at && <div className="muted">下次：{dateText(row.next_contact_at)}</div>}{row.handover_status && <div className="muted">{row.handover_status === 'PENDING' ? '待医生查收' : '医生已查收'}</div>}</> },
    { title: '操作', render: (_, row) => <Button type="link" onClick={() => open(row.id)}>查看 / 处理</Button> },
  ]
}

const quickFeedback = ['已阅随访记录，按计划继续随访。', '已阅，请提醒患者按时复诊。', '已阅，患者问题已记录，门诊时处理。']
export function TaskDrawer({ id, onClose, onChanged }) {
  const account = useOutletContext()
  const doctor = account.role_code === 'DOCTOR'
  const state = useLoad(() => id ? api('/tasks/' + id) : Promise.resolve(null), [id])
  const reference = useLoad(() => id && !doctor ? api('/knowledge/query', { page: 0, size: 100, kind: 'EDUCATION', status: 'PUBLISHED' }) : Promise.resolve({ items: [] }), [id])
  const clinicians = useLoad(() => id ? api('/clinicians') : Promise.resolve([]), [id])
  const [knowledgeId, setKnowledgeId] = useState(null)
  const [draft, setDraft] = useState('')
  const [review, setReview] = useState('')
  const [reviewNote, setReviewNote] = useState('')
  const [outcome, setOutcome] = useState('')
  const [evidence, setEvidence] = useState('')
  const [feedback, setFeedback] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [disposition, setDisposition] = useState(undefined)
  const [book, setBook] = useState(false)
  const [messageLog, setMessageLog] = useState(false)
  const [reassign, setReassign] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const staff = useLoad(() => id && account.role_code === 'MANAGER' ? api('/staff') : Promise.resolve([]), [id])
  useEffect(() => {
    if (!state.data) return
    const task = state.data.task
    setKnowledgeId(task.knowledge_id); setDraft(task.draft_text || ''); setReview(task.approved_text || task.draft_text || '')
    setReviewNote(task.review_note || ''); setOutcome(task.outcome || ''); setEvidence(task.evidence || ''); setFeedback(task.doctor_feedback || ''); setDisposition(task.disposition || undefined)
  }, [state.data])
  useEffect(() => setError(null), [id])
  useEffect(() => { if (reference.data && state.data) setKnowledgeId(reference.data.items.some(x => x.id === state.data.task.knowledge_id) ? state.data.task.knowledge_id : null) }, [reference.data, state.data])
  async function run(action, fields = {}) {
    if (busy) return
    setBusy(true); setError(null)
    try {
      await api('/tasks/' + action, { id, version: state.data.task.version, ...fields })
      state.reload(); onChanged()
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  const transition = action => run('transition', { action, outcome, evidence, disposition })
  return <Drawer title="服务任务详情" open={Boolean(id)} width={700} onClose={() => !busy && onClose()} destroyOnClose extra={<Button disabled={busy} icon={<ReloadOutlined />} onClick={state.reload}>刷新</Button>}>
    {error && <Alert showIcon type="error" message={error} description="未确认成功时，请刷新核对最新状态。" className="mb" />}
    <LoadState state={state}>{context => {
      if (!context) return null
      const task = context.task
      const clinical = ['FOLLOWUP', 'CONSULTATION'].includes(task.task_type)
      const outreach = task.task_type === 'OUTREACH'
      const lostContact = task.task_type === 'ALERT' && task.alert_source === 'LOST_CONTACT'
      const editable = !doctor && clinical && ['IN_PROGRESS', 'REJECTED', 'APPROVED'].includes(task.status)
      const doctorName = id => clinicians.data?.find(x => x.id === id)?.name
      const responsible = doctorName(task.doctor_id) || '责任医生'
      return <><Space wrap><Status value={task.task_type} /><Status value={task.status} /><Status value={task.priority} />{task.overdue && <Tag color="red">已逾期</Tag>}</Space>
        <h2>{task.title}</h2><Descriptions column={2} size="small" items={[
          { key: 'patient', label: '患者', children: <Link onClick={onClose} to={'/patients/' + task.patient_id}>{task.patient_name}</Link> },
          { key: 'due', label: '截止时间', children: dateText(task.due_at) },
          { key: 'origin', label: '草稿来源', children: names[task.draft_origin] || '尚未起草' },
          { key: 'clinician', label: '责任医生', children: doctorName(task.doctor_id) || '待关联' },
          ...(task.reviewed_at ? [{ key: 'reviewed', label: '医生审核', children: (doctorName(task.reviewer_id) || '') + ' ' + dateText(task.reviewed_at) }] : []),
          ...(task.sla_due_at ? [{ key: 'sla', label: 'SLA 截止', children: <span className={task.sla_overdue ? 'danger-text' : ''}>{dateText(task.sla_due_at)}{task.ack_at ? '（已响应 ' + dateText(task.ack_at) + '）' : ''}</span> }] : []),
          ...(task.alert_source ? [{ key: 'source', label: '异常来源', children: names[task.alert_source] }] : []),
          ...(task.enrollment_id ? [{ key: 'enrollment', label: '服务实例', children: '#' + task.enrollment_id + ' 节点 ' + task.plan_node_seq }] : []),
          ...(task.reminder_sent_at ? [{ key: 'reminder', label: '提醒已发', children: dateText(task.reminder_sent_at) }] : []),
        ]} />
        {!doctor && <Space wrap className="mb"><Button size="small" disabled={busy} onClick={() => setMessageLog(true)}>登记已发短信 / 消息</Button>{account.role_code === 'MANAGER' && !ended.includes(task.status) && <Button size="small" disabled={busy} onClick={() => setReassign(true)}>转交他人</Button>}{task.task_type === 'REVISIT' && ['PENDING', 'NO_SHOW'].includes(task.status) && <Button size="small" type="primary" disabled={busy} onClick={() => setBook(true)}>结构化预约</Button>}{task.appointment_id && <Link onClick={onClose} to="/appointments">查看预约台账</Link>}</Space>}
        {!doctor && <><AppointmentDialog open={book} patientId={task.patient_id} taskId={task.id} onClose={() => setBook(false)} onSaved={() => { state.reload(); onChanged() }} />
        <MessageLogDialog open={messageLog} patientId={task.patient_id} taskId={task.id} onClose={() => setMessageLog(false)} onSaved={() => { state.reload(); onChanged() }} />
        <FormDialog title="转交任务" open={reassign} onClose={() => setReassign(false)} onSubmit={async values => { await api('/tasks/reassign', { id: task.id, version: task.version, ...values }); state.reload(); onChanged() }}>
          <Form.Item name="assignee_id" label="转交给" rules={required}><Select options={(staff.data || []).filter(x => x.user_id !== task.assignee_id).map(x => ({ value: x.user_id, label: x.real_name + ' / ' + names[x.role_code] }))} /></Form.Item><Form.Item name="reason" label="转交原因" rules={required}><Input maxLength={400} /></Form.Item>
        </FormDialog></>}
        <div className="context-block"><h3>个体随访依据 · 本任务关联报告</h3>{context.record ? <><Tag>{names[context.record.record_type]}</Tag>{context.record.source_system === 'HOSPITAL_MOCK' && <Tag color="gold">模拟医院接口 · {context.record.external_id}</Tag>}<small>{dateText(context.record.occurred_at)}</small><p className="pre-wrap">{context.record.content || '指标记录'}</p>
          {context.record.systolic != null && <p>血压 {context.record.systolic}/{context.record.diastolic} mmHg</p>}{context.record.heart_rate != null && <p>心率 {context.record.heart_rate} 次/分</p>}{context.record.weight != null && <p>体重 {context.record.weight} kg</p>}{context.record.glucose != null && <p>血糖 {context.record.glucose} mmol/L</p>}
          {context.record.medication_cycle_days != null && <p>原记录用药周期：{context.record.medication_cycle_days} 天（按原医嘱核对）</p>}{context.record.next_visit_date && <p>原记录复诊日期：{context.record.next_visit_date}</p>}
          <ReportStatus record={context.record} doctorName={doctorName(context.record.doctor_viewer_id)} />
          {doctor && context.record.record_type !== 'OBSERVATION' && <Button size="small" onClick={() => setReportOpen(true)}>{context.record.doctor_viewed_at ? '更新报告意见' : '确认已阅 / 写报告意见'}</Button>}</> : <p className="muted">此任务未关联就诊记录。出院随访请从患者档案录入对应报告后，处理其关联任务。</p>}
          {context.messages.filter(x => x.direction === 'PATIENT_TO_STAFF').map(message => <blockquote key={message.id}><strong>患者原始咨询</strong><p className="pre-wrap">{message.content}</p></blockquote>)}
        </div>
        {doctor && context.record && <ReportReviewDialog record={reportOpen ? { ...context.record, patient_name: task.patient_name } : null} onClose={() => setReportOpen(false)} onSaved={() => { state.reload(); onChanged() }} />}
        {!doctor && task.status === 'PENDING' && task.task_type !== 'REVISIT' && <Button type="primary" loading={busy} onClick={() => run('claim')}>{task.task_type === 'ALERT' ? '响应并开始处理' : '领取并开始处理'}</Button>}
        {!doctor && outreach && !ended.includes(task.status) && <Alert className="mt" type="info" showIcon message="首次联系任务" description="在患者档案里记录邀约：接通类结果会自动完成本任务；未联系上时在下方登记尝试并约定下次时间。" action={<Link onClick={onClose} to={'/patients/' + task.patient_id}>去记录邀约</Link>} />}
        {editable && <div className="action-block"><h3>准备随访意见</h3>
          <LoadState state={reference}>{data => <><Alert className="mb" type="info" showIcon message="以原报告和医生意见为依据" description="可以直接起草基础问询，无需选择资料。可选宣教仅作参考；个体意见提交后由责任医生在系统里审核。" /><label className="field-label" htmlFor="knowledge-choice">已审核宣教参考（可选）</label><Select id="knowledge-choice" value={knowledgeId} allowClear onChange={setKnowledgeId} placeholder="不选择也可以起草" style={{ width: '100%' }} options={data.items.map(item => ({ value: item.id, label: item.title + ' / v' + item.version }))} /></>}</LoadState>
          <Space className="mt mb"><Button disabled={busy} onClick={() => run('draft', { knowledge_id: knowledgeId, mode: 'TEMPLATE' })}>基础问询起草</Button><Button disabled={busy} onClick={() => run('draft', { knowledge_id: knowledgeId, mode: 'AI' })}>AI 辅助起草</Button></Space>
          <label className="field-label" htmlFor="draft-text">随访意见草稿</label><Input.TextArea id="draft-text" rows={7} value={draft} onChange={event => setDraft(event.target.value)} maxLength={6000} showCount />
          <Space className="mt" wrap><Button disabled={!draft.trim() || busy} onClick={() => run('draft', { knowledge_id: knowledgeId, mode: 'MANUAL', draft_text: draft })}>保存编辑</Button>
            <Button type="primary" disabled={!task.draft_text || draft !== task.draft_text || task.status !== 'IN_PROGRESS' || busy} onClick={() => run('submit-review')}>提交医生审核</Button></Space>
          <p className="muted">修改后先保存，再提交审核。AI 接入未配置时可使用模板路径。</p>
        </div>}
        {task.status === 'PENDING_REVIEW' && (doctor ? <div className="action-block"><h3>审核随访意见</h3><p className="muted">对照上方原报告核对草稿。通过时以下正文就是团队联系患者时使用的内容，可直接修改；退回时写明需要补充或修改的地方。</p>
          <label className="field-label" htmlFor="approved-text">审核后的随访意见</label><Input.TextArea id="approved-text" value={review} onChange={event => setReview(event.target.value)} rows={8} maxLength={6000} showCount />
          <label className="field-label mt" htmlFor="review-note">审核意见 / 退回原因</label><Input.TextArea id="review-note" value={reviewNote} onChange={event => setReviewNote(event.target.value)} rows={3} maxLength={2000} placeholder="通过时可选；退回时必填" />
          <Space className="mt"><Button danger disabled={!reviewNote.trim() || busy} onClick={() => run('review', { approved: false, review_note: reviewNote })}>退回修改</Button><Button type="primary" disabled={!review.trim() || busy} onClick={() => run('review', { approved: true, approved_text: review, review_note: reviewNote })}>审核通过</Button></Space>
        </div> : <Alert className="mt" type="info" showIcon message={'已提交 ' + responsible + ' 审核'} description="医生在系统里通过或退回后，这里会显示结果。" />)}
        {task.review_note && <Alert className="mt" type={task.status === 'REJECTED' ? 'warning' : 'info'} message={task.status === 'REJECTED' ? '医生退回原因' : '医生审核意见'} description={task.review_note} />}
        {task.approved_text && <div className="approved-block"><h3>医生审核通过的正文</h3><p className="pre-wrap">{task.approved_text}</p></div>}
        {!doctor && (clinical || outreach) && !ended.includes(task.status) && task.status !== 'CONTACTED' && <ContactExecution key={task.id + '-' + task.version} task={task} busy={busy} run={run} />}
        <ContactHistory attempts={context.attempts} />
        {task.handover_status && <div className="action-block"><h3>随访结果查收</h3><Tag color={task.handover_status === 'ACKNOWLEDGED' ? 'green' : 'gold'}>{task.handover_status === 'ACKNOWLEDGED' ? '医生已查收' : '待医生查收'}</Tag>
          {task.handover_status === 'PENDING' ? (doctor ? <><p className="muted">查看上方已审核正文与联系记录中的患者反馈，写下您的反馈后查收。</p><Space wrap className="mb">{quickFeedback.map(text => <Button key={text} size="small" onClick={() => setFeedback(text)}>{text}</Button>)}</Space>
            <Input.TextArea aria-label="医生反馈" rows={3} value={feedback} onChange={e => setFeedback(e.target.value)} maxLength={2000} placeholder="对随访结果的意见和下一步安排" /><Button className="mt" type="primary" disabled={!feedback.trim() || busy} onClick={() => run('acknowledge', { feedback })}>查收并反馈</Button></>
            : <p className="muted">已交给 {responsible}，医生在系统里查收并反馈后显示在这里。</p>)
            : <><p className="pre-wrap">{task.doctor_feedback}</p><small>{responsible} · {dateText(task.acknowledged_at)}</small></>}
        </div>}
        {!doctor && task.task_type === 'ALERT' && task.status === 'IN_PROGRESS' && !lostContact && <Alert className="mt" type="warning" message="核对患者上报内容后升级责任医生，由医生在系统里处置。" action={<Button disabled={busy} onClick={() => transition('ESCALATE')}>升级医生</Button>} />}
        {!doctor && task.task_type === 'ALERT' && task.status === 'ESCALATED' && <Alert className="mt" type="info" showIcon message={'已升级，等待 ' + responsible + ' 处置'} description="医生记录处置去向和结果后，异常自动关闭。" />}
        {doctor && task.task_type === 'ALERT' && task.status === 'ESCALATED' && <div className="action-block"><h3>医生处置</h3>
          <label className="field-label">处置去向</label><Select value={disposition} onChange={setDisposition} style={{ width: '100%' }} placeholder="选择处置去向" options={options(['OUTPATIENT', 'EMERGENCY', 'INPATIENT', 'OBSERVE', 'FALSE_ALARM', 'OTHER'])} />
          <label className="field-label mt" htmlFor="doctor-outcome">处置结果与交代</label><Input.TextArea id="doctor-outcome" value={outcome} onChange={event => setOutcome(event.target.value)} rows={3} maxLength={2000} placeholder="例如：已电话指导立即到急诊；或：误报，继续按计划随访" />
          <Button className="mt" type="primary" disabled={!disposition || !outcome.trim() || busy} onClick={() => transition('COMPLETE')}>记录处置并关闭</Button>
        </div>}
        {!doctor && !ended.includes(task.status) && !(task.task_type === 'ALERT' && (task.status === 'ESCALATED' || !lostContact)) && <div className="action-block"><h3>{task.task_type === 'REVISIT' ? '复诊核实' : lostContact ? '失联核实' : '服务结果'}</h3>
          {(['REVISIT', 'OUTREACH'].includes(task.task_type) || lostContact) && <><label className="field-label" htmlFor="evidence">{lostContact ? '核实经过与凭证' : task.task_type === 'OUTREACH' ? '联系凭证' : '预约 / 到院核验证据'}</label><Input.TextArea id="evidence" value={evidence} onChange={event => setEvidence(event.target.value)} maxLength={1000} placeholder={lostContact ? '联系家属、社区或备用电话的经过与结果' : '核验时间、科室、记录编号及核验方式'} /></>}
          <label className="field-label mt" htmlFor="outcome">处理结果 / 原因</label><Input.TextArea id="outcome" value={outcome} onChange={event => setOutcome(event.target.value)} maxLength={2000} placeholder="记录本次处理结果；不以已联系代替服务闭环" />
          <Space wrap className="mt">
            {task.task_type === 'REVISIT' && ['PENDING', 'NO_SHOW'].includes(task.status) && <Button type="primary" disabled={!evidence.trim() || busy} onClick={() => transition('BOOK')}>确认已预约</Button>}
            {task.task_type === 'REVISIT' && task.status === 'BOOKED' && <><Button type="primary" disabled={!evidence.trim() || busy} onClick={() => transition('ARRIVE')}>核实已到院</Button><Button disabled={!outcome.trim() || busy} onClick={() => transition('NO_SHOW')}>记录未到院</Button></>}
            {((clinical && task.status === 'CONTACTED') || (task.task_type === 'REVISIT' && task.status === 'ARRIVED') || (outreach && ['PENDING', 'IN_PROGRESS'].includes(task.status)) || (lostContact && ['PENDING', 'IN_PROGRESS'].includes(task.status))) && <Button type="primary" disabled={!outcome.trim() || ((outreach || lostContact) && !evidence.trim()) || busy} onClick={() => transition('COMPLETE')}>记录结果并完成</Button>}
            {task.task_type !== 'ALERT' && !['CONTACTED', 'ARRIVED'].includes(task.status) && <Button danger disabled={!outcome.trim() || busy} onClick={() => transition('CANCEL')}>取消任务</Button>}
          </Space>
        </div>}
        {ended.includes(task.status) && <div className="context-block"><h3>闭环记录</h3><p className="pre-wrap">{task.outcome}</p>{task.disposition && <p>处置去向：{names[task.disposition]}</p>}{task.evidence && <p className="pre-wrap">核验证据：{task.evidence}</p>}<small>{dateText(task.completed_at)}</small></div>}
      </>
    }}</LoadState>
  </Drawer>
}
