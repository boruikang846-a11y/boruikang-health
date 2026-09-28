import React, { useEffect, useRef, useState } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router-dom'
import { Alert, App, Button, Card, DatePicker, Descriptions, Drawer, Form, Input, Select, Space, Switch, Tag } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { ContactExecution, ContactHistory, ScheduleFollowups, contactNames } from './FollowupExecution'
import { api, useLoad } from '../api'
import { DataTable, dateText, FormDialog, LoadState, names, options, PageTitle, required, Status } from '../ui'

const ended = ['COMPLETED', 'CANCELLED']
export default function Tasks({ taskType, patientId, compact = false }) {
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
  const requestKey = useRef('')
  useEffect(() => { setType(taskType || 'FOLLOWUP'); setStatus(undefined); setPage(0); setSelected(Number(search.get('task')) || null) }, [taskType])
  const state = useLoad(() => api('/tasks/query', { page, size: 10, patient_id: patientId, task_type: type, status, priority, overdue, contact_pending: contactPending, handover_pending: handoverPending, revisit_pending: search.get('pending') === '1', assignee_id: Number(search.get('assignee')) || undefined, due_from: search.get('due_from') || undefined, due_to: search.get('due_to') || undefined }), [page, patientId, type, status, priority, overdue, contactPending, handoverPending, search.toString()])
  const patients = useLoad(() => create ? api('/patients/query', { page: 0, size: 100, keyword }) : Promise.resolve({ items: [] }), [create, keyword])
  const title = taskType === 'ALERT' ? '异常处理' : taskType === 'REVISIT' ? '复诊跟踪' : '随访与咨询'
  function closeTask() { setSelected(null); if (search.has('task')) { search.delete('task'); setSearch(search, { replace: true }) } }
  const newButton = <Button type="primary" icon={<PlusOutlined />} onClick={() => { requestKey.current = crypto.randomUUID(); setCreate(true) }}>新建任务</Button>
  return <>{!compact && <PageTitle title={title} subtitle={taskType === 'ALERT' ? '从人工确认到医生处置，每一次异常都有处理结果。' : taskType === 'REVISIT' ? '以核实的预约、到院证据和诊疗结果跟踪复诊。' : '依据原报告安排随访，记录每次联系与后续计划，完成后交接责任医生。'} extra={<Space>{type === 'FOLLOWUP' && <Button onClick={() => setSchedule(true)}>安排随访节点</Button>}{newButton}</Space>} />}
    <div className={compact ? '' : 'table-panel'}><div className="toolbar">
      {!taskType && <Select aria-label="任务类型" value={type} style={{ width: 150 }} options={options(['FOLLOWUP', 'CONSULTATION', ...(compact ? ['ALERT', 'REVISIT'] : [])])} onChange={value => { setType(value); setPage(0) }} />}
      <Select aria-label="任务状态" value={status} placeholder="全部状态" allowClear style={{ width: 155 }} options={options(type === 'ALERT' ? ['PENDING', 'IN_PROGRESS', 'ESCALATED', 'COMPLETED'] : type === 'REVISIT' ? ['PENDING', 'BOOKED', 'ARRIVED', 'COMPLETED', 'NO_SHOW', 'CANCELLED'] : ['PENDING', 'IN_PROGRESS', 'PENDING_REVIEW', 'REJECTED', 'APPROVED', 'CONTACTED', 'COMPLETED', 'CANCELLED'])} onChange={value => { setStatus(value); setPage(0) }} />
      <Select aria-label="优先级" value={priority} placeholder="全部优先级" allowClear style={{ width: 145 }} options={options(['P0', 'P1', 'P2', 'P3'])} onChange={value => { setPriority(value); setPage(0) }} />
      <Space><Switch checked={overdue} onChange={value => { setOverdue(value); setPage(0) }} aria-label="仅看逾期" />仅看逾期</Space>
      {type === 'FOLLOWUP' && <><Space><Switch checked={contactPending} onChange={v => { setContactPending(v); setPage(0) }} />待再次联系</Space><Space><Switch checked={handoverPending} onChange={v => { setHandoverPending(v); setPage(0) }} />待医生接收</Space></>}
      <Button icon={<ReloadOutlined />} onClick={state.reload}>刷新</Button>{compact && <Space>{type === 'FOLLOWUP' && <Button onClick={() => setSchedule(true)}>安排随访节点</Button>}{newButton}</Space>}
    </div>
    <DataTable state={state} page={page} setPage={setPage} columns={[
      { title: '患者', dataIndex: 'patient_name', render: (value, row) => <Link to={'/patients/' + row.patient_id}>{value}</Link> },
      { title: '任务', dataIndex: 'title', render: (value, row) => <><strong>{value}</strong><div className="muted">#{row.id} / {names[row.task_type]} {row.followup_stage && ' / ' + row.followup_stage}</div></> },
      { title: '优先级', dataIndex: 'priority', render: value => <Status value={value} /> },
      { title: '状态', dataIndex: 'status', render: value => <Status value={value} /> },
      { title: '截止时间', dataIndex: 'due_at', render: (value, row) => <><span className={row.overdue ? 'danger-text' : ''}>{dateText(value)}</span>{row.overdue && <div className="danger-text">已逾期</div>}</> },
      { title: '联系进度', render: (_, row) => <>{row.contact_result && <Tag color={row.contact_result === 'CONNECTED' ? 'green' : 'orange'}>{contactNames[row.contact_result]}</Tag>}{row.next_contact_at && <div className="muted">下次：{dateText(row.next_contact_at)}</div>}{row.handover_status && <div className="muted">{row.handover_status === 'PENDING' ? '待医生接收' : '医生已接收'}</div>}</> },
      { title: '操作', render: (_, row) => <Button type="link" onClick={() => setSelected(row.id)}>查看 / 处理</Button> },
    ]} /></div>
    <ScheduleFollowups open={schedule} patientId={patientId} onClose={() => setSchedule(false)} onSaved={state.reload} />
    <TaskDrawer id={selected} onClose={closeTask} onChanged={state.reload} />
    <FormDialog title="新建服务任务" open={create} initialValues={{ patient_id: patientId, task_type: taskType || type, priority: 'P2', due_at: dayjs().add(1, 'day') }}
      onClose={() => setCreate(false)} onSubmit={async values => { const task = await api('/tasks/create', { ...values, due_at: values.due_at.format('YYYY-MM-DDTHH:mm:ss'), request_key: requestKey.current }); state.reload(); setSelected(task.id) }}>
      {patientId ? <Form.Item name="patient_id" hidden><Input /></Form.Item> : <LoadState state={patients}>{data => <Form.Item name="patient_id" label="患者（可搜索）" rules={required}><Select showSearch filterOption={false} onSearch={setKeyword} options={data.items.map(row => ({ value: row.id, label: row.name + ' #' + row.id }))} /></Form.Item>}</LoadState>}
      <Form.Item name="title" label="任务标题" rules={required}><Input maxLength={160} /></Form.Item><div className="form-grid">
        <Form.Item name="task_type" label="任务类型" rules={required}><Select options={options(['FOLLOWUP', 'CONSULTATION', 'ALERT', 'REVISIT'])} /></Form.Item>
        <Form.Item name="priority" label="优先级" rules={required}><Select options={options(['P0', 'P1', 'P2', 'P3'])} /></Form.Item></div>
      <Form.Item name="due_at" label="截止时间" rules={required}><DatePicker showTime style={{ width: '100%' }} /></Form.Item>
    </FormDialog>
  </>
}

function TaskDrawer({ id, onClose, onChanged }) {
  const account = useOutletContext()
  const { modal } = App.useApp()
  const state = useLoad(() => id ? api('/tasks/' + id) : Promise.resolve(null), [id])
  const reference = useLoad(() => id ? api('/knowledge/query', { page: 0, size: 100, kind: 'EDUCATION', status: 'PUBLISHED' }) : Promise.resolve({ items: [] }), [id])
  const [knowledgeId, setKnowledgeId] = useState(null)
  const [draft, setDraft] = useState('')
  const [review, setReview] = useState('')
  const [reviewNote, setReviewNote] = useState('')
  const [outcome, setOutcome] = useState('')
  const [evidence, setEvidence] = useState('')
  const [feedback, setFeedback] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  useEffect(() => {
    if (!state.data) return
    const task = state.data.task
    setKnowledgeId(task.knowledge_id); setDraft(task.draft_text || ''); setReview(task.approved_text || task.draft_text || '')
    setReviewNote(task.review_note || ''); setOutcome(task.outcome || ''); setEvidence(task.evidence || ''); setFeedback(task.doctor_feedback || '')
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
  const transition = action => run('transition', { action, outcome, evidence })
  return <Drawer title="服务任务详情" open={Boolean(id)} width={700} onClose={() => !busy && onClose()} destroyOnClose extra={<Button disabled={busy} icon={<ReloadOutlined />} onClick={state.reload}>刷新</Button>}>
    {error && <Alert showIcon type="error" message={error} description="未确认成功时，请刷新核对最新状态。" className="mb" />}
    <LoadState state={state}>{context => {
      if (!context) return null
      const task = context.task
      const clinical = ['FOLLOWUP', 'CONSULTATION'].includes(task.task_type)
      const editable = clinical && ['IN_PROGRESS', 'REJECTED', 'APPROVED'].includes(task.status)
      const doctor = account.role_code === 'DOCTOR' && task.doctor_id === account.user_id
      return <><Space wrap><Status value={task.task_type} /><Status value={task.status} /><Status value={task.priority} />{task.overdue && <Tag color="red">已逾期</Tag>}</Space>
        <h2>{task.title}</h2><Descriptions column={2} size="small" items={[
          { key: 'patient', label: '患者', children: <Link onClick={onClose} to={'/patients/' + task.patient_id}>{task.patient_name}</Link> },
          { key: 'due', label: '截止时间', children: dateText(task.due_at) },
          { key: 'origin', label: '草稿来源', children: names[task.draft_origin] || '尚未起草' },
          { key: 'reviewed', label: '审核时间', children: dateText(task.reviewed_at) },
        ]} />
        <div className="context-block"><h3>个体随访依据 · 本任务关联报告</h3>{context.record ? <><Tag>{names[context.record.record_type]}</Tag>{context.record.source_system === 'HOSPITAL_MOCK' && <Tag color="gold">模拟医院接口 · {context.record.external_id}</Tag>}<small>{dateText(context.record.occurred_at)}</small><p className="pre-wrap">{context.record.content || '指标记录'}</p>
          {context.record.systolic != null && <p>血压 {context.record.systolic}/{context.record.diastolic} mmHg</p>}{context.record.heart_rate != null && <p>心率 {context.record.heart_rate} 次/分</p>}{context.record.weight != null && <p>体重 {context.record.weight} kg</p>}{context.record.glucose != null && <p>血糖 {context.record.glucose} mmol/L</p>}
          {context.record.medication_cycle_days != null && <p>原记录用药周期：{context.record.medication_cycle_days} 天（按原医嘱核对）</p>}{context.record.next_visit_date && <p>原记录复诊日期：{context.record.next_visit_date}</p>}</> : <p className="muted">此任务未关联就诊记录。出院随访请从患者档案录入对应报告后，处理其关联任务。</p>}
          {context.messages.filter(x => x.direction === 'PATIENT_TO_STAFF').map(message => <blockquote key={message.id}><strong>患者原始咨询</strong><p className="pre-wrap">{message.content}</p></blockquote>)}
        </div>
        {task.status === 'PENDING' && task.task_type !== 'REVISIT' && <Button type="primary" loading={busy} onClick={() => run('claim')}>领取并开始处理</Button>}
        {editable && <div className="action-block"><h3>准备随访建议</h3>
          <LoadState state={reference}>{data => <><Alert className="mb" type="info" showIcon message="以原报告和患者实际反馈为依据" description="可以直接起草基础问询，无需选择资料。可选宣教仅作参考；个体建议仍需责任医生审核。" /><label className="field-label" htmlFor="knowledge-choice">已审核宣教参考（可选）</label><Select id="knowledge-choice" value={knowledgeId} allowClear onChange={setKnowledgeId} placeholder="不选择也可以起草" style={{ width: '100%' }} options={data.items.map(item => ({ value: item.id, label: item.title + ' / v' + item.version }))} /></>}</LoadState>
          <Space className="mt mb"><Button disabled={busy} onClick={() => run('draft', { knowledge_id: knowledgeId, mode: 'TEMPLATE' })}>基础问询起草</Button><Button disabled={busy} onClick={() => run('draft', { knowledge_id: knowledgeId, mode: 'AI' })}>AI 辅助起草</Button></Space>
          <label className="field-label" htmlFor="draft-text">建议草稿</label><Input.TextArea id="draft-text" rows={7} value={draft} onChange={event => setDraft(event.target.value)} maxLength={6000} showCount />
          <Space className="mt" wrap><Button disabled={!draft.trim() || busy} onClick={() => run('draft', { knowledge_id: knowledgeId, mode: 'MANUAL', draft_text: draft })}>保存编辑</Button>
            <Button type="primary" disabled={!task.draft_text || draft !== task.draft_text || task.status !== 'IN_PROGRESS' || busy} onClick={() => run('submit-review')}>提交医生审核</Button></Space>
          <p className="muted">修改后先保存，再提交审核。AI 接入未配置时可使用模板路径。</p>
        </div>}
        {task.status === 'PENDING_REVIEW' && <div className="action-block"><h3>医生审核</h3><p className="muted">请结合上方原始依据核对内容；通过后由团队人工联系并记录证据。</p>
          <label className="field-label" htmlFor="approved-text">待批准正文</label><Input.TextArea id="approved-text" value={review} onChange={event => setReview(event.target.value)} rows={7} readOnly={!doctor} maxLength={6000} />
          {doctor ? <><label className="field-label mt" htmlFor="review-note">审核意见 / 退回原因</label><Input.TextArea id="review-note" value={reviewNote} onChange={event => setReviewNote(event.target.value)} maxLength={2000} />
            <Space className="mt"><Button danger disabled={!reviewNote.trim() || busy} onClick={() => run('review', { approved: false, review_note: reviewNote })}>退回修改</Button><Button type="primary" disabled={!review.trim() || busy} onClick={() => run('review', { approved: true, approved_text: review, review_note: reviewNote })}>批准建议</Button></Space></> : <Alert className="mt" type="info" message="等待绑定的责任医生审核" />}
        </div>}
        {task.review_note && <Alert className="mt" type="info" message="审核意见" description={task.review_note} />}
        {task.approved_text && <div className="approved-block"><h3>已批准正文</h3><p className="pre-wrap">{task.approved_text}</p></div>}
        {clinical && !ended.includes(task.status) && task.status !== 'CONTACTED' && <ContactExecution key={task.id + '-' + task.version} task={task} busy={busy} run={run} />}
        <ContactHistory attempts={context.attempts} />
        {task.handover_status && <div className="action-block"><h3>责任医生接收随访记录</h3><Tag color={task.handover_status === 'ACKNOWLEDGED' ? 'green' : 'gold'}>{task.handover_status === 'ACKNOWLEDGED' ? '医生已接收' : '待医生接收'}</Tag>
          {task.handover_status === 'PENDING' && doctor ? <><Input.TextArea className="mt" aria-label="医生接收反馈" rows={3} value={feedback} onChange={e => setFeedback(e.target.value)} maxLength={2000} placeholder="查看联系记录与处理结果，记录反馈和下一步安排。" /><Button className="mt" type="primary" disabled={!feedback.trim() || busy} onClick={() => run('acknowledge', { feedback })}>确认接收并保存反馈</Button></> : <><p>{task.doctor_feedback || '完成记录已进入责任医生的待接收列表。'}</p>{task.acknowledged_at && <small>{dateText(task.acknowledged_at)}</small>}</>}
        </div>}
        {task.task_type === 'ALERT' && task.status === 'IN_PROGRESS' && <Alert className="mt" type="warning" message="请核对患者上报内容，再升级至责任医生。" action={<Button disabled={busy} onClick={() => transition('ESCALATE')}>升级医生</Button>} />}
        {!ended.includes(task.status) && <div className="action-block"><h3>{task.task_type === 'REVISIT' ? '复诊核实' : '服务结果'}</h3>
          {task.task_type === 'REVISIT' && <><label className="field-label" htmlFor="evidence">预约 / 到院核验证据</label><Input.TextArea id="evidence" value={evidence} onChange={event => setEvidence(event.target.value)} maxLength={1000} placeholder="核验时间、科室、记录编号及核验方式" /></>}
          <label className="field-label mt" htmlFor="outcome">处理结果 / 原因</label><Input.TextArea id="outcome" value={outcome} onChange={event => setOutcome(event.target.value)} maxLength={2000} placeholder="记录本次处理结果；不以已联系代替服务闭环" />
          <Space wrap className="mt">
            {task.task_type === 'REVISIT' && ['PENDING', 'NO_SHOW'].includes(task.status) && <Button type="primary" disabled={!evidence.trim() || busy} onClick={() => transition('BOOK')}>确认已预约</Button>}
            {task.task_type === 'REVISIT' && task.status === 'BOOKED' && <><Button type="primary" disabled={!evidence.trim() || busy} onClick={() => transition('ARRIVE')}>核实已到院</Button><Button disabled={!outcome.trim() || busy} onClick={() => transition('NO_SHOW')}>记录未到院</Button></>}
            {((clinical && task.status === 'CONTACTED') || (task.task_type === 'REVISIT' && task.status === 'ARRIVED') || (task.task_type === 'ALERT' && task.status === 'ESCALATED' && doctor)) && <Button type="primary" disabled={!outcome.trim() || busy} onClick={() => transition('COMPLETE')}>记录结果并完成</Button>}
            {task.task_type !== 'ALERT' && !['CONTACTED', 'ARRIVED'].includes(task.status) && <Button danger disabled={!outcome.trim() || busy} onClick={() => transition('CANCEL')}>取消任务</Button>}
          </Space>
        </div>}
        {ended.includes(task.status) && <div className="context-block"><h3>闭环记录</h3><p className="pre-wrap">{task.outcome}</p>{task.evidence && <p className="pre-wrap">核验证据：{task.evidence}</p>}<small>{dateText(task.completed_at)}</small></div>}
      </>
    }}</LoadState>
  </Drawer>
}
