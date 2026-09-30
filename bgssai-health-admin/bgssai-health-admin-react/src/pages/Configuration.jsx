import React, { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Alert, Button, Card, DatePicker, Form, Input, InputNumber, Select, Space, Switch, Table, Tag } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { api, useLoad } from '../api'
import { DataTable, day, dayText, FormDialog, LoadState, names, options, ownerOptions, required, Status } from '../ui'

const templateScenes = ['FIRST_CONTACT', 'HIGH_RISK', 'URGENT', 'FAMILY', 'ARRIVAL_REMINDER', 'FOLLOWUP_REMINDER', 'REVISIT_REMINDER', 'NO_SHOW', 'HESITANT', 'REFUSED', 'COMPLAINT', 'OTHER']
export function Orgs() {
  const account = useOutletContext()
  const [editor, setEditor] = useState(null)
  const state = useLoad(() => api('/orgs'))
  const manager = account.role_code === 'MANAGER'
  return <Card title="机构网络" extra={<Space><Button icon={<ReloadOutlined />} onClick={state.reload}>刷新</Button>{manager && <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditor({ org_type: 'COMMUNITY', active: true })}>新增机构</Button>}</Space>}>
    <LoadState state={state}>{data => <Table rowKey="id" pagination={false} dataSource={data} scroll={{ x: 700 }} columns={[
      { title: '机构', dataIndex: 'name', render: (value, row) => <><strong>{value}</strong><div className="muted">{names[row.org_type]}{row.parent_id ? ' / 上级 ' + (data.find(x => x.id === row.parent_id)?.name || row.parent_id) : ''}</div></> },
      { title: '联系人', render: (_, row) => (row.contact_name || '—') + ' ' + (row.contact_phone || '') },
      { title: '状态', dataIndex: 'active', render: value => <Tag color={value ? 'green' : 'default'}>{value ? '有效' : '停用'}</Tag> },
      { title: '操作', render: (_, row) => manager && <Button type="link" onClick={() => setEditor(row)}>编辑</Button> },
    ]} />}</LoadState>
    <FormDialog title={editor?.id ? '编辑机构' : '新增机构'} open={Boolean(editor)} initialValues={editor} onClose={() => setEditor(null)} onSubmit={async values => { await api('/orgs/save', { ...values, id: editor.id }); state.reload() }}>
      <div className="form-grid"><Form.Item name="name" label="名称" rules={required}><Input maxLength={120} /></Form.Item><Form.Item name="org_type" label="类型" rules={required}><Select options={options(['HOSPITAL', 'BRANCH', 'COMMUNITY', 'TOWNSHIP', 'VILLAGE', 'EXAM_CENTER', 'OTHER'])} /></Form.Item>
        <Form.Item name="parent_id" label="上级机构"><Select allowClear options={(state.data || []).filter(o => o.id !== editor?.id).map(o => ({ value: o.id, label: o.name }))} /></Form.Item><Form.Item name="active" label="有效" valuePropName="checked"><Switch /></Form.Item>
        <Form.Item name="contact_name" label="联系人"><Input maxLength={80} /></Form.Item><Form.Item name="contact_phone" label="联系电话"><Input maxLength={24} /></Form.Item></div>
      <Form.Item name="note" label="备注"><Input.TextArea rows={2} maxLength={400} /></Form.Item>
    </FormDialog>
  </Card>
}
export function Campaigns() {
  const account = useOutletContext()
  const [page, setPage] = useState(0)
  const [editor, setEditor] = useState(null)
  const state = useLoad(() => api('/campaigns/query', { page, size: 10 }), [page])
  const orgs = useLoad(() => api('/orgs'))
  const staff = useLoad(() => api('/staff'))
  const manager = account.role_code === 'MANAGER'
  return <Card title="活动" extra={<Space><Button icon={<ReloadOutlined />} onClick={state.reload}>刷新</Button>{manager && <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditor({ campaign_type: 'DAILY_INVITATION', status: 'PLANNED' })}>新建活动</Button>}</Space>}>
    <DataTable state={state} page={page} setPage={setPage} columns={[
      { title: '活动', dataIndex: 'name', render: (value, row) => <><strong>{value}</strong><div className="muted">{names[row.campaign_type]} / {orgs.data?.find(x => x.id === row.org_id)?.name || '—'} / {row.location || ''}</div></> },
      { title: '时间', render: (_, row) => dayText(row.starts_on) + ' 至 ' + dayText(row.ends_on) },
      { title: '负责人', dataIndex: 'owner_id', render: value => staff.data?.find(x => x.user_id === value)?.real_name || '—' },
      { title: '目标', dataIndex: 'target_count' }, { title: '状态', dataIndex: 'status', render: value => <Status value={value} /> },
      { title: '操作', render: (_, row) => manager && <Button type="link" onClick={() => setEditor({ ...row, starts_on: row.starts_on ? dayjs(row.starts_on) : null, ends_on: row.ends_on ? dayjs(row.ends_on) : null })}>编辑</Button> },
    ]} />
    <FormDialog title={editor?.id ? '编辑活动' : '新建活动'} open={Boolean(editor)} initialValues={editor} onClose={() => setEditor(null)} onSubmit={async values => { await api('/campaigns/save', { ...values, id: editor.id, version: editor.version, starts_on: day(values.starts_on), ends_on: day(values.ends_on) }); state.reload() }}>
      <div className="form-grid"><Form.Item name="name" label="名称" rules={required}><Input maxLength={120} /></Form.Item><Form.Item name="campaign_type" label="类型" rules={required}><Select options={options(['DAILY_INVITATION', 'EARLY_INTERVENTION', 'CLINIC_EVENT', 'SCREENING'])} /></Form.Item>
        <LoadState state={orgs}>{data => <Form.Item name="org_id" label="机构"><Select allowClear options={data.map(o => ({ value: o.id, label: o.name }))} /></Form.Item>}</LoadState><Form.Item name="location" label="地点"><Input maxLength={200} /></Form.Item>
        <Form.Item name="starts_on" label="开始"><DatePicker style={{ width: '100%' }} /></Form.Item><Form.Item name="ends_on" label="结束"><DatePicker style={{ width: '100%' }} /></Form.Item>
        <LoadState state={staff}>{data => <Form.Item name="owner_id" label="负责人"><Select allowClear options={ownerOptions(data)} /></Form.Item>}</LoadState><Form.Item name="target_count" label="目标人数"><InputNumber min={0} /></Form.Item>
        <Form.Item name="status" label="状态" rules={required}><Select options={options(['PLANNED', 'ACTIVE', 'CLOSED'])} /></Form.Item></div>
      <Form.Item name="note" label="备注"><Input.TextArea rows={2} maxLength={1000} /></Form.Item>
    </FormDialog>
  </Card>
}
export function Sla() {
  const account = useOutletContext()
  const [editor, setEditor] = useState(null)
  const state = useLoad(() => api('/sla'))
  const manager = account.role_code === 'MANAGER'
  return <Card title="SLA 时限" extra={<Button icon={<ReloadOutlined />} onClick={state.reload}>刷新</Button>}>
    <p className="muted">按风险等级定义首触、预约、到院时限与失联判定次数。未配置的等级显示默认口径。</p>
    <LoadState state={state}>{data => <Table rowKey="risk_level" pagination={false} dataSource={data} scroll={{ x: 700 }} columns={[
      { title: '风险', dataIndex: 'risk_level', render: value => <Status value={value} /> }, { title: '首次联系', dataIndex: 'first_contact_hours', render: v => v + ' 小时' },
      { title: '预约', dataIndex: 'booking_days', render: v => v + ' 天' }, { title: '到院', dataIndex: 'arrival_days', render: v => v + ' 天' }, { title: '失联判定', dataIndex: 'lost_after_attempts', render: v => '连续 ' + v + ' 次未联系上' },
      { title: '说明', dataIndex: 'note' }, { title: '操作', render: (_, row) => manager && <Button type="link" onClick={() => setEditor(row)}>调整</Button> },
    ]} />}</LoadState>
    <FormDialog title={'调整 ' + (names[editor?.risk_level] || '') + ' 的 SLA'} open={Boolean(editor)} initialValues={editor} onClose={() => setEditor(null)} onSubmit={async values => { await api('/sla/save', { ...values, risk_level: editor.risk_level }); state.reload() }}>
      <div className="form-grid"><Form.Item name="first_contact_hours" label="首次联系（小时）" rules={required}><InputNumber min={1} max={720} /></Form.Item><Form.Item name="booking_days" label="预约（天）" rules={required}><InputNumber min={1} max={365} /></Form.Item>
        <Form.Item name="arrival_days" label="到院（天）" rules={required}><InputNumber min={1} max={365} /></Form.Item><Form.Item name="lost_after_attempts" label="失联判定次数" rules={required}><InputNumber min={1} max={20} /></Form.Item></div>
      <Form.Item name="note" label="说明"><Input maxLength={400} /></Form.Item>
    </FormDialog>
  </Card>
}
export function Templates() {
  const account = useOutletContext()
  const [page, setPage] = useState(0)
  const [filters, setFilters] = useState({})
  const [editor, setEditor] = useState(null)
  const state = useLoad(() => api('/templates/query', { page, size: 10, ...filters }), [page, JSON.stringify(filters)])
  const manager = account.role_code === 'MANAGER'
  const filter = (key, value) => { setFilters(previous => ({ ...previous, [key]: value === '' ? undefined : value })); setPage(0) }
  return <Card title="短信与话术模板" extra={<Space><Button icon={<ReloadOutlined />} onClick={state.reload}>刷新</Button>{manager && <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditor({ channel: 'SMS', scene: 'FIRST_CONTACT', active: true })}>新建模板</Button>}</Space>}>
    <div className="toolbar"><Select aria-label="渠道" placeholder="全部渠道" allowClear style={{ width: 120 }} options={options(['SMS', 'SCRIPT', 'WECHAT'])} onChange={value => filter('channel', value)} /><Select aria-label="场景" placeholder="全部场景" allowClear style={{ width: 160 }} options={options(templateScenes)} onChange={value => filter('scene', value)} /></div>
    <DataTable state={state} page={page} setPage={setPage} columns={[
      { title: '模板', dataIndex: 'title', render: (value, row) => <><strong>{value}</strong><div className="muted">{row.code} / {names[row.channel]} / {names[row.scene]}</div></> },
      { title: '内容', dataIndex: 'content', render: value => <div className="pre-wrap">{value}</div> },
      { title: '状态', dataIndex: 'active', render: value => <Tag color={value ? 'green' : 'default'}>{value ? '启用' : '停用'}</Tag> },
      { title: '操作', render: (_, row) => manager && <Button type="link" onClick={() => setEditor(row)}>编辑</Button> },
    ]} />
    <FormDialog title={editor?.id ? '编辑模板' : '新建模板'} open={Boolean(editor)} initialValues={editor} onClose={() => setEditor(null)} onSubmit={async values => { await api('/templates/save', { ...values, id: editor.id, version: editor.version }); state.reload() }}>
      <div className="form-grid"><Form.Item name="code" label="编码" rules={required}><Input maxLength={40} disabled={Boolean(editor?.id)} /></Form.Item><Form.Item name="title" label="标题" rules={required}><Input maxLength={120} /></Form.Item>
        <Form.Item name="channel" label="渠道" rules={required}><Select options={options(['SMS', 'SCRIPT', 'WECHAT'])} /></Form.Item><Form.Item name="scene" label="场景" rules={required}><Select options={options(templateScenes)} /></Form.Item></div>
      <Form.Item name="content" label="内容（用 {占位} 标记需替换处）" rules={required}><Input.TextArea rows={6} maxLength={4000} showCount /></Form.Item>
      <Form.Item name="active" label="启用" valuePropName="checked"><Switch /></Form.Item>
      <Alert type="info" message="模板只供人工复制使用；系统不接短信网关，发送后在患者档案登记已发。" />
    </FormDialog>
  </Card>
}
export function MessageLogDialog({ open, patientId, taskId, onClose, onSaved }) {
  const templates = useLoad(() => open ? api('/templates/query', { page: 0, size: 100, active: true }) : Promise.resolve({ items: [] }), [open])
  const key = React.useRef('')
  if (open && !key.current) key.current = crypto.randomUUID()
  return <FormDialog title="登记已发消息" open={open} initialValues={{ channel: 'SMS', sent_at: dayjs() }} onClose={() => { key.current = ''; onClose() }} onSubmit={async values => { await api('/message-logs/create', { ...values, patient_id: patientId, task_id: taskId, sent_at: values.sent_at.format('YYYY-MM-DDTHH:mm:ss'), request_key: key.current }); key.current = ''; onSaved() }}>
    <Alert className="mb" type="warning" message="这里只登记已经通过短信平台、微信或电话发出的内容，系统不会发送。" />
    <div className="form-grid"><Form.Item name="channel" label="渠道" rules={required}><Select options={options(['SMS', 'WECHAT', 'PHONE_NOTE'])} /></Form.Item><Form.Item name="sent_at" label="发送时间" rules={required}><DatePicker showTime style={{ width: '100%' }} /></Form.Item></div>
    <LoadState state={templates}>{data => <Form.Item noStyle shouldUpdate>{form => <Form.Item name="template_code" label="使用模板"><Select allowClear options={data.items.filter(t => t.channel !== 'SCRIPT').map(t => ({ value: t.code, label: t.title }))} onChange={code => { const t = data.items.find(x => x.code === code); if (t) form.setFieldValue('content', t.content) }} /></Form.Item>}</Form.Item>}</LoadState>
    <Form.Item name="content" label="实际发送内容" rules={required}><Input.TextArea rows={4} maxLength={4000} /></Form.Item>
    <Form.Item name="evidence" label="发送凭证" rules={required}><Input maxLength={1000} placeholder="短信平台流水号或截图位置" /></Form.Item>
  </FormDialog>
}
