import React, { useState } from 'react'
import { Link, useOutletContext, useParams, useSearchParams } from 'react-router-dom'
import { Alert, Button, Card, Checkbox, DatePicker, Descriptions, Form, Input, InputNumber, Select, Space, Steps, Table, Tabs, Tag } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { api, useLoad } from '../api'
import { DataTable, dateText, FormDialog, LoadState, PageTitle, required, stamp } from '../ui'

const statuses = { INTAKE: '待负责人接收', ACTIVE: '服务进行中', PAUSED: '已暂停', EXITED: '已退出', CLOSED: '本次服务已结案' }
const types = { OUTPATIENT: '门诊旅程', DISCHARGE: '住院与出院旅程' }
const statusTag = value => <Tag color={value === 'CLOSED' ? 'success' : value === 'ACTIVE' ? 'processing' : value === 'EXITED' ? 'default' : 'warning'}>{statuses[value] || value}</Tag>
const key = () => crypto.randomUUID()
const evidenceField = <Form.Item name="evidence" label="实际办理/核验依据" rules={required}><Input.TextArea rows={3} maxLength={1000} placeholder="记录具体事实、来源和下一步，不能只填写已通知" /></Form.Item>

export default function Journeys() {
  const account = useOutletContext(), doctor = account.role_code === 'DOCTOR'
  const [searchParams] = useSearchParams()
  const initialPatient = Number(searchParams.get('patient')) || undefined
  const [page, setPage] = useState(0), [filters, setFilters] = useState({ patient_id: initialPatient }), [create, setCreate] = useState(null)
  const state = useLoad(() => api('/journeys/query', { page, size: 10, ...filters }), [page, JSON.stringify(filters)])
  const patients = useLoad(() => api('/patients/query', { page: 0, size: 100 }))
  const filter = (name, value) => { setFilters(old => ({ ...old, [name]: value })); setPage(0) }
  return <><PageTitle title="患者全旅程服务" subtitle="围绕一次门诊或住院出院事件，连接交接、医疗依据、计划、反馈与服务结果。" extra={<Space><Button icon={<ReloadOutlined />} onClick={state.reload}>刷新</Button>{!doctor && <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreate(key())}>建立就诊旅程</Button>}</Space>} />
    <Alert className="mb" showIcon type="info" message="同一患者可以有多次就诊旅程；已门诊结束或已出院患者可以直接接入诊后服务。" description="医生确认本次报告与个案计划，运营/护士执行服务。HIS、企业微信连接仍按现有配置状态，人工记录不表示已完成外部系统核验。" />
    <Card><div className="toolbar"><InputNumber aria-label="患者编号筛选" placeholder="患者编号" min={1} value={filters.patient_id} onChange={value => filter('patient_id', value || undefined)} /><Select placeholder="全部路径" allowClear style={{ width: 180 }} options={Object.entries(types).map(([value, label]) => ({ value, label }))} onChange={value => filter('kind', value)} /><Select placeholder="全部状态" allowClear style={{ width: 180 }} options={Object.entries(statuses).map(([value, label]) => ({ value, label }))} onChange={value => filter('status', value)} /></div>
      <DataTable state={state} page={page} setPage={setPage} columns={[
        { title: '患者 / 旅程', render: (_, row) => <Link to={'/journeys/' + row.id}><strong>{row.patient_name}</strong><div className="muted">旅程 #{row.id} · 患者 #{row.patient_id}</div></Link> },
        { title: '就诊事件', render: (_, row) => <>{row.event_key}<div className="muted">{dateText(row.event_at)}</div></> },
        { title: '路径', dataIndex: 'kind', render: value => types[value] }, { title: '阶段', render: (_, row) => row.steps.find(step => step.code === row.current_step)?.title || '本次旅程结束' },
        { title: '状态', dataIndex: 'status', render: statusTag }, { title: '待结问题', render: (_, row) => row.cases.filter(c => c.status !== 'CLOSED').length },
        { title: '操作', render: (_, row) => <Link to={'/journeys/' + row.id}>办理与核验</Link> },
      ]} /></Card>
    {create && <FormDialog key={create} title="建立一次就诊服务旅程" open onClose={() => setCreate(null)} initialValues={{ patient_id: filters.patient_id, kind: 'OUTPATIENT', entry_phase: 'FULL', source_system: 'MANUAL' }} onSubmit={async values => { await api('/journeys/create', { ...values, event_at: stamp(values.event_at), request_id: create }); state.reload() }}>
      <LoadState state={patients}>{data => <Form.Item name="patient_id" label="患者（需已登记有效服务授权、医生和负责人）" rules={required}><Select showSearch optionFilterProp="label" options={[...data.items.map(p => ({ value: p.id, label: p.name + ' / #' + p.id })), ...(filters.patient_id && !data.items.some(p => p.id === filters.patient_id) ? [{ value: filters.patient_id, label: '患者 #' + filters.patient_id }] : [])]} /></Form.Item>}</LoadState>
      <div className="form-grid"><Form.Item name="kind" label="服务路径" rules={required}><Select options={Object.entries(types).map(([value, label]) => ({ value, label }))} /></Form.Item><Form.Item name="entry_phase" label="接入阶段" rules={required}><Select options={[{ value: 'FULL', label: '门诊/住院阶段开始' }, { value: 'AFTER_CARE', label: '已门诊结束/已出院，诊后接入' }]} /></Form.Item></div>
      <Form.Item name="event_key" label="本次院内就诊事件编号" rules={required}><Input maxLength={120} placeholder="同一来源的事件编号全院唯一" /></Form.Item><Form.Item name="source_system" label="事件依据来源" rules={required}><Select options={[{ value: 'MANUAL', label: '人工核验记录' }, { value: 'HOSPITAL_MOCK', label: '医院 Mock 虚构事件' }]} /></Form.Item>
      <Form.Item name="event_at" label="就诊事件起始时间" rules={required}><DatePicker showTime className="w-full" disabledDate={date => date && date.isAfter(dayjs(), 'day')} /></Form.Item>
      <Form.Item name="identity_evidence" label="患者/授权联系人身份核验依据" rules={required}><Input.TextArea maxLength={1000} /></Form.Item><Form.Item name="handoff_evidence" label="待交接事项、后续安排及接入阶段依据" rules={required}><Input.TextArea maxLength={1000} /></Form.Item>
      <Alert type="warning" message="建立后由当前负责人本人确认接收；诊后直接接入会明确记录此前阶段不适用，不会伪造到院或院内办理结果。" />
    </FormDialog>}
  </>
}

function PlanNodes() {
  return <Form.List name="nodes">{(fields, { add, remove }) => <>{fields.map(field => <Card size="small" key={field.key} className="mb" title={'计划节点 ' + (field.name + 1)} extra={<Button type="text" danger onClick={() => remove(field.name)}>移除</Button>}>
    <div className="form-grid"><Form.Item name={[field.name, 'seq']} label="序号" rules={required}><InputNumber min={1} max={60} /></Form.Item><Form.Item name={[field.name, 'offset_days']} label="距本次报告发生日期的天数（医生审核）" rules={required}><InputNumber min={0} max={1095} /></Form.Item>
      <Form.Item name={[field.name, 'task_type']} label="任务类型" rules={required}><Select options={[{ value: 'FOLLOWUP', label: '随访' }, { value: 'REVISIT', label: '复诊协助' }]} /></Form.Item><Form.Item name={[field.name, 'priority']} label="优先级" rules={required}><Select options={['P0', 'P1', 'P2', 'P3'].map(value => ({ value, label: value }))} /></Form.Item>
      <Form.Item name={[field.name, 'stage']} label="阶段标识" rules={required}><Select options={['ENROLLMENT', 'D3', 'D7', 'D30', 'M3', 'M6', 'Y1', 'CUSTOM'].map(value => ({ value, label: value }))} /></Form.Item><Form.Item name={[field.name, 'title']} label="任务标题" rules={required}><Input maxLength={160} /></Form.Item></div>
    <Form.Item name={[field.name, 'checklist']} label="本次节点待审核内容 / 执行清单" rules={required}><Input.TextArea rows={3} maxLength={2000} /></Form.Item>
  </Card>)}<Button onClick={() => add({ seq: fields.length + 1, task_type: 'FOLLOWUP', stage: 'CUSTOM', priority: 'P2' })} disabled={fields.length >= 60}>添加计划节点</Button></>}</Form.List>
}

export function JourneyDetail() {
  const { id } = useParams(), account = useOutletContext(), doctor = account.role_code === 'DOCTOR'
  const [dialog, setDialog] = useState(null), [selectedTemplate, setSelectedTemplate] = useState(null)
  const state = useLoad(() => api('/journeys/detail', { id: Number(id) }), [id])
  const patientId = state.data?.patient_id
  const records = useLoad(() => patientId ? api('/records/query', { patient_id: patientId, page: 0, size: 100 }) : { items: [] }, [patientId, dialog?.type])
  const appointments = useLoad(() => patientId ? api('/appointments/query', { patient_id: patientId, page: 0, size: 100 }) : { items: [] }, [patientId, dialog?.type])
  const templates = useLoad(() => api('/plans/query', { page: 0, size: 100, status: 'ACTIVE' }))
  const open = (type, extra = {}) => { setSelectedTemplate(null); setDialog({ type, key: key(), ...extra }) }
  return <LoadState state={state}>{j => {
    const terminal = ['EXITED', 'CLOSED'].includes(j.status), active = j.status === 'ACTIVE', step = j.steps.find(s => s.code === j.current_step)
    const currentPlan = j.plans.find(p => p.id === j.current_plan_id)
    const completed = j.status === 'CLOSED' ? j.steps.length : j.stage
    const canService = !doctor && active
    const initial = { occurred_at: dayjs(), satisfaction_status: 'NOT_INVITED', ...dialog?.initial }
    const base = () => ({ id: j.id, version: j.version, request_id: dialog.key })
    const submit = async values => {
      let path = dialog.type, body = { ...base(), ...values }
      if (path === 'step') { body.step_code = j.current_step; body.occurred_at = stamp(values.occurred_at); if (j.current_step === 'CLINICAL') { delete body.confirm_read; await api('/records/review', { id: values.record_id, opinion: values.evidence }) } }
      if (path === 'status') body.action = dialog.action
      if (path === 'case_open') body.due_at = stamp(values.due_at)
      if (path === 'case_action') { body.case_id = dialog.caseId; body.action = dialog.action }
      if (path === 'plan_draft' && selectedTemplate) body.template_id = selectedTemplate.id
      if (path === 'plan_review') body.plan_id = j.current_plan_id
      await api('/journeys/' + path, body); state.reload()
    }
    return <><PageTitle title={types[j.kind] + ' #' + j.id} subtitle={j.patient_name + ' / 就诊事件 ' + j.event_key} extra={<Button icon={<ReloadOutlined />} onClick={state.reload}>刷新结果</Button>} />
      <Card className="mb"><Space wrap>{statusTag(j.status)}<Tag>{j.entry_phase === 'AFTER_CARE' ? '诊后直接接入，前段不适用' : '完整门诊/住院路径'}</Tag><Link to={'/patients/' + j.patient_id}>患者档案 #{j.patient_id}</Link><span>版本 {j.version}</span></Space><Steps className="mt" size="small" current={completed} status={j.status === 'PAUSED' ? 'wait' : 'process'} items={j.steps.map((s, index) => ({ title: s.title, description: s.responsibility === 'DOCTOR' ? '责任医生本人办理' : s.responsibility === 'OWNER' ? '负责人本人接收' : '运营 / 护士', status: j.entry_phase === 'AFTER_CARE' && index > 0 && index < j.steps.findIndex(s => s.code === 'CLINICAL') ? 'wait' : undefined }))} />
      <Descriptions className="mt" size="small" column={3} items={[{ key: 'event', label: '事件发生', children: dateText(j.event_at) }, { key: 'owner', label: '负责人', children: '#' + j.owner_id }, { key: 'doctor', label: '责任医生', children: '#' + j.doctor_id }]} />
      {j.status === 'INTAKE' && <Alert className="mt" type="warning" showIcon message="等待当前患者负责人本人确认接收" action={!doctor && account.user_id === j.owner_id && <Button type="primary" onClick={() => open('handoff_accept')}>确认接收服务交接</Button>} />}
      <Space wrap className="mt">
        {active && j.current_step !== 'PLAN' && (step?.responsibility !== 'OWNER' || account.user_id === j.owner_id) && (!doctor && j.current_step !== 'CLINICAL' || doctor && j.current_step === 'CLINICAL') && <Button type="primary" onClick={() => open('step')}>{j.current_step === 'CLINICAL' ? '确认报告并完成医嘱核对' : '办理：' + step?.title}</Button>}
        {canService && ['PLAN', 'FOLLOWUP', 'CLOSE'].includes(j.current_step) && <Button onClick={() => open('plan_draft', { initial: { plan_text: currentPlan?.plan_text || '', nodes: currentPlan?.nodes || [{ seq: 1, stage: 'CUSTOM', task_type: 'FOLLOWUP', priority: 'P2' }] } })}>{currentPlan ? '提交新的个案计划版本' : '提交本次个案计划'}</Button>}
        {doctor && active && j.current_step === 'PLAN' && currentPlan?.status === 'DRAFT' && <Button type="primary" onClick={() => open('plan_review', { initial: { approved: true } })}>审核当前个案计划</Button>}
        {doctor && active && ['FOLLOWUP', 'CLOSE'].includes(j.current_step) && <Button onClick={() => open('no_revisit')}>确认本轮无需复诊</Button>}
        {!doctor && !terminal && <Button onClick={() => open('case_open', { initial: { kind: 'SERVICE' } })}>登记咨询 / 异常 / 投诉</Button>}
        {!doctor && active && <Button onClick={() => open('status', { action: 'PAUSE' })}>暂停服务</Button>}{!doctor && j.status === 'PAUSED' && <Button onClick={() => open('status', { action: 'RESUME' })}>核验后恢复</Button>}
        {!doctor && ['ACTIVE', 'PAUSED'].includes(j.status) && <Button onClick={() => open('status', { action: 'HANDOFF' })}>重新交接</Button>}
        {!doctor && !terminal && <Button danger onClick={() => open('status', { action: 'EXIT' })}>记录退出本次旅程</Button>}
      {!doctor && !terminal && <Button danger onClick={() => open('status', { action: 'WITHDRAW' })}>撤回患者本用途服务授权</Button>}</Space></Card>
      {j.service_authorization_active === false && <Alert className="mb" type="warning" message="患者本用途服务授权已撤回；原授权记录保留作为历史依据。" />}
      {j.no_revisit && <Alert className="mb" type="info" message="责任医生已确认本轮无需复诊" description={j.no_revisit_reason} />}
      <Tabs items={[
        { key: 'plan', label: '医疗依据与个案计划', children: <>{j.report_snapshot ? <Card className="mb" title="本次事件原报告快照"><pre className="pre-wrap">{j.report_snapshot}</pre></Card> : <Alert className="mb" type="info" message="尚未完成本次原报告核对；到临床节点后由责任医生确认。" />}{[...j.plans].reverse().map(p => <Card key={p.id} className="mb" title={'个案计划版本 ' + p.revision + ' / #' + p.id} extra={<Tag color={p.status === 'APPROVED' ? 'success' : 'default'}>{({ DRAFT: '待责任医生审核', APPROVED: '已批准', REJECTED: '已退回', SUPERSEDED: '已替代' })[p.status]}</Tag>}><p className="pre-wrap">{p.plan_text}</p><p className="muted">报告 #{p.report_id} · 审核人 #{p.reviewer_id || '—'} · {dateText(p.reviewed_at)} · {p.review_note}</p><Table rowKey="seq" size="small" pagination={false} dataSource={p.nodes} columns={[{ title: '节点', dataIndex: 'title' }, { title: '类型', dataIndex: 'task_type', render: type => type === 'FOLLOWUP' ? '随访' : '复诊协助' }, { title: '报告后天数', dataIndex: 'offset_days' }, { title: '执行内容', dataIndex: 'checklist', render: text => <span className="pre-wrap">{text}</span> }]} /></Card>)}</> },
        { key: 'tasks', label: '本次计划任务', children: <Card title="任务已绑定本次事件与计划版本" extra={<Space><Link to="/followups">随访办理</Link>{doctor && <Link to="/doctor/results">结果查收</Link>}</Space>}><Table rowKey="task_id" dataSource={j.tasks} pagination={false} columns={[{ title: '任务', render: (_, t) => <Link to={(t.task_type === 'REVISIT' ? '/revisits' : doctor ? '/doctor/reviews' : '/followups') + '?task=' + t.task_id}>{t.title} / #{t.task_id}</Link> }, { title: '截止', dataIndex: 'due_at', render: dateText }, { title: '执行状态', dataIndex: 'status' }, { title: '医生反馈查收', dataIndex: 'handover_status', render: value => value === 'ACKNOWLEDGED' ? '已查收' : value === 'PENDING' ? '待本人查收' : '—' }]} /><Alert type="info" className="mt" message="个案计划批准后才生成任务。失败联系在随访台登记重试；未完成或未被责任医生查收的随访不能完成本阶段。" /></Card> },
        { key: 'cases', label: '咨询、异常与投诉', children: <Card><Table rowKey="id" pagination={false} dataSource={j.cases} scroll={{ x: 800 }} columns={[{ title: '问题 / 类型', render: (_, c) => <><Tag>{({ SERVICE: '服务咨询', CLINICAL: '临床异常', COMPLAINT: '投诉' })[c.kind]}</Tag><p>{c.summary}</p></> }, { title: '状态', render: (_, c) => <>{({ OPEN: '待接单', ACCEPTED: '处理中', RESOLVED: '已有处理结果，待反馈核验', CLOSED: '反馈已核验，闭环' })[c.status]}{c.overdue && <Tag color="error">超时待处理</Tag>}</> }, { title: '处理 / 患者反馈', render: (_, c) => <><p>{c.resolution || '—'}</p><p className="muted">{c.receipt_evidence}</p></> }, { title: '截止', dataIndex: 'due_at', render: dateText }, { title: '操作', render: (_, c) => { const canResolve = c.kind === 'CLINICAL' ? doctor : !doctor; const action = c.status === 'OPEN' ? 'ACCEPT' : c.status === 'ACCEPTED' ? 'RESOLVE' : c.status === 'RESOLVED' ? 'CLOSE' : null; return action && (action === 'CLOSE' ? !doctor : canResolve) && j.status !== 'CLOSED' && <Button onClick={() => open('case_action', { caseId: c.id, action })}>{({ ACCEPT: '接单', RESOLVE: '记录实质处理结果', CLOSE: '核验患者已获反馈' })[action]}</Button> } }]} /></Card> },
        { key: 'history', label: '不可覆盖的办理历史', children: <Card><Table rowKey="id" dataSource={[...j.results].reverse()} pagination={{ pageSize: 10 }} columns={[{ title: '节点 / 动作', render: (_, r) => <>{j.steps.find(s => s.code === r.step_code)?.title || r.step_code}<div className="muted">{r.action}</div></> }, { title: '人工核验依据', dataIndex: 'evidence', render: value => <span className="pre-wrap">{value}</span> }, { title: '执行人', dataIndex: 'actor_id', render: value => '#' + value }, { title: '发生时间', dataIndex: 'occurred_at', render: dateText }, { title: '录入时间', dataIndex: 'recorded_at', render: dateText }]} /></Card> },
      ]} />
      {dialog && <FormDialog key={dialog.key} title={dialog.type === 'step' ? step?.title : ({ handoff_accept: '本人确认交接', plan_draft: '提交本次事件个案计划（待医生审核）', plan_review: '责任医生本人审核全部计划节点', no_revisit: '责任医生确认本轮无需复诊', case_open: '登记待解决问题', case_action: '记录工单处理与反馈', status: ({ PAUSE: '暂停旅程', RESUME: '核验后恢复旅程', EXIT: '记录患者退出', HANDOFF: '发起重新交接', WITHDRAW: '撤回患者服务授权：停止全部未结束旅程' })[dialog.action] })[dialog.type]} open width={dialog.type === 'plan_draft' ? 920 : 700} initialValues={initial} onClose={() => setDialog(null)} onSubmit={submit} okText={dialog.type === 'plan_review' ? '提交本人审核结果' : '确认办理'}>
        {dialog.type === 'step' && <><Form.Item name="occurred_at" label="实际发生时间" rules={required}><DatePicker showTime /></Form.Item>
          {j.current_step === 'CLINICAL' && <><LoadState state={records}>{data => <><Form.Item name="record_id" label="选择本次原报告" rules={required}><Select options={data.items.filter(r => r.record_type === j.kind).map(r => ({ value: r.id, label: '#' + r.id + ' / ' + dateText(r.occurred_at) }))} /></Form.Item>{data.items.filter(r => r.record_type === j.kind).map(r => <details key={r.id} className="mb"><summary>查看原报告 #{r.id}</summary><p className="pre-wrap">{r.content}</p></details>)}</>}</LoadState><Form.Item name="confirm_read" valuePropName="checked" rules={[{ validator: (_, value) => value ? Promise.resolve() : Promise.reject(new Error('请本人核对所选报告')) }]}><Checkbox>我已核对所选本次原报告并确认服务依据</Checkbox></Form.Item></>}
          {['ARRIVAL', 'CLOSE'].includes(j.current_step) && <LoadState state={appointments}>{data => <Form.Item name="appointment_id" label={j.current_step === 'ARRIVAL' ? '已核验实际到院的本次门诊预约' : '本次报告之后的独立复诊记录（已到院且诊疗结果已核验）'} rules={j.current_step === 'ARRIVAL' ? required : []}><Select allowClear options={data.items.filter(a => ['ARRIVED', 'COMPLETED'].includes(a.status)).map(a => ({ value: a.id, label: '#' + a.id + ' / ' + a.appointment_type + ' / ' + dateText(a.arrived_at) + ' / ' + (a.outcome || '待核验结果') }))} /></Form.Item>}</LoadState>}
          {j.current_step === 'CLOSE' && <><Form.Item name="outcome" label="本轮真实结果" rules={required}><Select options={[{ value: 'VERIFIED', label: '已核验独立复诊及诊疗结果' }, { value: 'NONE', label: '当前责任医生已确认无需本轮复诊' }]} /></Form.Item><Form.Item name="satisfaction_status" label="满意度邀请结果" rules={required}><Select options={[{ value: 'RATED', label: '患者已评分' }, { value: 'DECLINED', label: '患者拒绝评分' }, { value: 'NO_RESPONSE', label: '已邀请，未回应' }, { value: 'NOT_INVITED', label: '尚未邀请' }]} /></Form.Item><Form.Item noStyle shouldUpdate={(before, after) => before.satisfaction_status !== after.satisfaction_status}>{({ getFieldValue }) => getFieldValue('satisfaction_status') === 'RATED' && <Form.Item name="satisfaction_score" label="患者实际评分" rules={required} preserve={false}><InputNumber min={1} max={5} /></Form.Item>}</Form.Item><Form.Item name="feedback" label="结果、体验反馈与下一轮服务需求"><Input.TextArea maxLength={800} /></Form.Item><Alert className="mb" type="warning" message="结案只表示本次服务闭环，不表示治愈。未结问题、异常及未查收随访会阻止结案。退出请使用独立退出按钮。" /></>}
        </>}
        {dialog.type === 'plan_draft' && <><LoadState state={templates}>{data => <Form.Item label="可选：从启用模板复制草稿（仍须个案审核）"><Select allowClear value={selectedTemplate?.id} options={data.items.map(p => ({ value: p.id, label: p.name + ' / 版本 ' + p.version }))} onChange={value => { const template = data.items.find(p => p.id === value); if (template) { setSelectedTemplate(template); setDialog(old => ({ ...old, key: key(), initial: { ...old.initial, plan_text: template.description || '', nodes: template.nodes } })) } else setSelectedTemplate(null) }} /></Form.Item>}</LoadState><Form.Item name="record_id" label="医嘱更新时可选择新的本次报告（需医生先确认已阅）"><Select allowClear options={(records.data?.items || []).filter(r => r.record_type === j.kind).map(r => ({ value: r.id, label: '#' + r.id + ' / ' + dateText(r.occurred_at) }))} /></Form.Item><Form.Item name="plan_text" label="本次个案计划正文" rules={required}><Input.TextArea rows={4} maxLength={6000} /></Form.Item><PlanNodes /><Alert className="mt mb" type="warning" message="提交替代版本会停止旧版本未完成任务；已执行的反馈和医疗依据会保留。未经医生批准不会生成新任务。" /></>}
        {dialog.type === 'plan_review' && <><p className="pre-wrap">{currentPlan?.plan_text}</p><Table className="mb" size="small" rowKey="seq" dataSource={currentPlan?.nodes} pagination={false} columns={[{ title: '节点', dataIndex: 'title' }, { title: '报告后天数', dataIndex: 'offset_days' }, { title: '执行内容', dataIndex: 'checklist' }]} /><Form.Item name="approved" label="本人审核结果" rules={required}><Select options={[{ value: true, label: '全部节点内容与时点通过' }, { value: false, label: '退回修改，不生成任务' }]} /></Form.Item><Form.Item name="review_note" label="审核依据 / 退回原因" rules={required}><Input.TextArea maxLength={1000} /></Form.Item></>}
        {dialog.type === 'no_revisit' && <Form.Item name="reason" label="仅本轮无需复诊的临床依据" rules={required}><Input.TextArea maxLength={1000} /></Form.Item>}
        {dialog.type === 'case_open' && <><Form.Item name="kind" label="问题类型" rules={required}><Select options={[{ value: 'SERVICE', label: '服务咨询 / 流程问题' }, { value: 'CLINICAL', label: '临床异常：由责任医生接单与处置' }, { value: 'COMPLAINT', label: '投诉跟进' }]} /></Form.Item><Form.Item name="summary" label="患者原始反馈 / 待解决事项" rules={required}><Input.TextArea maxLength={2000} /></Form.Item><Form.Item name="due_at" label="处理截止时间" rules={required}><DatePicker showTime /></Form.Item></>}
        {dialog.type === 'status' && dialog.action === 'HANDOFF' && <Alert className="mb" type="info" message="负责人变更请先在患者档案完成分派；重新交接后由新负责人本人接收，接收前暂停旅程任务执行。" />}
        {dialog.type === 'status' && dialog.action === 'WITHDRAW' && <Alert className="mb" type="warning" message="此操作记录患者撤回本用途服务授权，停止该患者全部未结束旅程及其待执行计划；已有临床问题继续保留待处理。重新获得有效授权后，只能另建新旅程。" />}
        {evidenceField}
      </FormDialog>}
    </>
  }}</LoadState>
}

export function AfterCare() {
  const account = useOutletContext(), doctor = account.role_code === 'DOCTOR'
  const summary = useLoad(() => api('/journeys/summary', {})), [page, setPage] = useState(0), [filters, setFilters] = useState({ status: 'OPEN' })
  const cases = useLoad(() => api('/journeys/cases_query', { page, size: 10, ...filters }), [page, JSON.stringify(filters)])
  const refresh = () => { summary.reload(); cases.reload() }
  return <><PageTitle title="诊后主动干预" subtitle="把个案计划、随访、问题处置和复诊结果放在同一次就诊事件中持续跟进。" extra={<Button icon={<ReloadOutlined />} onClick={refresh}>刷新数据</Button>} />
    <LoadState state={summary}>{data => <div className="stats-grid">{[['进行中的服务旅程', data.active_count], ['待负责人交接', data.handoff_count], ['待处理个案计划草稿', data.pending_plan_count], ['未结咨询 / 异常 / 投诉', data.open_case_count], ['超过截止的未结问题', data.overdue_case_count]].map(([label, value]) => <Card key={label}><span className="muted">{label}</span><h2 className="mt">{value}</h2></Card>)}</div>}</LoadState>
    <Card className="mb mt" title="办理入口"><Space wrap><Link to="/journeys">就诊旅程与个案计划</Link><Link to="/patients">患者档案与文件上传</Link><Link to={doctor ? '/doctor/results' : '/followups'}>{doctor ? '查收随访结果' : '执行与重试随访'}</Link><Link to={doctor ? '/doctor/reports' : '/revisits'}>{doctor ? '查看原报告' : '复诊办理'}</Link><Link to={doctor ? '/doctor/alerts' : '/alerts'}>既有异常任务</Link><Link to="/knowledge">宣教与服务内容</Link></Space></Card>
    <Card title="跨旅程待办队列" extra={<span className="muted">按当前医院和患者分派权限计算</span>}><div className="toolbar">
      <Select value={filters.status} allowClear placeholder="全部问题状态" style={{ width: 200 }} options={[{ value: 'OPEN', label: '待接单' }, { value: 'ACCEPTED', label: '处理中' }, { value: 'RESOLVED', label: '已有结果，待反馈核验' }, { value: 'CLOSED', label: '已闭环' }]} onChange={status => { setFilters(old => ({ ...old, status })); setPage(0) }} />
      <Select allowClear placeholder="全部问题类型" style={{ width: 180 }} options={[{ value: 'SERVICE', label: '服务咨询' }, { value: 'CLINICAL', label: '临床异常' }, { value: 'COMPLAINT', label: '投诉' }]} onChange={kind => { setFilters(old => ({ ...old, kind })); setPage(0) }} /><Checkbox checked={Boolean(filters.overdue)} onChange={event => { setFilters(old => ({ ...old, overdue: event.target.checked || undefined })); setPage(0) }}>仅超时未结</Checkbox>
    </div><DataTable state={cases} page={page} setPage={setPage} columns={[{ title: '患者 / 旅程', render: (_, row) => <Link to={'/journeys/' + row.journey_id}>{row.patient_name}<div className="muted">旅程 #{row.journey_id}</div></Link> }, { title: '问题', dataIndex: 'summary' }, { title: '类型', dataIndex: 'kind', render: value => ({ SERVICE: '服务咨询', CLINICAL: '临床异常', COMPLAINT: '投诉' })[value] }, { title: '状态', dataIndex: 'status', render: value => ({ OPEN: '待接单', ACCEPTED: '处理中', RESOLVED: '待核验反馈', CLOSED: '已闭环' })[value] }, { title: '截止', render: (_, row) => <>{dateText(row.due_at)}{row.overdue && <Tag color="error">超时</Tag>}</> }, { title: '操作', render: (_, row) => <Link to={'/journeys/' + row.journey_id}>进入旅程处置</Link> }]} /></Card>
    <Alert className="mt" type="info" showIcon message="已通知不等于问题关闭。临床异常由当前责任医生接单并给出处理结果，运营/护士再核验患者得到反馈。" />
  </>
}
