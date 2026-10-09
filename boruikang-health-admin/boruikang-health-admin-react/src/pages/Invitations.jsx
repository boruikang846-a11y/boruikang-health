import React, { useRef, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { Alert, Button, Card, DatePicker, Form, Input, Select, Space, Switch, Tag } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { api, useLoad } from '../api'
import { DataTable, dateText, FormDialog, LoadState, names, options, PageTitle, required, stamp, Status } from '../ui'

export const results = ['WILLING', 'UNDECIDED', 'REFUSED', 'ALREADY_TREATED', 'TREATED_ELSEWHERE', 'NO_ANSWER', 'BUSY', 'WRONG_NUMBER', 'FAMILY_ANSWERED', 'DECEASED', 'OTHER']
const unreached = ['NO_ANSWER', 'BUSY', 'WRONG_NUMBER']
export function InvitationDialog({ open, patientId, onClose, onSaved }) {
  const key = useRef('')
  const [keyword, setKeyword] = useState('')
  const patients = useLoad(() => open && !patientId ? api('/patients/query', { page: 0, size: 100, keyword }) : Promise.resolve({ items: [] }), [open, patientId, keyword])
  const campaigns = useLoad(() => open ? api('/campaigns/query', { page: 0, size: 100, status: 'ACTIVE' }) : Promise.resolve({ items: [] }), [open])
  const templates = useLoad(() => open ? api('/templates/query', { page: 0, size: 100, channel: 'SCRIPT', active: true }) : Promise.resolve({ items: [] }), [open])
  if (open && !key.current) key.current = crypto.randomUUID()
  return <FormDialog title="记录一轮邀约" width={720} open={open} initialValues={{ patient_id: patientId, invited_at: dayjs(), method: 'PHONE', result: 'WILLING', planned_visit_mode: 'SELF' }} onClose={() => { key.current = ''; onClose() }}
    onSubmit={async values => { await api('/invitations/create', { ...values, invited_at: stamp(values.invited_at), next_invite_at: stamp(values.next_invite_at), request_key: key.current }); key.current = ''; onSaved() }}>
    {patientId ? <Form.Item name="patient_id" hidden><Input /></Form.Item> : <LoadState state={patients}>{data => <Form.Item name="patient_id" label="患者（可搜索）" rules={required}><Select showSearch filterOption={false} onSearch={setKeyword} options={data.items.map(row => ({ value: row.id, label: row.name + ' #' + row.id }))} /></Form.Item>}</LoadState>}
    <LoadState state={templates}>{data => data.items.length ? <Alert className="mb" type="info" message="参考话术" description={<Select style={{ width: '100%' }} placeholder="选择话术查看要点" options={data.items.map(t => ({ value: t.id, label: t.title }))} onChange={id => { const t = data.items.find(x => x.id === id); if (t) window.alert(t.content) }} />} /> : null}</LoadState>
    <div className="form-grid"><Form.Item name="invited_at" label="联系时间" rules={required}><DatePicker showTime style={{ width: '100%' }} /></Form.Item><Form.Item name="method" label="方式" rules={required}><Select options={options(['PHONE', 'SMS', 'WECHAT', 'IN_PERSON', 'OTHER'])} /></Form.Item>
      <Form.Item name="result" label="结果" rules={required}><Select options={options(results)} /></Form.Item>
      <Form.Item noStyle shouldUpdate={(a, b) => a.result !== b.result}>{({ getFieldValue }) => getFieldValue('result') === 'WILLING' ? <Form.Item name="planned_visit_mode" label="计划到院方式" rules={required}><Select options={options(['SELF', 'FAMILY_ESCORT', 'GREEN_CHANNEL', 'UNDECIDED'])} /></Form.Item> : <LoadState state={campaigns}>{data => <Form.Item name="campaign_id" label="所属活动"><Select allowClear options={data.items.map(c => ({ value: c.id, label: c.name }))} /></Form.Item>}</LoadState>}</Form.Item></div>
    <Form.Item name="summary" label="沟通摘要" rules={required}><Input.TextArea rows={3} maxLength={1000} placeholder="患者原话要点、顾虑、约定事项" /></Form.Item>
    <Form.Item noStyle shouldUpdate={(a, b) => a.result !== b.result}>{({ getFieldValue }) => <Form.Item name="next_invite_at" label={unreached.includes(getFieldValue('result')) ? '下次邀约时间（必填）' : '下次联系时间'} rules={unreached.includes(getFieldValue('result')) ? required : undefined}><DatePicker showTime style={{ width: '100%' }} /></Form.Item>}</Form.Item>
    <Form.Item name="evidence" label="联系凭证" rules={required}><Input maxLength={1000} placeholder="通话记录、短信截图或录音编号" /></Form.Item>
    <Alert type="info" message="接通类结果会关闭首次联系任务并把患者置为已触达；连续未联系上达到 SLA 次数会自动产生失联异常。" />
  </FormDialog>
}
export default function Invitations({ patientId }) {
  const account = useOutletContext()
  const [page, setPage] = useState(0)
  const [filters, setFilters] = useState({})
  const [create, setCreate] = useState(false)
  const state = useLoad(() => api('/invitations/query', { page, size: 10, ...filters, patient_id: patientId }), [page, patientId, JSON.stringify(filters)])
  const staff = useLoad(() => api('/staff'))
  const filter = (key, value) => { setFilters(previous => ({ ...previous, [key]: value === '' ? undefined : value })); setPage(0) }
  return <><PageTitle title="邀约记录" subtitle="每一轮电话、短信或当面邀约都留痕；结果字典统一，触达率和预约率从这里算。" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setCreate(true)}>记录邀约</Button>} />
    <Card><div className="toolbar"><Select aria-label="结果" placeholder="全部结果" allowClear style={{ width: 160 }} options={options(results)} onChange={value => filter('result', value)} />
      <Select aria-label="方式" placeholder="全部方式" allowClear style={{ width: 120 }} options={options(['PHONE', 'SMS', 'WECHAT', 'IN_PERSON', 'OTHER'])} onChange={value => filter('method', value)} />
      <Space><Switch onChange={value => filter('reached', value ? false : undefined)} />只看未联系上</Space>
      <DatePicker.RangePicker onChange={range => { filter('invited_from', range?.[0]?.format('YYYY-MM-DD')); filter('invited_to', range?.[1]?.format('YYYY-MM-DD')) }} />
      <Button icon={<ReloadOutlined />} onClick={state.reload}>刷新</Button></div>
      <DataTable state={state} page={page} setPage={setPage} columns={[
        { title: '患者', dataIndex: 'patient_name', render: (value, row) => <Link to={'/patients/' + row.patient_id}>{value} #{row.patient_id}</Link> },
        { title: '轮次', dataIndex: 'round', render: value => '第 ' + value + ' 轮' },
        { title: '时间 / 方式', render: (_, row) => <>{dateText(row.invited_at)}<div className="muted">{names[row.method]}</div></> },
        { title: '结果', render: (_, row) => <><Status value={row.result} />{row.planned_visit_mode && <div className="muted">{names[row.planned_visit_mode]}</div>}</> },
        { title: '摘要', dataIndex: 'summary', render: (value, row) => <>{value}{row.next_invite_at && <div className="muted">下次：{dateText(row.next_invite_at)}</div>}</> },
        { title: '记录人', dataIndex: 'actor_id', render: value => staff.data?.find(x => x.user_id === value)?.real_name || value },
      ]} /></Card>
    <InvitationDialog open={create} patientId={patientId} onClose={() => setCreate(false)} onSaved={state.reload} />
  </>
}
