import React, { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Button, Card, DatePicker, Form, Input, Select, Space, Switch } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { api, useLoad } from '../api'
import { DataTable, dateText, FormDialog, LoadState, names, options, PageTitle, required, stamp, Status } from '../ui'

const types = ['OUTPATIENT', 'EXAM', 'REVISIT', 'INPATIENT', 'SPECIALIST_CLINIC']
const channels = ['GREEN_CHANNEL', 'STAFF_BOOKED', 'SELF_BOOKED', 'ONLINE']
export function AppointmentDialog({ open, patientId, taskId, onClose, onSaved }) {
  const key = useRef('')
  const [keyword, setKeyword] = useState('')
  const patients = useLoad(() => open && !patientId ? api('/patients/query', { page: 0, size: 100, keyword }) : Promise.resolve({ items: [] }), [open, patientId, keyword])
  const clinicians = useLoad(() => open ? api('/clinicians') : Promise.resolve([]), [open])
  if (open && !key.current) key.current = crypto.randomUUID()
  return <FormDialog title="登记预约" open={open} initialValues={{ patient_id: patientId, task_id: taskId, appointment_type: taskId ? 'REVISIT' : 'OUTPATIENT', channel: 'STAFF_BOOKED', appointment_at: dayjs().add(1, 'day').hour(9).minute(0), department: '心血管内科' }} onClose={() => { key.current = ''; onClose() }}
    onSubmit={async values => { await api('/appointments/create', { ...values, appointment_at: stamp(values.appointment_at), request_key: key.current }); key.current = ''; onSaved() }}>
    {patientId ? <Form.Item name="patient_id" hidden><Input /></Form.Item> : <LoadState state={patients}>{data => <Form.Item name="patient_id" label="患者（可搜索）" rules={required}><Select showSearch filterOption={false} onSearch={setKeyword} options={data.items.map(row => ({ value: row.id, label: row.name + ' #' + row.id }))} /></Form.Item>}</LoadState>}
    {taskId && <Form.Item name="task_id" hidden><Input /></Form.Item>}
    <div className="form-grid"><Form.Item name="appointment_type" label="预约类型" rules={required}><Select options={options(types)} /></Form.Item><Form.Item name="channel" label="预约渠道" rules={required}><Select options={options(channels)} /></Form.Item>
      <Form.Item name="appointment_at" label="预约时间" rules={required}><DatePicker showTime style={{ width: '100%' }} /></Form.Item><Form.Item name="department" label="科室" rules={required}><Input maxLength={80} /></Form.Item></div>
    <LoadState state={clinicians}>{data => <Form.Item name="clinician_id" label="接诊医生"><Select allowClear options={data.map(x => ({ value: x.id, label: x.name + ' / ' + x.department }))} /></Form.Item>}</LoadState>
    <Form.Item name="evidence" label="预约凭证" rules={required}><Input maxLength={1000} placeholder="号源编号、预约截图或绿色通道单号" /></Form.Item>
    <Alert type="info" message={taskId ? '将把当前复诊任务置为已预约。' : '未指定复诊任务时会自动创建一条复诊跟踪任务，到院、爽约、完成都同步更新。'} />
  </FormDialog>
}
export function AppointmentAction({ row, onClose, onSaved }) {
  const action = row?.action
  const label = { REMIND: '登记已提醒', ARRIVE: '核实到院', NO_SHOW: '记录未到院', CANCEL: '取消预约', COMPLETE: '记录到院结果' }[action]
  return <FormDialog title={label} open={Boolean(row)} initialValues={{ at: dayjs(), effective: true }} onClose={onClose} onSubmit={async values => { await api('/appointments/transition', { id: row.id, version: row.version, action, ...values, at: stamp(values.at) }); onSaved() }}>
    <Form.Item name="at" label="实际时间" rules={required}><DatePicker showTime style={{ width: '100%' }} /></Form.Item>
    {action === 'ARRIVE' && <Form.Item name="effective" label="有效到诊（完成了预约的诊疗/检查）" valuePropName="checked"><Switch /></Form.Item>}
    {action === 'NO_SHOW' && <Form.Item name="no_show_reason" label="未到院原因" rules={required}><Select options={options(['DISTANCE', 'COST', 'NO_SLOT', 'FORGOT', 'EXTERNAL_HOSPITAL', 'REFUSED', 'ILLNESS', 'OTHER'])} /></Form.Item>}
    {action === 'COMPLETE' && <Form.Item name="outcome" label="到院结果" rules={required}><Select options={options(['OUTPATIENT_TREATED', 'EXAM_ORDERED', 'ADMITTED', 'REFERRED', 'NO_ACTION', 'OTHER'])} /></Form.Item>}
    {['NO_SHOW', 'CANCEL', 'COMPLETE'].includes(action) && <Form.Item name="outcome_note" label={action === 'CANCEL' ? '取消原因' : '说明'} rules={action === 'CANCEL' ? required : undefined}><Input.TextArea rows={2} maxLength={1000} /></Form.Item>}
    {['REMIND', 'ARRIVE'].includes(action) && <Form.Item name="evidence" label={action === 'REMIND' ? '提醒方式与凭证' : '到院核验证据'} rules={required}><Input maxLength={1000} placeholder={action === 'REMIND' ? '短信发送截图、通话记录' : '签到记录、检查单号'} /></Form.Item>}
  </FormDialog>
}
export function appointmentActions(row, setAction) {
  const buttons = []
  if (row.status === 'BOOKED') buttons.push(['REMIND', '已提醒'])
  if (['BOOKED', 'REMINDED'].includes(row.status)) buttons.push(['ARRIVE', '到院'], ['NO_SHOW', '未到院'], ['CANCEL', '取消'])
  if (row.status === 'ARRIVED') buttons.push(['COMPLETE', '记录结果'])
  return buttons.map(([action, text]) => <Button key={action} type="link" danger={action === 'CANCEL'} onClick={() => setAction({ ...row, action })}>{text}</Button>)
}
export default function Appointments() {
  const [page, setPage] = useState(0)
  const [filters, setFilters] = useState({})
  const [create, setCreate] = useState(false)
  const [action, setAction] = useState(null)
  const state = useLoad(() => api('/appointments/query', { page, size: 10, ...filters }), [page, JSON.stringify(filters)])
  const clinicians = useLoad(() => api('/clinicians'))
  const filter = (key, value) => { setFilters(previous => ({ ...previous, [key]: value === '' ? undefined : value })); setPage(0) }
  return <><PageTitle title="预约到诊" subtitle="预约、提醒、到院、爽约结构化登记，履约率与有效到诊率从这里出。" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setCreate(true)}>登记预约</Button>} />
    <Card><div className="toolbar"><Select aria-label="状态" placeholder="全部状态" allowClear style={{ width: 130 }} options={options(['BOOKED', 'REMINDED', 'ARRIVED', 'COMPLETED', 'NO_SHOW', 'CANCELLED'])} onChange={value => filter('status', value)} />
      <Select aria-label="类型" placeholder="全部类型" allowClear style={{ width: 130 }} options={options(types)} onChange={value => filter('appointment_type', value)} />
      <Select aria-label="渠道" placeholder="全部渠道" allowClear style={{ width: 130 }} options={options(channels)} onChange={value => filter('channel', value)} />
      <DatePicker.RangePicker onChange={range => { filter('from', range?.[0]?.format('YYYY-MM-DD')); filter('to', range?.[1]?.format('YYYY-MM-DD')) }} />
      <Space><Switch onChange={value => filter('open', value || undefined)} />只看未到院</Space><Button icon={<ReloadOutlined />} onClick={state.reload}>刷新</Button></div>
      <DataTable state={state} page={page} setPage={setPage} columns={[
        { title: '患者', dataIndex: 'patient_name', render: (value, row) => <Link to={'/patients/' + row.patient_id}>{value} #{row.patient_id}</Link> },
        { title: '预约', render: (_, row) => <><strong>{dateText(row.appointment_at)}</strong><div className="muted">{names[row.appointment_type]} / {row.department} / {clinicians.data?.find(x => x.id === row.clinician_id)?.name || '未指定医生'}</div></> },
        { title: '渠道', dataIndex: 'channel', render: value => names[value] },
        { title: '状态', render: (_, row) => <><Status value={row.status} />{row.reminder_sent_at && <div className="muted">提醒 {dateText(row.reminder_sent_at)}</div>}{row.no_show_reason && <div className="muted">{names[row.no_show_reason]}</div>}{row.outcome && <div className="muted">{names[row.outcome]}{row.effective === false ? ' / 非有效到诊' : ''}</div>}</> },
        { title: '操作', render: (_, row) => <Space wrap>{appointmentActions(row, setAction)}{row.task_id && <Link to={'/revisits?task=' + row.task_id}>任务</Link>}</Space> },
      ]} /></Card>
    <AppointmentDialog open={create} onClose={() => setCreate(false)} onSaved={state.reload} />
    <AppointmentAction row={action} onClose={() => setAction(null)} onSaved={state.reload} />
  </>
}
