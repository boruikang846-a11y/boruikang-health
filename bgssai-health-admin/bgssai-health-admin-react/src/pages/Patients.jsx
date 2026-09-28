import React, { useState } from 'react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { Alert, Button, Card, DatePicker, Descriptions, Form, Input, InputNumber, Select, Space, Statistic, Tabs, Tag, Timeline } from 'antd'
import { ArrowRightOutlined, PlusOutlined, ReloadOutlined, TeamOutlined, ScheduleOutlined, AlertOutlined, ClockCircleOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { api, useLoad } from '../api'
import { DataTable, dateText, FormDialog, LoadState, names, options, PageTitle, required, Status } from '../ui'
import Tasks from './Tasks'

export function Dashboard() {
  const account = useOutletContext()
  const state = useLoad(() => api('/dashboard'))
  const pending = useLoad(() => api('/tasks/query', { page: 0, size: 6, status: 'PENDING' }))
  return <><PageTitle title="运营工作台" subtitle={account.real_name + '，今天的每一项服务，从这里开始。'}
    extra={<Button icon={<ReloadOutlined />} onClick={() => { state.reload(); pending.reload() }}>刷新数据</Button>} />
    <LoadState state={state}>{data => <><div className="stats-grid">
      {[
        ['在管患者', data.managing_count, '累计入组 ' + data.patient_count + ' 人', TeamOutlined, 'blue', '/patients'],
        ['待执行任务', data.pending_task_count, '待医生审核 ' + data.review_count + ' 项', ScheduleOutlined, 'violet', '/followups'],
        ['待处理异常', data.open_alert_count, '高风险 / 重点关注 ' + data.high_risk_count + ' 人', AlertOutlined, 'orange', '/alerts'],
        ['逾期待办', data.overdue_count, '尚待完成的复诊 ' + data.revisit_count + ' 项', ClockCircleOutlined, 'teal', '/followups?overdue=1'],
      ].map(([label, value, detail, Icon, color, path]) => <Link to={path} key={label}><Card className="metric-card"><div className={'metric-icon ' + color}><Icon /></div><Statistic title={label} value={value} /><p>{detail}</p></Card></Link>)}
    </div><div className="dashboard-grid"><Card title="近 7 日随访履约" extra={<span className="muted">按到期日期统计</span>}>
      <div className="chart-legend"><span className="legend due" /> 应随访 <span className="legend done" /> 已完成</div>
      <div className="bar-chart">{data.daily.map(item => {
        const maximum = Math.max(1, ...data.daily.map(row => row.due_count))
        return <div className="bar-group" key={item.date}><div className="bar-pair">
          <div className="chart-bar due" style={{ height: Math.max(3, item.due_count / maximum * 140) }}><span>{item.due_count}</span></div>
          <div className="chart-bar done" style={{ height: Math.max(3, item.completed_count / maximum * 140) }}><span>{item.completed_count}</span></div>
        </div><small>{dayjs(item.date).format('MM/DD')}</small></div>
      })}</div></Card><Card className="care-summary" title="把服务真正闭环"><h2>问询有依据<br />回复有审核</h2><p>患者反馈与原始记录共同支撑随访。医生审核后，团队人工联系并记录实际触达凭证。</p>
      <Link to="/followups">进入随访工作台 <ArrowRightOutlined /></Link><div className="summary-foot">数据更新于 {dateText(data.as_of)}</div></Card></div></>}</LoadState>
    <Card className="mt" title="优先待办" extra={<Link to="/followups">查看全部 <ArrowRightOutlined /></Link>}>
      <DataTable state={pending} page={0} size={6} setPage={() => {}} columns={[
        { title: '患者', dataIndex: 'patient_name', render: (value, row) => <Link to={'/patients/' + row.patient_id}>{value}</Link> },
        { title: '任务', dataIndex: 'title' }, { title: '类型', dataIndex: 'task_type', render: value => names[value] },
        { title: '优先级', dataIndex: 'priority', render: value => <Status value={value} /> },
        { title: '截止时间', dataIndex: 'due_at', render: (value, row) => <span className={row.overdue ? 'danger-text' : ''}>{dateText(value)}</span> },
        { title: '操作', render: (_, row) => <Link to={(row.task_type === 'ALERT' ? '/alerts' : row.task_type === 'REVISIT' ? '/revisits' : '/followups') + '?task=' + row.id}>处理</Link> },
      ]} /></Card>
  </>
}
function StaffFields({ staff, disabled, doctorDisabled }) {
  return <div className="form-grid"><Form.Item name="doctor_id" label="责任医生" rules={required}><Select disabled={disabled || doctorDisabled} options={(staff || []).filter(x => x.role_code === 'DOCTOR').map(x => ({ value: x.user_id, label: x.real_name }))} /></Form.Item>
    <Form.Item name="owner_id" label="负责管家 / 运营" rules={required}><Select disabled={disabled} options={(staff || []).filter(x => ['NURSE', 'OPERATOR', 'MANAGER'].includes(x.role_code)).map(x => ({ value: x.user_id, label: x.real_name }))} /></Form.Item></div>
}
export function Patients() {
  const account = useOutletContext()
  const navigate = useNavigate()
  const [page, setPage] = useState(0)
  const [filters, setFilters] = useState({})
  const [create, setCreate] = useState(false)
  const state = useLoad(() => api('/patients/query', { page, size: 10, ...filters }), [page, JSON.stringify(filters)])
  const staff = useLoad(() => api('/staff'))
  const filter = (key, value) => { setFilters(previous => ({ ...previous, [key]: value || undefined })); setPage(0) }
  return <><PageTitle title="患者中心" subtitle="统一档案与责任归属，让服务始终围绕患者展开。" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setCreate(true)}>新建患者</Button>} />
    <Card><div className="toolbar"><Input.Search placeholder="搜索患者姓名" allowClear onSearch={value => filter('keyword', value)} style={{ width: 260 }} />
      <Select aria-label="风险筛选" placeholder="全部风险" allowClear style={{ width: 160 }} options={options(['UNKNOWN', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])} onChange={value => filter('risk_level', value)} />
      <Input.Search placeholder="按科室筛选" allowClear onSearch={value => filter('department', value)} style={{ width: 200 }} /><Button icon={<ReloadOutlined />} onClick={state.reload}>刷新</Button></div>
      <DataTable state={state} page={page} setPage={setPage} columns={[
        { title: '患者 / 编号', dataIndex: 'name', render: (value, row) => <Link to={'/patients/' + row.id}><strong>{value}</strong><div className="muted">#{row.id}</div></Link> },
        { title: '性别 / 年龄', render: (_, row) => (names[row.gender] || '未填写') + ' / ' + row.age + ' 岁' },
        { title: '科室 / 病种', dataIndex: 'department', render: (value, row) => <>{value}<div className="muted">{row.disease}</div></> },
        { title: '风险分层', dataIndex: 'risk_level', render: value => <Status value={value} /> },
        { title: '管理状态', dataIndex: 'lifecycle', render: value => <Status value={value} /> },
        { title: '联系电话', dataIndex: 'phone' },
        { title: '操作', render: (_, row) => <Link to={'/patients/' + row.id}>查看档案</Link> },
      ]} />
    </Card>
    <FormDialog title="新建患者档案" open={create} initialValues={{ gender: 'UNKNOWN', department: '综合服务', ...(account.role_code === 'DOCTOR' ? { doctor_id: account.user_id } : {}), ...(['NURSE', 'OPERATOR'].includes(account.role_code) ? { owner_id: account.user_id } : {}) }} onClose={() => setCreate(false)}
      onSubmit={async values => { const result = await api('/patients/create', values); navigate('/patients/' + result.id) }}>
      <div className="form-grid"><Form.Item name="name" label="姓名" rules={required}><Input maxLength={80} /></Form.Item><Form.Item name="phone" label="联系电话" rules={required}><Input maxLength={24} /></Form.Item>
        <Form.Item name="gender" label="性别" rules={required}><Select options={options(['MALE', 'FEMALE', 'UNKNOWN'])} /></Form.Item><Form.Item name="age" label="年龄" rules={required}><InputNumber min={0} max={130} /></Form.Item>
        <Form.Item name="department" label="科室" rules={required}><Input maxLength={80} /></Form.Item><Form.Item name="disease" label="病种 / 管理原因" rules={required}><Input maxLength={120} /></Form.Item></div>
      <LoadState state={staff}>{data => <StaffFields staff={data} doctorDisabled={account.role_code === 'DOCTOR'} />}</LoadState>
      <Form.Item name="note" label="内部备注"><Input.TextArea rows={3} maxLength={2000} showCount /></Form.Item>
      <Alert type="info" message="人工建档不会按手机号自动关联患者 Web 账号。初始风险为待评估，由责任医生确认。" />
    </FormDialog>
  </>
}
export function PatientDetail() {
  const { id } = useParams()
  const account = useOutletContext()
  const [edit, setEdit] = useState(false)
  const [recordOpen, setRecordOpen] = useState(false)
  const [tab, setTab] = useState('records')
  const [page, setPage] = useState(0)
  const [revision, setRevision] = useState(0)
  const state = useLoad(() => api('/patients/' + id), [id, revision])
  const staff = useLoad(() => api('/staff'))
  const packages = useLoad(() => api('/knowledge/query', { page: 0, size: 100, kind: 'PACKAGE', status: 'PUBLISHED' }))
  const history = useLoad(() => tab === 'tasks' ? Promise.resolve(null) : api('/' + tab + '/query', { page, size: 10, patient_id: Number(id) }), [id, page, tab, revision])
  const refresh = () => setRevision(value => value + 1)
  return <><Link to="/patients" className="back-link">返回患者中心</Link><LoadState state={state}>{patient => <>
    <PageTitle title={patient.name + ' 的健康档案'} subtitle={patient.department + ' / ' + patient.disease} extra={<Space><Button onClick={() => setEdit(true)}>管理档案</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => setRecordOpen(true)}>添加就诊记录</Button></Space>} />
    <Card className="mb"><Descriptions column={{ xs: 1, sm: 2, lg: 4 }} items={[
      { key: 'id', label: '档案编号', children: '#' + patient.id }, { key: 'age', label: '性别 / 年龄', children: (names[patient.gender] || '未填写') + ' / ' + patient.age + ' 岁' },
      { key: 'phone', label: '联系电话', children: patient.phone }, { key: 'risk', label: '风险分层', children: <Status value={patient.risk_level} /> },
      { key: 'status', label: '管理状态', children: <Status value={patient.lifecycle} /> },
      { key: 'doctor', label: '责任医生', children: staff.data?.find(x => x.user_id === patient.doctor_id)?.real_name || '待分配' },
      { key: 'owner', label: '负责管家', children: staff.data?.find(x => x.user_id === patient.owner_id)?.real_name || '待分配' },
      { key: 'join', label: '入组时间', children: dateText(patient.gmt_create) },
      { key: 'source', label: '数据来源', children: patient.source_system === 'HOSPITAL_MOCK' ? <Tag color="gold">模拟医院接口</Tag> : '人工录入' },
      { key: 'hospitalId', label: '医院患者编号', children: patient.hospital_patient_id || '暂无' },
      { key: 'note', label: '内部备注', children: patient.note || '暂无', span: 4 },
    ]} /></Card>
    <Card><Tabs activeKey={tab} onChange={value => { setTab(value); setPage(0) }} items={[{ key: 'records', label: '就诊与健康记录' }, { key: 'tasks', label: '服务任务' }, { key: 'messages', label: '沟通记录' }, { key: 'audits', label: '操作留痕' }]} />
      {tab === 'tasks' ? <Tasks patientId={Number(id)} compact /> : <DataTable state={history} page={page} setPage={setPage} columns={
        tab === 'records' ? [
          { title: '记录类型', dataIndex: 'record_type', render: value => <Status value={value} /> }, { title: '发生时间', dataIndex: 'occurred_at', render: dateText },
          { title: '记录内容', render: (_, row) => <div className="record-content"><p>{row.content || '指标记录'}</p><Space wrap>{row.systolic != null && <Tag>血压 {row.systolic}/{row.diastolic} mmHg</Tag>}{row.heart_rate != null && <Tag>心率 {row.heart_rate} 次/分</Tag>}{row.weight != null && <Tag>体重 {row.weight} kg</Tag>}{row.glucose != null && <Tag>血糖 {row.glucose} mmol/L</Tag>}</Space>{row.next_visit_date && <p className="muted">原记录复诊日期：{row.next_visit_date}</p>}</div> },
          { title: '来源', render: (_, row) => <><Tag color={row.source_system === 'HOSPITAL_MOCK' ? 'gold' : 'default'}>{row.source_system === 'HOSPITAL_MOCK' ? '模拟医院接口' : row.source_system === 'MANUAL' ? '人工补充' : row.source_system}</Tag><p className="muted">{row.external_id}</p></> },
        ] : tab === 'messages' ? [
          { title: '方向', dataIndex: 'direction', render: value => value === 'PATIENT_TO_STAFF' ? '患者咨询' : '已审核人工联系记录' },
          { title: '内容', dataIndex: 'content', render: value => <div className="pre-wrap">{value}</div> }, { title: '时间', dataIndex: 'gmt_create', render: dateText },
        ] : [{ title: '动作', dataIndex: 'action' }, { title: '操作人编号', dataIndex: 'actor_id' }, { title: '变更后状态', dataIndex: 'after_state', render: value => <Status value={value} /> }, { title: '说明', dataIndex: 'detail' }, { title: '时间', dataIndex: 'gmt_create', render: dateText }]
      } />}</Card>
    <FormDialog title="管理患者档案" open={edit} initialValues={patient} onClose={() => setEdit(false)} onSubmit={async values => { await api('/patients/update', { id: patient.id, version: patient.version, ...values }); refresh() }}>
      <LoadState state={staff}>{data => <StaffFields staff={data} disabled={account.role_code !== 'MANAGER'} />}</LoadState>
      <div className="form-grid"><Form.Item name="lifecycle" label="管理状态"><Select options={options(['ENROLLED', 'MANAGING', 'PAUSED', 'CLOSED'])} /></Form.Item>
        <Form.Item name="risk_level" label="风险分层（责任医生确认）"><Select disabled={account.role_code !== 'DOCTOR'} options={options(['UNKNOWN', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])} /></Form.Item></div>
      <LoadState state={packages}>{data => <Form.Item name="service_package_id" label="服务包"><Select options={data.items.map(item => ({ value: item.id, label: item.title }))} placeholder="选择已发布服务包" /></Form.Item>}</LoadState>
      <Form.Item name="note" label="内部备注"><Input.TextArea rows={3} maxLength={2000} /></Form.Item>
    </FormDialog>
    <FormDialog title="添加门诊 / 出院 / 体检记录" open={recordOpen} initialValues={{ record_type: 'OUTPATIENT', occurred_at: dayjs() }} onClose={() => setRecordOpen(false)}
      onSubmit={async values => { await api('/records/create', { ...values, patient_id: Number(id), occurred_at: values.occurred_at.format('YYYY-MM-DDTHH:mm:ss'), next_visit_date: values.next_visit_date?.format('YYYY-MM-DD') }); refresh() }}>
      <div className="form-grid"><Form.Item name="record_type" label="记录类型" rules={required}><Select options={options(['OUTPATIENT', 'DISCHARGE', 'EXAM'])} /></Form.Item><Form.Item name="occurred_at" label="发生时间" rules={required}><DatePicker showTime style={{ width: '100%' }} /></Form.Item></div>
      <Form.Item name="content" label="核对后的报告摘要 / 个体随访依据" rules={required}><Input.TextArea rows={5} maxLength={10000} showCount placeholder="按原报告核对录入：出院诊断、原医嘱、注意事项、需跟进的问题等。未记载的内容不要推测。" /></Form.Item>
      <div className="form-grid"><Form.Item name="medication_cycle_days" label="原记录用药周期（天）"><InputNumber min={1} max={730} /></Form.Item><Form.Item name="next_visit_date" label="原记录建议复诊日期"><DatePicker /></Form.Item></div>
      <Alert type="info" message="保存后建立次日核对报告的团队待办，不代表临床随访日期；填写原报告复诊日期时建立复诊跟踪任务。随访内容需结合报告和服务 SOP，由医生审核。" />
    </FormDialog>
  </>}</LoadState></>
}
