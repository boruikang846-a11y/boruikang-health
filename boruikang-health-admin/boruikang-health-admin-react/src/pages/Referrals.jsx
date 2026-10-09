import React, { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Button, Card, DatePicker, Form, Input, Select, Space, Switch, Tag } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { api, useLoad } from '../api'
import { DataTable, dateText, doctorOptions, FormDialog, LoadState, names, options, PageTitle, required, stamp, Status } from '../ui'

export function ReferralDialog({ open, patientId, onClose, onSaved }) {
  const key = useRef('')
  const [keyword, setKeyword] = useState('')
  const patients = useLoad(() => open && !patientId ? api('/patients/query', { page: 0, size: 100, keyword }) : Promise.resolve({ items: [] }), [open, patientId, keyword])
  const orgs = useLoad(() => open ? api('/orgs') : Promise.resolve([]), [open])
  if (open && !key.current) key.current = crypto.randomUUID()
  return <FormDialog title="发起转诊" open={open} initialValues={{ patient_id: patientId, direction: 'INBOUND', referral_type: 'UPWARD', initiated_at: dayjs() }} onClose={() => { key.current = ''; onClose() }}
    onSubmit={async values => { await api('/referrals/create', { ...values, initiated_at: stamp(values.initiated_at), request_key: key.current }); key.current = ''; onSaved() }}>
    {patientId ? <Form.Item name="patient_id" hidden><Input /></Form.Item> : <LoadState state={patients}>{data => <Form.Item name="patient_id" label="患者（可搜索）" rules={required}><Select showSearch filterOption={false} onSearch={setKeyword} options={data.items.map(row => ({ value: row.id, label: row.name + ' #' + row.id }))} /></Form.Item>}</LoadState>}
    <div className="form-grid"><Form.Item name="direction" label="方向" rules={required}><Select options={options(['INBOUND', 'OUTBOUND'])} /></Form.Item><Form.Item name="referral_type" label="类型" rules={required}><Select options={options(['UPWARD', 'DOWNWARD', 'LATERAL'])} /></Form.Item>
      <LoadState state={orgs}>{data => <><Form.Item name="from_org_id" label="转出机构"><Select allowClear options={data.map(o => ({ value: o.id, label: o.name }))} /></Form.Item><Form.Item name="to_org_id" label="接收机构"><Select allowClear options={data.map(o => ({ value: o.id, label: o.name }))} /></Form.Item></>}</LoadState>
      <Form.Item name="risk_level" label="风险等级（决定到达 SLA）"><Select allowClear options={options(['UNKNOWN', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])} /></Form.Item><Form.Item name="initiated_at" label="发起时间" rules={required}><DatePicker showTime style={{ width: '100%' }} /></Form.Item></div>
    <Form.Item name="reason" label="转诊原因" rules={required}><Input.TextArea rows={2} maxLength={1000} /></Form.Item>
    <Form.Item name="evidence" label="转诊单 / 凭证" rules={required}><Input maxLength={1000} /></Form.Item>
  </FormDialog>
}
export function ReferralAction({ row, onClose, onSaved }) {
  const action = row?.action
  const label = { ACCEPT: '登记接收', ARRIVE: '登记到达', FEEDBACK: '登记反馈', CLOSE: '关闭转诊', REJECT: '退回' }[action]
  const clinicians = useLoad(() => action === 'FEEDBACK' ? api('/clinicians') : Promise.resolve([]), [action])
  return <FormDialog title={label} open={Boolean(row)} initialValues={{ at: dayjs() }} onClose={onClose} onSubmit={async values => { await api('/referrals/transition', { id: row.id, version: row.version, action, ...values, at: stamp(values.at) }); onSaved() }}>
    <Form.Item name="at" label="实际时间" rules={required}><DatePicker showTime style={{ width: '100%' }} /></Form.Item>
    {action === 'FEEDBACK' && <><div className="form-grid"><Form.Item name="feedback_department" label="接诊科室"><Input maxLength={80} /></Form.Item><LoadState state={clinicians}>{data => <Form.Item name="feedback_clinician_id" label="接诊医生"><Select allowClear options={doctorOptions(data)} /></Form.Item>}</LoadState></div>
      <Form.Item name="feedback_diagnosis" label="诊断" rules={required}><Input maxLength={400} /></Form.Item><Form.Item name="feedback_disposition" label="处置" rules={required}><Input.TextArea rows={2} maxLength={1000} /></Form.Item></>}
    {action === 'REJECT' && <Form.Item name="reason" label="退回原因" rules={required}><Input.TextArea rows={2} maxLength={1000} /></Form.Item>}
    {action === 'CLOSE' && <Form.Item name="reason" label="关闭说明（填 TRANSFERRED 表示患者已整体转出）"><Input maxLength={1000} /></Form.Item>}
    {['ACCEPT', 'ARRIVE'].includes(action) && <Form.Item name="evidence" label="凭证" rules={required}><Input maxLength={1000} /></Form.Item>}
  </FormDialog>
}
export function referralActions(row, setAction) {
  const buttons = []
  if (row.status === 'INITIATED') buttons.push(['ACCEPT', '接收'], ['REJECT', '退回'])
  if (['INITIATED', 'ACCEPTED'].includes(row.status)) buttons.push(['ARRIVE', '到达'])
  if (['ACCEPTED', 'ARRIVED'].includes(row.status)) buttons.push(['FEEDBACK', '反馈'])
  if (['ARRIVED', 'FEEDBACK_RECORDED'].includes(row.status)) buttons.push(['CLOSE', '关闭'])
  return buttons.map(([action, text]) => <Button key={action} type="link" danger={action === 'REJECT'} onClick={() => setAction({ ...row, action })}>{text}</Button>)
}
export default function Referrals({ patientId }) {
  const [page, setPage] = useState(0)
  const [filters, setFilters] = useState({})
  const [create, setCreate] = useState(false)
  const [action, setAction] = useState(null)
  const state = useLoad(() => api('/referrals/query', { page, size: 10, ...filters, patient_id: patientId }), [page, patientId, JSON.stringify(filters)])
  const orgs = useLoad(() => api('/orgs'))
  const filter = (key, value) => { setFilters(previous => ({ ...previous, [key]: value === '' ? undefined : value })); setPage(0) }
  const orgName = id => orgs.data?.find(x => x.id === id)?.name || '—'
  return <><PageTitle title="转诊" subtitle="基层与医院之间的上转、下转都有发起、接收、到达、反馈四步留痕，超 SLA 未到达的高亮。" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setCreate(true)}>发起转诊</Button>} />
    <Card><div className="toolbar"><Select aria-label="方向" placeholder="全部方向" allowClear style={{ width: 120 }} options={options(['INBOUND', 'OUTBOUND'])} onChange={value => filter('direction', value)} />
      <Select aria-label="状态" placeholder="全部状态" allowClear style={{ width: 140 }} options={options(['INITIATED', 'ACCEPTED', 'ARRIVED', 'FEEDBACK_RECORDED', 'CLOSED', 'REJECTED'])} onChange={value => filter('status', value)} />
      <Space><Switch onChange={value => filter('overdue', value || undefined)} />超 SLA 未到达</Space><Button icon={<ReloadOutlined />} onClick={state.reload}>刷新</Button></div>
      <DataTable state={state} page={page} setPage={setPage} columns={[
        { title: '患者', dataIndex: 'patient_name', render: (value, row) => <Link to={'/patients/' + row.patient_id}>{value} #{row.patient_id}</Link> },
        { title: '转诊', render: (_, row) => <><Tag>{names[row.direction]} / {names[row.referral_type]}</Tag><div className="muted">{orgName(row.from_org_id)} → {orgName(row.to_org_id)}</div></> },
        { title: '原因', dataIndex: 'reason', render: (value, row) => <>{value}<div className="muted">{dateText(row.initiated_at)} · <Status value={row.risk_level} /></div></> },
        { title: '状态', render: (_, row) => <><Status value={row.status} />{row.overdue && <Tag color="red">超 SLA</Tag>}<div className="muted">到达期限 {dateText(row.sla_due_at)}</div>{row.feedback_diagnosis && <div className="muted">反馈：{row.feedback_diagnosis}</div>}</> },
        { title: '操作', render: (_, row) => <Space wrap>{referralActions(row, setAction)}</Space> },
      ]} /></Card>
    <ReferralDialog open={create} patientId={patientId} onClose={() => setCreate(false)} onSaved={state.reload} />
    <ReferralAction row={action} onClose={() => setAction(null)} onSaved={state.reload} />
  </>
}
