import React, { useRef, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { Alert, App, Button, Card, DatePicker, Form, Input, InputNumber, Select, Space, Switch, Table, Tabs, Tag } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { api, useLoad } from '../api'
import { DataTable, dateText, day, dayText, FormDialog, LoadState, money, names, options, PageTitle, required, stamp, Status } from '../ui'

const scenes = ['POST_VISIT', 'POST_DISCHARGE', 'POST_SURGERY', 'SCREENING', 'LONG_TERM']
export function EnrollmentDialog({ open, patientId, onClose, onSaved }) {
  const key = useRef('')
  const packages = useLoad(() => open ? api('/packages/query', { page: 0, size: 100, status: 'ACTIVE' }) : Promise.resolve({ items: [] }), [open])
  if (open && !key.current) key.current = crypto.randomUUID()
  return <FormDialog title="签约服务包" open={open} initialValues={{ signed_at: dayjs(), consent_at: dayjs(), activate_now: true }} onClose={() => { key.current = ''; onClose() }}
    onSubmit={async values => { await api('/enrollments/create', { ...values, patient_id: patientId, signed_at: stamp(values.signed_at), consent_at: stamp(values.consent_at), request_key: key.current }); key.current = ''; onSaved() }}>
    <LoadState state={packages}>{data => <Form.Item name="package_id" label="服务包" rules={required}><Select options={data.items.map(k => ({ value: k.id, label: k.name + ' / ' + names[k.tier] + ' / ' + k.period_days + ' 天 / ' + money(k.price_cents) }))} /></Form.Item>}</LoadState>
    <div className="form-grid"><Form.Item name="order_no" label="订单 / 收据编号"><Input maxLength={60} placeholder="线下收款单号，系统不收款" /></Form.Item><Form.Item name="signed_at" label="签约时间" rules={required}><DatePicker showTime style={{ width: '100%' }} /></Form.Item>
      <Form.Item name="consent_at" label="知情同意时间" rules={required}><DatePicker showTime style={{ width: '100%' }} /></Form.Item><Form.Item name="consent_evidence" label="同意凭证" rules={required}><Input maxLength={400} placeholder="签字文件编号或录音编号" /></Form.Item></div>
    <Form.Item name="summary" label="约定摘要"><Input.TextArea rows={2} maxLength={1000} /></Form.Item>
    <Form.Item name="activate_now" label="立即激活并按方案生成任务" valuePropName="checked"><Switch /></Form.Item>
    <Alert type="info" message="激活后按服务包关联的随访方案批量生成随访与复诊任务，服务期从激活日起算。" />
  </FormDialog>
}
export function EnrollmentActions({ row, onChanged }) {
  const { modal, message } = App.useApp()
  const [upgrade, setUpgrade] = useState(false)
  const [close, setClose] = useState(false)
  const packages = useLoad(() => upgrade ? api('/packages/query', { page: 0, size: 100, status: 'ACTIVE' }) : Promise.resolve({ items: [] }), [upgrade])
  const run = (action, fields = {}) => api('/enrollments/transition', { id: row.id, version: row.version, action, ...fields }).then(onChanged).catch(e => { message.error(e.message) })
  return <Space wrap>
    {row.status === 'PENDING_ACTIVATION' && <Button type="link" onClick={() => modal.confirm({ title: '激活服务实例？', content: '将按随访方案生成任务，服务期从今天起算。', onOk: () => run('ACTIVATE', { start_date: dayjs().format('YYYY-MM-DD') }) })}>激活</Button>}
    {row.status === 'ACTIVE' && <Button type="link" onClick={() => setUpgrade(true)}>升级</Button>}
    {row.status === 'ACTIVE' && row.remaining_days != null && row.remaining_days <= 0 && <Button type="link" onClick={() => run('EXPIRE')}>标记到期</Button>}
    {['PENDING_ACTIVATION', 'ACTIVE'].includes(row.status) && <Button type="link" danger onClick={() => setClose(true)}>结案</Button>}
    <FormDialog title="升级服务包" open={upgrade} onClose={() => setUpgrade(false)} onSubmit={values => run('UPGRADE', values)}>
      <LoadState state={packages}>{data => <Form.Item name="upgrade_package_id" label="升级到" rules={required}><Select options={data.items.filter(k => k.id !== row.package_id).map(k => ({ value: k.id, label: k.name + ' / ' + money(k.price_cents) }))} /></Form.Item>}</LoadState>
      <Form.Item name="upgrade_order_no" label="补差订单编号"><Input maxLength={60} /></Form.Item><Alert type="info" message="旧实例未完成的任务作废，新实例立即激活并重新生成任务。" />
    </FormDialog>
    <FormDialog title="结案" open={close} onClose={() => setClose(false)} onSubmit={values => run('CLOSE', values)}><Form.Item name="reason" label="结案原因" rules={required}><Input.TextArea rows={2} maxLength={400} /></Form.Item></FormDialog>
  </Space>
}
export const enrollmentColumns = (withPatient, onChanged) => [
  ...(withPatient ? [{ title: '患者', dataIndex: 'patient_name', render: (value, row) => <Link to={'/patients/' + row.patient_id}>{value} #{row.patient_id}</Link> }] : []),
  { title: '服务包', render: (_, row) => <><strong>{row.package_name}</strong><div className="muted">{names[row.tier]} / 单号 {row.order_no || '—'}</div></> },
  { title: '状态', dataIndex: 'status', render: value => <Status value={value} /> },
  { title: '服务期', render: (_, row) => <>{dayText(row.start_date)} 至 {dayText(row.end_date)}{row.remaining_days != null && <div className={row.remaining_days <= 14 ? 'danger-text' : 'muted'}>剩余 {row.remaining_days} 天</div>}</> },
  { title: '任务进度', render: (_, row) => row.completed_task_count + ' / ' + row.task_count },
  { title: '操作', render: (_, row) => <EnrollmentActions row={row} onChanged={onChanged} /> },
]
function PackageTab() {
  const account = useOutletContext()
  const [page, setPage] = useState(0)
  const [editor, setEditor] = useState(null)
  const { modal, message } = App.useApp()
  const state = useLoad(() => api('/packages/query', { page, size: 10 }), [page])
  const plans = useLoad(() => api('/plans/query', { page: 0, size: 100 }))
  const manager = account.role_code === 'MANAGER'
  const status = (row, next) => modal.confirm({ title: (next === 'ACTIVE' ? '启用' : '下架') + '服务包？', onOk: () => api('/packages/status', { id: row.id, version: row.version, status: next }).then(state.reload).catch(e => message.error(e.message)) })
  return <><div className="toolbar"><Button icon={<ReloadOutlined />} onClick={state.reload}>刷新</Button>{manager && <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditor({ tier: 'BASIC', scene: 'POST_DISCHARGE', period_days: 90, price_cents: 0 })}>新建服务包</Button>}</div>
    <DataTable state={state} page={page} setPage={setPage} columns={[
      { title: '服务包', render: (_, row) => <><strong>{row.name}</strong><div className="muted">{row.code} / {row.disease}</div></> },
      { title: '层级 / 场景', render: (_, row) => names[row.tier] + ' / ' + names[row.scene] },
      { title: '周期 / 价格', render: (_, row) => row.period_days + ' 天 / ' + money(row.price_cents) },
      { title: '权益', render: (_, row) => <>随访 {row.followup_count ?? 0} 次 / 评估 {row.assessment_count ?? 0} / 复查 {row.review_count ?? 0}<div className="muted">{row.plan_name || '未关联方案'}</div></> },
      { title: '状态', render: (_, row) => <><Status value={row.status} /><div className="muted">在用 {row.active_enrollments}</div></> },
      { title: '操作', render: (_, row) => manager && <Space>{row.status !== 'RETIRED' && <Button type="link" onClick={() => setEditor(row)}>编辑</Button>}{row.status === 'DRAFT' && <Button type="link" onClick={() => status(row, 'ACTIVE')}>启用</Button>}{row.status === 'ACTIVE' && <Button type="link" danger onClick={() => status(row, 'RETIRED')}>下架</Button>}</Space> },
    ]} />
    <FormDialog title={editor?.id ? '编辑服务包' : '新建服务包'} width={760} open={Boolean(editor)} initialValues={editor} onClose={() => setEditor(null)} onSubmit={async values => { await api('/packages/save', { ...values, id: editor.id, version: editor.version }); state.reload() }}>
      <div className="form-grid"><Form.Item name="code" label="编码" rules={required}><Input maxLength={40} placeholder="大写字母、数字、横线" /></Form.Item><Form.Item name="name" label="名称" rules={required}><Input maxLength={120} /></Form.Item>
        <Form.Item name="disease" label="适用病种" rules={required}><Input maxLength={120} /></Form.Item><Form.Item name="tier" label="层级" rules={required}><Select options={options(['BASIC', 'STANDARD', 'PREMIUM'])} /></Form.Item>
        <Form.Item name="scene" label="入组场景" rules={required}><Select options={options(scenes)} /></Form.Item><Form.Item name="period_days" label="服务周期（天）" rules={required}><InputNumber min={1} max={1095} /></Form.Item>
        <Form.Item name="price_cents" label="价格（分，仅记录）" rules={required}><InputNumber min={0} /></Form.Item><LoadState state={plans}>{data => <Form.Item name="plan_id" label="随访方案"><Select allowClear options={data.items.filter(p => p.status !== 'RETIRED').map(p => ({ value: p.id, label: p.name + ' (' + names[p.status] + ')' }))} /></Form.Item>}</LoadState>
        <Form.Item name="followup_count" label="随访次数"><InputNumber min={0} /></Form.Item><Form.Item name="assessment_count" label="评估次数"><InputNumber min={0} /></Form.Item><Form.Item name="review_count" label="复查次数"><InputNumber min={0} /></Form.Item><Form.Item name="service_hours" label="服务时段"><Input maxLength={120} /></Form.Item></div>
      <Form.Item name="device_note" label="设备"><Input maxLength={400} /></Form.Item><Form.Item name="privilege_note" label="权益说明"><Input maxLength={400} /></Form.Item>
      <Form.Item name="content" label="服务内容"><Input.TextArea rows={3} maxLength={4000} /></Form.Item><Form.Item name="red_lines" label="红线（不做什么）"><Input.TextArea rows={2} maxLength={2000} /></Form.Item>
      <Alert type="info" message="价格只做记录，本系统不发生支付。启用前必须关联启用中的随访方案。" />
    </FormDialog></>
}
function PlanTab() {
  const account = useOutletContext()
  const [page, setPage] = useState(0)
  const [editor, setEditor] = useState(null)
  const { modal, message } = App.useApp()
  const state = useLoad(() => api('/plans/query', { page, size: 10 }), [page])
  const manager = account.role_code === 'MANAGER'
  const status = (row, next) => modal.confirm({ title: (next === 'ACTIVE' ? '启用' : '停用') + '方案？', onOk: () => api('/plans/status', { id: row.id, version: row.version, status: next }).then(state.reload).catch(e => message.error(e.message)) })
  return <><div className="toolbar"><Button icon={<ReloadOutlined />} onClick={state.reload}>刷新</Button>{manager && <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditor({ entry_scene: 'POST_DISCHARGE', nodes: [{ seq: 1, stage: 'ENROLLMENT', offset_days: 1, task_type: 'FOLLOWUP', title: '首次随访', priority: 'P2' }] })}>新建方案</Button>}</div>
    <DataTable state={state} page={page} setPage={setPage} columns={[
      { title: '方案', render: (_, row) => <><strong>{row.name}</strong><div className="muted">{row.disease} / {names[row.entry_scene]}</div></> },
      { title: '节点', dataIndex: 'nodes', render: nodes => <Space wrap>{nodes.map(n => <Tag key={n.seq}>{n.seq}. {n.stage} +{n.offset_days}天 {names[n.task_type]}</Tag>)}</Space> },
      { title: '状态', dataIndex: 'status', render: value => <Status value={value} /> },
      { title: '操作', render: (_, row) => manager && <Space>{row.status !== 'RETIRED' && <Button type="link" onClick={() => setEditor(row)}>编辑</Button>}{row.status === 'DRAFT' && <Button type="link" onClick={() => status(row, 'ACTIVE')}>启用</Button>}{row.status === 'ACTIVE' && <Button type="link" danger onClick={() => status(row, 'RETIRED')}>停用</Button>}</Space> },
    ]} />
    <FormDialog title={editor?.id ? '编辑随访方案' : '新建随访方案'} width={860} open={Boolean(editor)} initialValues={editor} onClose={() => setEditor(null)} onSubmit={async values => { await api('/plans/save', { ...values, id: editor.id, version: editor.version }); state.reload() }}>
      <div className="form-grid"><Form.Item name="name" label="名称" rules={required}><Input maxLength={120} /></Form.Item><Form.Item name="disease" label="适用病种" rules={required}><Input maxLength={120} /></Form.Item><Form.Item name="entry_scene" label="入组场景" rules={required}><Select options={options(scenes)} /></Form.Item></div>
      <Form.Item name="description" label="说明"><Input.TextArea rows={2} maxLength={2000} /></Form.Item>
      <Form.List name="nodes">{(fields, { add, remove }) => <><Table pagination={false} size="small" rowKey="key" dataSource={fields} scroll={{ x: 760 }} columns={[
        { title: '序', render: (_, f) => <Form.Item name={[f.name, 'seq']} rules={required} noStyle><InputNumber min={1} max={60} style={{ width: 60 }} /></Form.Item> },
        { title: '阶段', render: (_, f) => <Form.Item name={[f.name, 'stage']} rules={required} noStyle><Select style={{ width: 120 }} options={['ENROLLMENT', 'D3', 'D7', 'D30', 'M3', 'M6', 'Y1', 'CUSTOM'].map(v => ({ value: v, label: v }))} /></Form.Item> },
        { title: '第几天', render: (_, f) => <Form.Item name={[f.name, 'offset_days']} rules={required} noStyle><InputNumber min={0} max={1095} style={{ width: 80 }} /></Form.Item> },
        { title: '类型', render: (_, f) => <Form.Item name={[f.name, 'task_type']} rules={required} noStyle><Select style={{ width: 100 }} options={options(['FOLLOWUP', 'REVISIT'])} /></Form.Item> },
        { title: '任务标题', render: (_, f) => <Form.Item name={[f.name, 'title']} rules={required} noStyle><Input maxLength={160} /></Form.Item> },
        { title: '优先级', render: (_, f) => <Form.Item name={[f.name, 'priority']} rules={required} noStyle><Select style={{ width: 80 }} options={options(['P0', 'P1', 'P2', 'P3'])} /></Form.Item> },
        { title: '清单', render: (_, f) => <Form.Item name={[f.name, 'checklist']} noStyle><Input maxLength={2000} placeholder="分号分隔" /></Form.Item> },
        { title: '', render: (_, f) => <Button type="link" danger onClick={() => remove(f.name)}>删</Button> },
      ]} /><Button className="mt" onClick={() => add({ seq: fields.length + 1, stage: 'CUSTOM', offset_days: 0, task_type: 'FOLLOWUP', priority: 'P2' })}>添加节点</Button></>}</Form.List>
    </FormDialog></>
}
function EnrollmentTab() {
  const [page, setPage] = useState(0)
  const [filters, setFilters] = useState({})
  const state = useLoad(() => api('/enrollments/query', { page, size: 10, ...filters }), [page, JSON.stringify(filters)])
  const filter = (key, value) => { setFilters(previous => ({ ...previous, [key]: value === '' ? undefined : value })); setPage(0) }
  return <><div className="toolbar"><Select aria-label="状态" placeholder="全部状态" allowClear style={{ width: 130 }} options={options(['PENDING_ACTIVATION', 'ACTIVE', 'EXPIRED', 'CLOSED', 'UPGRADED'])} onChange={value => filter('status', value)} />
    <Space><Switch onChange={value => filter('expiring_soon', value || undefined)} />14 天内到期</Space><Button icon={<ReloadOutlined />} onClick={state.reload}>刷新</Button></div>
    <DataTable state={state} page={page} setPage={setPage} columns={enrollmentColumns(true, state.reload)} /></>
}
export default function Packages() {
  return <><PageTitle title="服务包与随访方案" subtitle="服务包是卖给患者的 SKU，随访方案是它展开的节点；签约实例记录每位患者的服务期与任务进度。" />
    <Card><Tabs items={[{ key: 'packages', label: '服务包', children: <PackageTab /> }, { key: 'plans', label: '随访方案', children: <PlanTab /> }, { key: 'enrollments', label: '签约实例', children: <EnrollmentTab /> }]} /></Card></>
}
