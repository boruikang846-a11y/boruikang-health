import React, { useState } from 'react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { Alert, Button, Card, DatePicker, Descriptions, Form, Input, InputNumber, Select, Space, Statistic, Switch, Table, Tabs, Tag, Timeline } from 'antd'
import { ArrowRightOutlined, PlusOutlined, ReloadOutlined, TeamOutlined, ScheduleOutlined, AlertOutlined, ClockCircleOutlined, UploadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { api, useLoad } from '../api'
import { countUp, DataTable, dateText, day, dayText, doctorOptions, FormDialog, LoadState, money, names, options, ownerOptions, PageTitle, required, stamp, Status } from '../ui'
import Tasks from './Tasks'
import { InvitationDialog } from './Invitations'
import { AppointmentAction, AppointmentDialog, appointmentActions } from './Appointments'
import { EnrollmentDialog, enrollmentColumns } from './Packages'
import { ReferralAction, ReferralDialog, referralActions } from './Referrals'
import { MessageLogDialog } from './Configuration'
import { ReportReviewDialog, ReportStatus } from './ReportReview'
import FileImportDialog from './FileImportDialog'
import { PatientWechat } from './Wechat'
import { createPatientTemplate, parsePatientFile, patientImportColumns } from './patientImport'
import { fileImportResult } from './fileImport'

const lifecycles = ['ENROLLED', 'CONTACTED', 'BOOKED', 'ARRIVED', 'MANAGING', 'REVISIT_DUE', 'PAUSED', 'TRANSFERRED', 'LOST', 'CLOSED']
const scenes = ['ECG_NETWORK', 'EXAM', 'COMMUNITY_SCREENING', 'PRIMARY_REFERRAL', 'OUTPATIENT', 'INPATIENT', 'DISCHARGE', 'CAMPAIGN', 'MANUAL']
export function Dashboard() {
  const account = useOutletContext()
  const state = useLoad(() => api('/dashboard'))
  const queues = useLoad(() => api('/reports/workbench'))
  const pending = useLoad(() => api('/tasks/query', { page: 0, size: 6, status: 'PENDING' }))
  return <><PageTitle title={account.role_code === 'NURSE' ? '随访工作台' : '运营工作台'} subtitle={account.real_name + '，今天的每一项服务，从这里开始。'}
    extra={<Button icon={<ReloadOutlined />} onClick={() => { state.reload(); pending.reload(); queues.reload() }}>刷新数据</Button>} />
    <LoadState state={state}>{data => <><div className="stats-grid">
      {[
        ['在管患者', data.managing_count, '累计入组 ' + data.patient_count + ' 人', TeamOutlined, 'blue', '/patients'],
        ['待执行任务', data.pending_task_count, '已提交医生审核 ' + data.review_count + ' 项', ScheduleOutlined, 'violet', '/followups'],
        ['待处理异常', data.open_alert_count, '高风险 / 重点关注 ' + data.high_risk_count + ' 人', AlertOutlined, 'orange', '/alerts'],
        ['逾期待办', data.overdue_count, '尚待完成的复诊 ' + data.revisit_count + ' 项', ClockCircleOutlined, 'teal', '/followups?overdue=1'],
      ].map(([label, value, detail, Icon, color, path]) => <Link to={path} key={label}><Card className="metric-card"><div className={'metric-icon ' + color}><Icon /></div><Statistic title={label} value={value} formatter={countUp} /><p>{detail}</p></Card></Link>)}
    </div>
    <Card className="mb" title="今日队列" extra={<span className="muted">按 SLA 与到期时间自动归集</span>}><LoadState state={queues}>{q => <div className="queue-grid">{q.queues.map(item => <Link key={item.code} to={item.route} className={'queue-item' + (item.count > 0 && ['SLA_OVERDUE', 'LOST_CONFIRM'].includes(item.code) ? ' danger' : '')}><span className="queue-count">{item.count}</span><span>{item.name}</span></Link>)}</div>}</LoadState></Card>
    <div className="dashboard-grid"><Card title="近 7 日随访履约" extra={<span className="muted">按到期日期统计</span>}>
      <div className="chart-legend"><span className="legend due" /> 应随访 <span className="legend done" /> 已完成</div>
      <div className="bar-chart">{data.daily.map(item => {
        const maximum = Math.max(1, ...data.daily.map(row => row.due_count))
        return <div className="bar-group" key={item.date}><div className="bar-pair">
          <div className="chart-bar due" style={{ height: Math.max(3, item.due_count / maximum * 140) }}><span>{item.due_count}</span></div>
          <div className="chart-bar done" style={{ height: Math.max(3, item.completed_count / maximum * 140) }}><span>{item.completed_count}</span></div>
        </div><small>{dayjs(item.date).format('MM/DD')}</small></div>
      })}</div></Card><Card className="care-summary" title="把服务真正闭环"><h2>先触达，再到院，<br />后管理</h2><p>患者池判定高危、邀约到院、签约服务包、按方案随访，每一步都有台账和 SLA。</p>
      <Link to="/screening">进入患者池 <ArrowRightOutlined /></Link><div className="summary-foot">数据更新于 {dateText(data.as_of)}</div></Card></div></>}</LoadState>
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
function StaffFields({ staff, clinicians, disabled }) {
  return <div className="form-grid"><Form.Item name="doctor_id" label="责任医生（看报告、审核随访意见）" rules={required}><Select disabled={disabled} options={doctorOptions(clinicians)} /></Form.Item>
    <Form.Item name="owner_id" label="负责人（运营人员或护士）" rules={required}><Select disabled={disabled} options={ownerOptions(staff)} /></Form.Item></div>
}
function ProfileFields({ orgs, clinicians }) {
  return <><div className="form-grid"><Form.Item name="patient_type" label="患者类型"><Select options={options(['OUTPATIENT', 'INPATIENT', 'DISCHARGED', 'UNKNOWN'])} /></Form.Item><Form.Item name="source_scene" label="来源场景"><Select options={options(scenes)} /></Form.Item>
    <Form.Item name="org_id" label="来源机构"><Select allowClear options={(orgs || []).filter(o => o.active).map(o => ({ value: o.id, label: o.name }))} /></Form.Item><Form.Item name="referrer_id" label="转介医生"><Select allowClear options={doctorOptions(clinicians)} /></Form.Item>
    <Form.Item name="id_card" label="证件号"><Input maxLength={18} /></Form.Item><Form.Item name="birth_date" label="出生日期"><DatePicker style={{ width: '100%' }} /></Form.Item>
    <Form.Item name="emergency_contact" label="紧急联系人"><Input maxLength={80} /></Form.Item><Form.Item name="emergency_phone" label="紧急联系电话"><Input maxLength={24} /></Form.Item>
    <Form.Item name="inpatient_no" label="住院号"><Input maxLength={60} /></Form.Item><Form.Item name="bed_no" label="床号"><Input maxLength={20} /></Form.Item></div>
    <Form.Item name="address" label="住址"><Input maxLength={200} /></Form.Item>
    <Form.Item name="tags" label="标签"><Select mode="tags" maxTagCount={10} tokenSeparators={[',', '，']} placeholder="回车添加，例如 重点随访、独居" /></Form.Item></>
}
export function Patients() {
  const account = useOutletContext()
  const navigate = useNavigate()
  const [page, setPage] = useState(0)
  const [filters, setFilters] = useState({})
  const [create, setCreate] = useState(false)
  const [fileImportOpen, setFileImportOpen] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const state = useLoad(() => api('/patients/query', { page, size: 10, ...filters }), [page, JSON.stringify(filters)])
  const staff = useLoad(() => api('/staff'))
  const clinicians = useLoad(() => api('/clinicians'))
  const orgs = useLoad(() => api('/orgs'))
  const filter = (key, value) => { setFilters(previous => ({ ...previous, [key]: value === '' ? undefined : value })); setPage(0) }
  const doctor = account.role_code === 'DOCTOR'
  return <><PageTitle title={doctor ? '我的患者' : '患者中心'} subtitle={doctor ? '您作为责任医生的患者。档案只读，报告与随访意见在左侧对应页面处理。' : '医院提供资料，责任医生负责医学判断，运营人员和护士负责日常随访。'} extra={!doctor && <Space wrap><Button icon={<UploadOutlined />} onClick={() => setFileImportOpen(true)}>文件批量导入</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => setCreate(true)}>新建患者</Button></Space>} />
    {importResult && <Alert className="mb" type="success" showIcon closable onClose={() => setImportResult(null)} message={'批次 ' + importResult.import_batch + '：新增 ' + importResult.created + ' 条，跳过 ' + importResult.skipped + ' 条'} description={importResult.messages.length ? <ul>{importResult.messages.map((message, index) => <li key={index}>{message}</li>)}</ul> : null} />}
    {fileImportOpen && <FileImportDialog title="文件批量导入患者档案" columns={patientImportColumns} parseFile={parsePatientFile} createTemplate={createPatientTemplate} templateName="患者中心导入模板.xlsx"
      description="姓名、年龄、联系电话、科室、病种/管理原因必填。建议填写来源编号或证件号用于跨批次去重；手机号不会合并档案。确认后批量建档，风险待评估。"
      initialValues={{ patient_type: 'UNKNOWN', source_scene: 'MANUAL', outreach: true, owner_id: account.user_id }} onClose={() => setFileImportOpen(false)} onSubmit={async (values, preview, importBatch) => {
        const response = await api('/patients/import', { ...values, import_batch: importBatch, rows: preview.rows })
        setImportResult(fileImportResult(response, preview.entries)); state.reload()
      }}><div className="form-grid">
        <LoadState state={clinicians}>{data => <Form.Item name="doctor_id" label="统一责任医生" rules={required}><Select options={doctorOptions(data)} /></Form.Item>}</LoadState>
        <LoadState state={staff}>{data => <Form.Item name="owner_id" label="统一负责人" rules={required}><Select disabled={account.role_code !== 'MANAGER'} options={ownerOptions(data)} /></Form.Item>}</LoadState>
        <Form.Item name="patient_type" label="患者类型" rules={required}><Select options={options(['OUTPATIENT', 'INPATIENT', 'DISCHARGED', 'UNKNOWN'])} /></Form.Item>
        <Form.Item name="source_scene" label="来源场景" rules={required}><Select options={options(scenes)} /></Form.Item>
        <LoadState state={orgs}>{data => <Form.Item name="org_id" label="来源机构"><Select allowClear options={data.filter(org => org.active).map(org => ({ value: org.id, label: org.name }))} /></Form.Item>}</LoadState>
      </div><Form.Item name="outreach" label="建档后开出首次联系任务（按 SLA 计算截止）" valuePropName="checked"><Switch /></Form.Item>
    </FileImportDialog>}
    <Card><div className="toolbar"><Input.Search placeholder="搜索患者姓名" allowClear onSearch={value => filter('keyword', value)} style={{ width: 200 }} />
      <Select aria-label="风险筛选" placeholder="全部风险" allowClear style={{ width: 130 }} options={options(['UNKNOWN', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])} onChange={value => filter('risk_level', value)} />
      <Select aria-label="阶段" placeholder="全部阶段" allowClear style={{ width: 130 }} options={options(lifecycles)} onChange={value => filter('lifecycle', value)} />
      <Select aria-label="来源场景" placeholder="全部来源" allowClear style={{ width: 140 }} options={options(scenes)} onChange={value => filter('source_scene', value)} />
      {account.role_code === 'MANAGER' && <LoadState state={staff}>{data => <Select aria-label="负责人" placeholder="全部负责人" allowClear style={{ width: 140 }} options={data.map(x => ({ value: x.user_id, label: x.real_name }))} onChange={value => filter('owner_id', value)} />}</LoadState>}
      <Input.Search placeholder="标签" allowClear onSearch={value => filter('tag', value)} style={{ width: 140 }} />
      <Space><Switch onChange={value => filter('overdue', value || undefined)} />有逾期</Space><Space><Switch onChange={value => filter('open_alert', value || undefined)} />有异常</Space>
      <Button icon={<ReloadOutlined />} onClick={state.reload}>刷新</Button></div>
      <DataTable state={state} page={page} setPage={setPage} columns={[
        { title: '患者 / 编号', dataIndex: 'name', render: (value, row) => <Link to={'/patients/' + row.id}><strong>{value}</strong><div className="muted">#{row.id} {row.tags?.map(t => <Tag key={t}>{t}</Tag>)}</div></Link> },
        { title: '性别 / 年龄', render: (_, row) => (names[row.gender] || '未填写') + ' / ' + row.age + ' 岁' },
        { title: '科室 / 病种', dataIndex: 'department', render: (value, row) => <>{value}<div className="muted">{row.disease}</div></> },
        { title: '来源', render: (_, row) => <>{names[row.source_scene] || '—'}<div className="muted">{orgs.data?.find(o => o.id === row.org_id)?.name || ''}</div></> },
        { title: '风险分层', dataIndex: 'risk_level', render: value => <Status value={value} /> },
        { title: '阶段', dataIndex: 'lifecycle', render: (value, row) => <><Status value={value} /><div className="muted">最近联系 {dateText(row.last_contact_at)}</div></> },
        { title: '联系电话', dataIndex: 'phone' },
        { title: '操作', render: (_, row) => <Link to={'/patients/' + row.id}>查看档案</Link> },
      ]} />
    </Card>
    <FormDialog title="新建患者档案" width={760} open={create} initialValues={{ gender: 'UNKNOWN', department: '综合服务', patient_type: 'UNKNOWN', source_scene: 'MANUAL', outreach: true, ...(['OPERATOR', 'NURSE'].includes(account.role_code) ? { owner_id: account.user_id } : {}) }} onClose={() => setCreate(false)}
      onSubmit={async values => { const result = await api('/patients/create', { ...values, birth_date: day(values.birth_date) }); navigate('/patients/' + result.id) }}>
      <div className="form-grid"><Form.Item name="name" label="姓名" rules={required}><Input maxLength={80} /></Form.Item><Form.Item name="phone" label="联系电话" rules={required}><Input maxLength={24} /></Form.Item>
        <Form.Item name="gender" label="性别" rules={required}><Select options={options(['MALE', 'FEMALE', 'UNKNOWN'])} /></Form.Item><Form.Item name="age" label="年龄" rules={required}><InputNumber min={0} max={130} /></Form.Item>
        <Form.Item name="department" label="科室" rules={required}><Input maxLength={80} /></Form.Item><Form.Item name="disease" label="病种 / 管理原因" rules={required}><Input maxLength={120} /></Form.Item></div>
      <LoadState state={staff}>{data => <StaffFields staff={data} clinicians={clinicians.data} />}</LoadState>
      <ProfileFields orgs={orgs.data} clinicians={clinicians.data} />
      <div className="form-grid"><Form.Item name="risk_level" label="医生确认的风险分层"><Select options={options(['UNKNOWN', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])} /></Form.Item><Form.Item name="risk_evidence" label="风险评估依据"><Input maxLength={400} /></Form.Item></div>
      <Form.Item name="outreach" label="建档后开出首次联系任务（按 SLA 计算截止）" valuePropName="checked"><Switch /></Form.Item>
      <Form.Item name="note" label="内部备注"><Input.TextArea rows={2} maxLength={2000} showCount /></Form.Item>
      <Alert type="info" message="人工建档不会按手机号自动关联患者 Web 账号。风险分层需要医生依据。" />
    </FormDialog>
  </>
}
function TimelineTab({ id }) {
  const state = useLoad(() => api('/patients/timeline', { patient_id: Number(id), limit: 200 }), [id])
  const color = { TASK: 'blue', CONTACT: 'orange', INVITATION: 'purple', APPOINTMENT: 'green', RECORD: 'gray', REFERRAL: 'cyan', ENROLLMENT: 'gold', MESSAGE: 'default', MEDICATION: 'lime', AUDIT: 'default', PATIENT: 'blue', CONSENT: 'green', WECHAT: 'green' }
  return <LoadState state={state}>{data => <><Timeline items={data.events.map((e, i) => ({ key: i, color: color[e.kind] || 'gray', children: <div><strong>{e.title}</strong> <Status value={e.status} /><div className="muted">{dateText(e.at)} · {e.kind}</div>{e.detail && <p className="pre-wrap">{e.detail}</p>}</div> }))} />{data.truncated && <p className="muted">仅显示最近 200 条。</p>}</>}</LoadState>
}
export function PatientDetail() {
  const { id } = useParams()
  const account = useOutletContext()
  const [edit, setEdit] = useState(false)
  const [consent, setConsent] = useState(false)
  const [recordOpen, setRecordOpen] = useState(false)
  const [observe, setObserve] = useState(false)
  const [invite, setInvite] = useState(false)
  const [book, setBook] = useState(false)
  const [enroll, setEnroll] = useState(false)
  const [refer, setRefer] = useState(false)
  const [medication, setMedication] = useState(null)
  const [message, setMessage] = useState(false)
  const [action, setAction] = useState(null)
  const [tab, setTab] = useState('timeline')
  const [page, setPage] = useState(0)
  const [revision, setRevision] = useState(0)
  const [report, setReport] = useState(null)
  const doctor = account.role_code === 'DOCTOR'
  const state = useLoad(() => api('/patients/' + id), [id, revision])
  const staff = useLoad(() => api('/staff'))
  const clinicians = useLoad(() => api('/clinicians'))
  const orgs = useLoad(() => api('/orgs'))
  const listTabs = { records: '/records/query', messages: '/messages/query', audits: '/audits/query', invitations: '/invitations/query', appointments: '/appointments/query', enrollments: '/enrollments/query', referrals: '/referrals/query', 'message-logs': '/message-logs/query' }
  const history = useLoad(() => listTabs[tab] ? api(listTabs[tab], { page, size: 10, patient_id: Number(id) }) : tab === 'medications' ? api('/medications/query', { patient_id: Number(id) }).then(items => ({ items, total_size: items.length })) : Promise.resolve(null), [id, page, tab, revision])
  const refresh = () => setRevision(value => value + 1)
  return <><Link to="/patients" className="back-link">{doctor ? '返回我的患者' : '返回患者中心'}</Link><LoadState state={state}>{patient => <>
    <PageTitle title={patient.name + ' 的健康档案'} subtitle={patient.department + ' / ' + patient.disease} extra={!doctor && <Space wrap><Button onClick={() => setEdit(true)}>管理档案</Button><Button onClick={() => setConsent(true)}>登记知情同意</Button><Button onClick={() => setInvite(true)}>记录邀约</Button><Button onClick={() => setBook(true)}>登记预约</Button><Button onClick={() => setEnroll(true)}>签约服务包</Button><Button onClick={() => setRefer(true)}>发起转诊</Button><Button onClick={() => setMessage(true)}>登记已发消息</Button><Button onClick={() => setObserve(true)}>代录指标</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => setRecordOpen(true)}>添加就诊记录</Button></Space>} />
    <Card className="mb"><Descriptions column={{ xs: 1, sm: 2, lg: 4 }} items={[
      { key: 'id', label: '档案编号', children: '#' + patient.id }, { key: 'age', label: '性别 / 年龄', children: (names[patient.gender] || '未填写') + ' / ' + patient.age + ' 岁' + (patient.birth_date ? ' / ' + patient.birth_date : '') },
      { key: 'phone', label: '联系电话', children: patient.phone }, { key: 'risk', label: '风险分层', children: <Status value={patient.risk_level} /> },
      { key: 'status', label: '阶段', children: <><Status value={patient.lifecycle} />{patient.lost_since && <span className="muted"> 失访自 {dayText(patient.lost_since)}</span>}</> },
      { key: 'doctor', label: '责任医生', children: clinicians.data?.find(x => x.id === patient.doctor_id)?.name || '待关联' },
      { key: 'owner', label: '负责人', children: (x => x ? x.real_name + ' / ' + names[x.role_code] : '待分配')(staff.data?.find(x => x.user_id === patient.owner_id)) },
      { key: 'join', label: '入组时间', children: dateText(patient.gmt_create) },
      { key: 'scene', label: '来源', children: (names[patient.source_scene] || '—') + ' / ' + (orgs.data?.find(o => o.id === patient.org_id)?.name || '—') + (patient.referrer_id ? ' / 转介 ' + (clinicians.data?.find(x => x.id === patient.referrer_id)?.name || '') : '') },
      { key: 'type', label: '患者类型', children: (names[patient.patient_type] || '—') + (patient.inpatient_no ? ' / 住院号 ' + patient.inpatient_no + (patient.bed_no ? ' 床 ' + patient.bed_no : '') : '') },
      { key: 'contact', label: '最近联系', children: dateText(patient.last_contact_at) },
      { key: 'consent', label: '知情同意', children: patient.consent_at ? dateText(patient.consent_at) + ' / ' + (patient.consent_version || '') : <Tag color="gold">未登记</Tag> },
      { key: 'emergency', label: '紧急联系人', children: patient.emergency_contact ? patient.emergency_contact + ' ' + (patient.emergency_phone || '') : '—' },
      { key: 'idcard', label: '证件号', children: patient.id_card || '—' }, { key: 'address', label: '住址', children: patient.address || '—' },
      { key: 'source', label: '数据来源', children: patient.source_system === 'HOSPITAL_MOCK' ? <Tag color="gold">模拟医院接口 {patient.hospital_patient_id}</Tag> : patient.source_system === 'FILE_IMPORT' ? '文件导入' : '人工录入' },
      { key: 'tags', label: '标签', children: patient.tags?.length ? patient.tags.map(t => <Tag key={t}>{t}</Tag>) : '—', span: 2 },
      { key: 'note', label: '内部备注', children: patient.note || '暂无', span: 2 },
    ]} /></Card>
    <Card><Tabs activeKey={tab} onChange={value => { setTab(value); setPage(0) }} items={[{ key: 'timeline', label: '时间轴' }, { key: 'records', label: '就诊与健康记录' }, { key: 'tasks', label: '服务任务' }, { key: 'invitations', label: '邀约' }, { key: 'appointments', label: '预约到诊' }, { key: 'enrollments', label: '服务实例' }, { key: 'medications', label: '用药' }, { key: 'referrals', label: '转诊' }, { key: 'message-logs', label: '已发消息' }, { key: 'wecom', label: '企业微信' }, { key: 'official-account', label: '公众号' }, { key: 'messages', label: '沟通记录' }, { key: 'audits', label: '操作留痕' }]} />
      {tab === 'timeline' ? <TimelineTab id={id} key={revision} /> : tab === 'tasks' ? <Tasks patientId={Number(id)} compact /> : tab === 'wecom' || tab === 'official-account' ? <PatientWechat key={tab} patientId={Number(id)} provider={tab === 'wecom' ? 'WE_COM' : 'WECHAT_OFFICIAL'} readOnly={doctor} /> : <>{tab === 'medications' && !doctor && <div className="toolbar"><Button icon={<PlusOutlined />} onClick={() => setMedication({ status: 'ACTIVE', source: 'HOSPITAL_RECORD', adherence: 'UNKNOWN' })}>登记用药</Button></div>}
      <DataTable state={history} page={page} setPage={setPage} columns={
        tab === 'records' ? [
          { title: '记录类型', dataIndex: 'record_type', render: value => <Status value={value} /> }, { title: '发生时间', dataIndex: 'occurred_at', render: dateText },
          { title: '记录内容', render: (_, row) => <div className="record-content"><p>{row.content || '指标记录'}</p><Space wrap>{row.systolic != null && <Tag>血压 {row.systolic}/{row.diastolic} mmHg</Tag>}{row.heart_rate != null && <Tag>心率 {row.heart_rate} 次/分</Tag>}{row.weight != null && <Tag>体重 {row.weight} kg</Tag>}{row.glucose != null && <Tag>血糖 {row.glucose} mmol/L</Tag>}</Space>{row.next_visit_date && <p className="muted">原记录复诊日期：{row.next_visit_date}</p>}</div> },
          { title: '来源', render: (_, row) => <><Tag color={row.source_system === 'HOSPITAL_MOCK' ? 'gold' : 'default'}>{row.source_system === 'HOSPITAL_MOCK' ? '模拟医院接口' : row.source_system === 'MANUAL' ? '人工补充' : names[row.source_system] || row.source_system}</Tag><p className="muted">{row.external_id}</p></> },
          { title: '医生查看', render: (_, row) => <><ReportStatus record={row} doctorName={clinicians.data?.find(x => x.id === row.doctor_viewer_id)?.name} />{doctor && row.record_type !== 'OBSERVATION' && <Button type="link" onClick={() => setReport({ ...row, patient_name: patient.name })}>{row.doctor_viewed_at ? '更新意见' : '确认已阅'}</Button>}</> },
        ] : tab === 'messages' ? [
          { title: '方向', dataIndex: 'direction', render: value => value === 'PATIENT_TO_STAFF' ? '患者咨询' : '已审核人工联系记录' },
          { title: '内容', dataIndex: 'content', render: value => <div className="pre-wrap">{value}</div> }, { title: '时间', dataIndex: 'gmt_create', render: dateText },
        ] : tab === 'invitations' ? [
          { title: '轮次', dataIndex: 'round' }, { title: '时间 / 方式', render: (_, row) => dateText(row.invited_at) + ' / ' + names[row.method] },
          { title: '结果', render: (_, row) => <><Status value={row.result} />{row.planned_visit_mode && <div className="muted">{names[row.planned_visit_mode]}</div>}</> },
          { title: '摘要', dataIndex: 'summary', render: (value, row) => <>{value}{row.next_invite_at && <div className="muted">下次：{dateText(row.next_invite_at)}</div>}<div className="muted">凭证：{row.evidence}</div></> },
        ] : tab === 'appointments' ? [
          { title: '预约', render: (_, row) => <><strong>{dateText(row.appointment_at)}</strong><div className="muted">{names[row.appointment_type]} / {row.department} / {names[row.channel]}</div></> },
          { title: '状态', render: (_, row) => <><Status value={row.status} />{row.no_show_reason && <div className="muted">{names[row.no_show_reason]}</div>}{row.outcome && <div className="muted">{names[row.outcome]}{row.effective === false ? ' / 非有效到诊' : ''}</div>}</> },
          ...(doctor ? [] : [{ title: '操作', render: (_, row) => <Space wrap>{appointmentActions(row, setAction)}</Space> }]),
        ] : tab === 'enrollments' ? enrollmentColumns(false, refresh).filter(column => !doctor || column.title !== '操作')
        : tab === 'medications' ? [
          { title: '药品', dataIndex: 'drug_name', render: (value, row) => <><strong>{value}</strong><div className="muted">{row.dosage} {row.frequency}</div></> },
          { title: '起止', render: (_, row) => dayText(row.start_date) + ' 至 ' + (row.end_date ? dayText(row.end_date) : '至今') },
          { title: '状态 / 依从', render: (_, row) => <><Status value={row.status} /> <Status value={row.adherence} /><div className="muted">{names[row.source]}</div></> },
          { title: '备注', dataIndex: 'note' }, ...(doctor ? [] : [{ title: '操作', render: (_, row) => <Button type="link" onClick={() => setMedication({ ...row, start_date: row.start_date ? dayjs(row.start_date) : null, end_date: row.end_date ? dayjs(row.end_date) : null })}>更新</Button> }]),
        ] : tab === 'referrals' ? [
          { title: '转诊', render: (_, row) => <><Tag>{names[row.direction]} / {names[row.referral_type]}</Tag><div className="muted">{orgs.data?.find(o => o.id === row.from_org_id)?.name || '—'} → {orgs.data?.find(o => o.id === row.to_org_id)?.name || '—'}</div></> },
          { title: '原因', dataIndex: 'reason', render: (value, row) => <>{value}<div className="muted">{dateText(row.initiated_at)}</div></> },
          { title: '状态', render: (_, row) => <><Status value={row.status} />{row.overdue && <Tag color="red">超 SLA</Tag>}{row.feedback_diagnosis && <div className="muted">{row.feedback_diagnosis} / {row.feedback_disposition}</div>}</> },
          ...(doctor ? [] : [{ title: '操作', render: (_, row) => <Space wrap>{referralActions(row, r => setAction({ ...r, kind: 'referral' }))}</Space> }]),
        ] : tab === 'message-logs' ? [
          { title: '渠道', dataIndex: 'channel', render: value => names[value] }, { title: '模板', dataIndex: 'template_code' }, { title: '内容', dataIndex: 'content', render: value => <div className="pre-wrap">{value}</div> }, { title: '发送时间', dataIndex: 'sent_at', render: dateText }, { title: '凭证', dataIndex: 'evidence' },
        ] : [{ title: '动作', dataIndex: 'action' }, { title: '操作人编号', dataIndex: 'actor_id' }, { title: '变更后状态', dataIndex: 'after_state', render: value => <Status value={value} /> }, { title: '说明', dataIndex: 'detail' }, { title: '时间', dataIndex: 'gmt_create', render: dateText }]
      } /></>}</Card>
    <FormDialog title="管理患者档案" width={760} open={edit} initialValues={{ ...patient, birth_date: patient.birth_date ? dayjs(patient.birth_date) : null }} onClose={() => setEdit(false)} onSubmit={async values => { await api('/patients/update', { id: patient.id, version: patient.version, ...values, birth_date: day(values.birth_date) }); refresh() }}>
      <LoadState state={staff}>{data => <StaffFields staff={data} clinicians={clinicians.data} disabled={account.role_code !== 'MANAGER'} />}</LoadState>
      <div className="form-grid"><Form.Item name="name" label="姓名"><Input maxLength={80} /></Form.Item><Form.Item name="phone" label="联系电话"><Input maxLength={24} /></Form.Item><Form.Item name="department" label="科室"><Input maxLength={80} /></Form.Item><Form.Item name="disease" label="病种"><Input maxLength={120} /></Form.Item>
        <Form.Item name="lifecycle" label="阶段"><Select options={options(lifecycles)} /></Form.Item><Form.Item name="lifecycle_reason" label="暂停 / 转出 / 失访 / 结案原因"><Input maxLength={400} /></Form.Item>
        <Form.Item name="risk_level" label="医生确认的风险分层"><Select options={options(['UNKNOWN', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])} /></Form.Item><Form.Item name="risk_evidence" label="风险变更时的院方评估依据"><Input maxLength={400} /></Form.Item></div>
      <ProfileFields orgs={orgs.data} clinicians={clinicians.data} />
      <Form.Item name="note" label="内部备注"><Input.TextArea rows={3} maxLength={2000} /></Form.Item>
    </FormDialog>
    <FormDialog title="登记知情同意" open={consent} initialValues={{ consent_at: dayjs(), consent_version: 'HEALTH-MVP-1' }} onClose={() => setConsent(false)} onSubmit={async values => { await api('/patients/consent', { id: patient.id, version: patient.version, ...values, consent_at: stamp(values.consent_at) }); refresh() }}>
      <div className="form-grid"><Form.Item name="consent_at" label="同意时间" rules={required}><DatePicker showTime style={{ width: '100%' }} /></Form.Item><Form.Item name="consent_version" label="同意书版本" rules={required}><Input maxLength={20} /></Form.Item></div>
      <Form.Item name="consent_evidence" label="凭证" rules={required}><Input maxLength={400} placeholder="签字文件编号、录音编号或扫描件位置" /></Form.Item>
    </FormDialog>
    <FormDialog title="添加门诊 / 出院 / 体检记录" open={recordOpen} initialValues={{ record_type: 'OUTPATIENT', occurred_at: dayjs() }} onClose={() => setRecordOpen(false)}
      onSubmit={async values => { await api('/records/create', { ...values, patient_id: Number(id), occurred_at: stamp(values.occurred_at), next_visit_date: day(values.next_visit_date) }); refresh() }}>
      <div className="form-grid"><Form.Item name="record_type" label="记录类型" rules={required}><Select options={options(['OUTPATIENT', 'DISCHARGE', 'EXAM'])} /></Form.Item><Form.Item name="occurred_at" label="发生时间" rules={required}><DatePicker showTime style={{ width: '100%' }} /></Form.Item></div>
      <Form.Item name="content" label="核对后的报告摘要 / 个体随访依据" rules={required}><Input.TextArea rows={5} maxLength={10000} showCount placeholder="按原报告核对录入：出院诊断、原医嘱、注意事项、需跟进的问题等。未记载的内容不要推测。" /></Form.Item>
      <div className="form-grid"><Form.Item name="medication_cycle_days" label="原记录用药周期（天）"><InputNumber min={1} max={730} /></Form.Item><Form.Item name="next_visit_date" label="原记录建议复诊日期"><DatePicker /></Form.Item></div>
      <Alert type="info" message="保存后建立次日核对报告的团队待办，不代表临床随访日期；填写原报告复诊日期时建立复诊跟踪任务。随访内容依据原报告补充，由医生审核。" />
    </FormDialog>
    <FormDialog title="代患者登记指标" open={observe} initialValues={{ occurred_at: dayjs(), source: 'PHONE' }} onClose={() => setObserve(false)} onSubmit={async values => { await api('/records/observation', { ...values, patient_id: Number(id), occurred_at: stamp(values.occurred_at) }); refresh() }}>
      <div className="form-grid"><Form.Item name="occurred_at" label="测量时间" rules={required}><DatePicker showTime style={{ width: '100%' }} /></Form.Item><Form.Item name="source" label="来源" rules={required}><Select options={options(['PHONE', 'DEVICE', 'HOME_VISIT', 'HOSPITAL'])} /></Form.Item>
        <Form.Item name="systolic" label="收缩压"><InputNumber min={30} max={300} /></Form.Item><Form.Item name="diastolic" label="舒张压"><InputNumber min={20} max={200} /></Form.Item><Form.Item name="heart_rate" label="心率"><InputNumber min={20} max={300} /></Form.Item><Form.Item name="weight" label="体重 kg"><InputNumber min={1} max={500} /></Form.Item><Form.Item name="glucose" label="血糖 mmol/L"><InputNumber min={0.1} max={60} step={0.1} /></Form.Item></div>
      <Form.Item name="content" label="患者描述"><Input.TextArea rows={2} maxLength={2000} /></Form.Item>
      <Form.Item name="needs_contact" label="指标异常，需要医生判断（生成异常任务）" valuePropName="checked"><Switch /></Form.Item>
    </FormDialog>
    <FormDialog title={medication?.id ? '更新用药' : '登记用药'} open={Boolean(medication)} initialValues={medication} onClose={() => setMedication(null)} onSubmit={async values => { await api('/medications/save', { ...values, id: medication.id, version: medication.version, patient_id: Number(id), start_date: day(values.start_date), end_date: day(values.end_date) }); refresh() }}>
      <div className="form-grid"><Form.Item name="drug_name" label="药品" rules={required}><Input maxLength={120} /></Form.Item><Form.Item name="dosage" label="剂量"><Input maxLength={80} /></Form.Item><Form.Item name="frequency" label="频次"><Input maxLength={80} /></Form.Item>
        <Form.Item name="source" label="来源" rules={required}><Select options={options(['HOSPITAL_RECORD', 'PATIENT_REPORT', 'STAFF'])} /></Form.Item><Form.Item name="start_date" label="开始"><DatePicker style={{ width: '100%' }} /></Form.Item><Form.Item name="end_date" label="停药"><DatePicker style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="status" label="状态"><Select options={options(['ACTIVE', 'STOPPED'])} /></Form.Item><Form.Item name="adherence" label="依从性"><Select options={options(['GOOD', 'PARTIAL', 'POOR', 'UNKNOWN'])} /></Form.Item></div>
      <Form.Item name="note" label="备注"><Input.TextArea rows={2} maxLength={1000} /></Form.Item>
      <Alert type="info" message="只记录院方医嘱或患者自述，不给出任何用药建议；依从性问题请升级医生。" />
    </FormDialog>
    <InvitationDialog open={invite} patientId={patient.id} onClose={() => setInvite(false)} onSaved={refresh} />
    <AppointmentDialog open={book} patientId={patient.id} onClose={() => setBook(false)} onSaved={refresh} />
    <EnrollmentDialog open={enroll} patientId={patient.id} onClose={() => setEnroll(false)} onSaved={refresh} />
    <ReferralDialog open={refer} patientId={patient.id} onClose={() => setRefer(false)} onSaved={refresh} />
    <MessageLogDialog open={message} patientId={patient.id} onClose={() => setMessage(false)} onSaved={refresh} />
    <ReportReviewDialog record={report} onClose={() => setReport(null)} onSaved={refresh} />
    <AppointmentAction row={action?.kind === 'referral' ? null : action} onClose={() => setAction(null)} onSaved={refresh} />
    <ReferralAction row={action?.kind === 'referral' ? action : null} onClose={() => setAction(null)} onSaved={refresh} />
  </>}</LoadState></>
}
