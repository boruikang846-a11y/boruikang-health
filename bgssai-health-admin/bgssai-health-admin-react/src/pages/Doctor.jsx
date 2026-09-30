import React, { useState } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router-dom'
import { Button, Card, Segmented, Select, Space, Statistic, Tag } from 'antd'
import { ArrowRightOutlined, AlertOutlined, AuditOutlined, FileSearchOutlined, InboxOutlined, ReloadOutlined } from '@ant-design/icons'
import { api, useLoad } from '../api'
import { DataTable, dateText, LoadState, names, options, PageTitle } from '../ui'
import { TaskDrawer, taskColumns } from './Tasks'
import { ReportReviewDialog } from './ReportReview'

const reportColumns = open => [
  { title: '患者', dataIndex: 'patient_name', render: (value, row) => <><Link to={'/patients/' + row.patient_id}>{value}</Link><div className="muted">{row.department} / {row.disease}</div></> },
  { title: '报告', render: (_, row) => <><Tag>{names[row.record_type]}</Tag><div className="report-snippet">{row.content}</div></> },
  { title: '报告时间', dataIndex: 'occurred_at', render: dateText },
  { title: '状态', render: (_, row) => row.doctor_viewed_at ? <><Tag color="green">已阅</Tag><div className="muted">{dateText(row.doctor_viewed_at)}</div>{row.doctor_opinion && <div className="muted">有意见</div>}</> : <Tag color="gold">待阅</Tag> },
  { title: '操作', render: (_, row) => <Button type="link" onClick={() => open(row)}>{row.doctor_viewed_at ? '查看' : '查看报告'}</Button> },
]

export function DoctorHome() {
  const account = useOutletContext()
  const [task, setTask] = useState(null)
  const [report, setReport] = useState(null)
  const counts = useLoad(() => api('/doctor/workbench'))
  const reviews = useLoad(() => api('/tasks/query', { page: 0, size: 5, status: 'PENDING_REVIEW' }))
  const reports = useLoad(() => api('/records/reports', { page: 0, size: 5, viewed: false }))
  const alerts = useLoad(() => api('/tasks/query', { page: 0, size: 5, task_type: 'ALERT', status: 'ESCALATED' }))
  const reload = () => { counts.reload(); reviews.reload(); reports.reload(); alerts.reload() }
  return <><PageTitle title="医生工作台" subtitle={account.real_name + '，这里是您负责患者的待办：看报告、审核随访意见、查收结果、处置异常。'} extra={<Button icon={<ReloadOutlined />} onClick={reload}>刷新</Button>} />
    <LoadState state={counts}>{data => <div className="stats-grid">
      {[
        ['待审核随访意见', data.pending_review_count, '团队起草后提交给您', AuditOutlined, 'violet', '/doctor/reviews'],
        ['待阅报告', data.unread_report_count, '出院、门诊、体检报告', FileSearchOutlined, 'blue', '/doctor/reports'],
        ['待查收随访结果', data.pending_result_count, '已联系患者的随访记录', InboxOutlined, 'teal', '/doctor/results'],
        ['待处置异常', data.escalated_alert_count, '负责患者 ' + data.patient_count + ' 人 / 高风险 ' + data.high_risk_count + ' 人', AlertOutlined, 'orange', '/doctor/alerts'],
      ].map(([label, value, detail, Icon, color, path]) => <Link to={path} key={label}><Card className="metric-card"><div className={'metric-icon ' + color}><Icon /></div><Statistic title={label} value={value} /><p>{detail}</p></Card></Link>)}
    </div>}</LoadState>
    <Card className="mb" title="待审核随访意见" extra={<Link to="/doctor/reviews">全部 <ArrowRightOutlined /></Link>}><DataTable state={reviews} page={0} size={5} setPage={() => {}} columns={taskColumns(setTask)} /></Card>
    <Card className="mb" title="待阅报告" extra={<Link to="/doctor/reports">全部 <ArrowRightOutlined /></Link>}><DataTable state={reports} page={0} size={5} setPage={() => {}} columns={reportColumns(setReport)} /></Card>
    <Card title="待处置异常" extra={<Link to="/doctor/alerts">全部 <ArrowRightOutlined /></Link>}><DataTable state={alerts} page={0} size={5} setPage={() => {}} columns={taskColumns(setTask)} /></Card>
    <TaskDrawer id={task} onClose={() => setTask(null)} onChanged={reload} />
    <ReportReviewDialog record={report} onClose={() => setReport(null)} onSaved={reload} />
  </>
}

const queues = {
  reviews: { title: '随访意见审核', subtitle: '团队依据原报告起草的随访意见，经您审核通过后才会用于联系患者。', filters: [['PENDING_REVIEW', '待审核'], ['APPROVED', '已通过'], ['REJECTED', '已退回']], query: f => ({ status: f }) },
  results: { title: '随访结果查收', subtitle: '团队按审核通过的正文联系患者后，把随访记录交给您查收并反馈。', filters: [['PENDING', '待查收'], ['ACKNOWLEDGED', '已查收']], query: f => ({ task_type: 'FOLLOWUP', status: 'COMPLETED', handover_status: f }) },
  alerts: { title: '异常处置', subtitle: '团队核实后升级给您的异常，记录处置去向与结果后关闭。', filters: [['ESCALATED', '待处置'], ['COMPLETED', '已处置']], query: f => ({ task_type: 'ALERT', status: f }) },
}
export function DoctorTasks({ mode }) {
  const config = queues[mode]
  const [search, setSearch] = useSearchParams()
  const [filter, setFilter] = useState(config.filters[0][0])
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState(Number(search.get('task')) || null)
  const state = useLoad(() => api('/tasks/query', { page, size: 10, ...config.query(filter) }), [mode, filter, page])
  function close() { setSelected(null); if (search.has('task')) { search.delete('task'); setSearch(search, { replace: true }) } }
  return <><PageTitle title={config.title} subtitle={config.subtitle} />
    <Card><div className="toolbar"><Segmented value={filter} onChange={value => { setFilter(value); setPage(0) }} options={config.filters.map(([value, label]) => ({ value, label }))} /><Button icon={<ReloadOutlined />} onClick={state.reload}>刷新</Button></div>
      <DataTable state={state} page={page} setPage={setPage} columns={taskColumns(setSelected)} /></Card>
    <TaskDrawer id={selected} onClose={close} onChanged={state.reload} />
  </>
}

export function DoctorReports() {
  const [viewed, setViewed] = useState('UNREAD')
  const [type, setType] = useState(undefined)
  const [page, setPage] = useState(0)
  const [report, setReport] = useState(null)
  const state = useLoad(() => api('/records/reports', { page, size: 10, viewed: viewed === 'ALL' ? undefined : viewed === 'READ', record_type: type }), [viewed, type, page])
  return <><PageTitle title="患者报告" subtitle="您负责患者的出院、门诊、体检报告。确认已阅时可写意见，团队起草随访意见时会看到。" />
    <Card><div className="toolbar"><Segmented value={viewed} onChange={value => { setViewed(value); setPage(0) }} options={[{ value: 'UNREAD', label: '待阅' }, { value: 'READ', label: '已阅' }, { value: 'ALL', label: '全部' }]} />
      <Select aria-label="报告类型" value={type} allowClear placeholder="全部类型" style={{ width: 140 }} options={options(['DISCHARGE', 'OUTPATIENT', 'EXAM'])} onChange={value => { setType(value); setPage(0) }} />
      <Space><Button icon={<ReloadOutlined />} onClick={state.reload}>刷新</Button></Space></div>
      <DataTable state={state} page={page} setPage={setPage} columns={reportColumns(setReport)} /></Card>
    <ReportReviewDialog record={report} onClose={() => setReport(null)} onSaved={state.reload} />
  </>
}
