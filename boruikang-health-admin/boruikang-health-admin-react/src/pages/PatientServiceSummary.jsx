import React, { useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { Alert, Card, Empty, Select, Space, Table, Tag } from 'antd'
import { api, useLoad } from '../api'
import { LoadState, dateText, names, Status } from '../ui'
import { ContinuousCare, PatientFeedback } from './ContinuousCare'
const metrics = { heart_rate: ['心率', '次/分'], systolic: ['收缩压', 'mmHg'], diastolic: ['舒张压', 'mmHg'], weight: ['体重', 'kg'], glucose: ['血糖', 'mmol/L'] }
function Observations({ rows }) {
  const [metric, setMetric] = useState('heart_rate')
  const data = [...rows].reverse(), points = data.filter(r => r[metric] != null && Number.isFinite(Number(r[metric])) && Number.isFinite(Date.parse(r.occurred_at)))
  const values = points.map(r => Number(r[metric])), low = Math.min(...values), high = Math.max(...values)
  const times = points.map(r => Date.parse(r.occurred_at)), first = Math.min(...times), last = Math.max(...times)
  const x = r => 35 + (Date.parse(r.occurred_at) - first) / (last - first || 1) * 530, y = r => 140 - (Number(r[metric]) - low) / (high - low || 1) * 95
  return <Card title="个人指标趋势" className="mb" extra={<Select aria-label="趋势指标" value={metric} onChange={setMetric} options={Object.entries(metrics).map(([value, [label]]) => ({ value, label }))} />}>
    {points.length ? <svg className="continuity-chart" viewBox="0 0 600 190" role="img" aria-label={`${metrics[metric][0]}趋势，${points.length}条有效记录`}><line x1="30" y1="155" x2="580" y2="155" stroke="#ccd9d4" /><polyline fill="none" stroke="#087b60" strokeWidth="2" points={points.map(r => `${x(r)},${y(r)}`).join(' ')} />{points.map(r => <g key={r.id}><circle cx={x(r)} cy={y(r)} r="4" fill="#087b60"><title>{dateText(r.occurred_at)}：{r[metric]} {metrics[metric][1]}</title></circle><text x={x(r)} y={y(r)-9} textAnchor="middle" fontSize="11">{r[metric]}</text></g>)}<text x="30" y="177" fontSize="11">{dateText(points[0].occurred_at)}</text><text x="575" y="177" textAnchor="end" fontSize="11">{dateText(points.at(-1).occurred_at)}</text></svg> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无该项指标记录" />}
    <p className="muted">最近 30 次指标记录；仅连接有值的采样点，中间缺测仍属未知。单位：{metrics[metric][1]}。趋势用于医生复核。</p>
    <Table rowKey="id" size="small" dataSource={rows} pagination={{ pageSize: 5 }} scroll={{ x: 550 }} columns={[{ title: '记录时间', dataIndex: 'occurred_at', render: dateText }, { title: '血压', render: (_, r) => r.systolic == null ? '未记录' : `${r.systolic}/${r.diastolic} mmHg` }, { title: '心率', dataIndex: 'heart_rate', render: v => v == null ? '未记录' : v + ' 次/分' }, { title: '来源', dataIndex: 'source', render: v => names[v] || v }]} />
  </Card>
}
export default function PatientServiceSummary({ patientId }) {
  const account = useOutletContext(), doctor = account.role_code === 'DOCTOR'
  const state = useLoad(() => api('/continuity/summary', { patient_id: Number(patientId) }), [patientId])
  const path = step => `/after-care?step=${step}&patient=${patientId}`
  return <LoadState state={state}>{data => <div className="service-summary">
    <div className="continuity-summary"><div><small>服务负责人</small><b>{data.owner_name || '待分派'}</b></div><div><small>责任医生</small><b>{data.doctor_name || '待分派'}</b></div><div><small>待办任务</small><b>{data.open_task_count}</b></div><div><small>未闭环问题</small><b>{data.open_issue_count}</b></div></div>
    <Card title="最近报告与医生意见" className="mb">{data.latest_report ? <><Space><Tag>{names[data.latest_report.type]}</Tag><span>{dateText(data.latest_report.occurred_at)}</span><Tag color={data.latest_report.reviewed ? 'green' : 'gold'}>{data.latest_report.reviewed ? '当前责任医生已阅' : '等待当前责任医生核对'}</Tag></Space><p>{data.latest_report.doctor_opinion || '暂无当前责任医生意见'}</p><p className="muted">来源：{data.latest_report.source === 'HOSPITAL_MOCK' ? '虚构医院 Mock' : names[data.latest_report.source] || data.latest_report.source}</p></> : <p>尚无就诊报告</p>}<Link to={path('patients') + '&tab=records'}>查看报告与健康记录 →</Link></Card>
    <ContinuousCare patientId={patientId} plans={data.plans} journeys={data.journeys} authorized={data.authorized} onChange={state.reload} />
    <div className="continuity-columns"><Card title={`下一步待办（共 ${data.open_task_count} 项）`}><p className="muted">最近到期的 10 项</p>{data.tasks.map(t => <article key={t.id}><Tag>{t.priority}</Tag><b>{t.title}</b><p><Status value={t.status} /> · {dateText(t.due_at)} · 负责人 #{t.owner_id}</p><Link to={doctor ? '/journeys?patient=' + patientId : path(t.type === 'ALERT' ? 'alerts' : 'followups') + '&task=' + t.id}>进入办理</Link></article>)}{!data.tasks.length && <p>暂无待办任务</p>}</Card>
    <Card title={`未解决问题（共 ${data.open_issue_count} 项）`}><p className="muted">最近到期的 10 项</p>{data.issues.map(i => <article key={i.id}><Tag>{({ CLINICAL: '临床问题', SERVICE: '服务问题', COMPLAINT: '投诉' })[i.kind]}</Tag><p>{i.summary}</p><Link to={'/journeys/' + i.journey_id}>查看处理进度 →</Link></article>)}{!data.issues.length && <p>暂无未闭环问题</p>}</Card></div>
    <PatientFeedback patientId={patientId} authorized={data.authorized} />
    <Observations rows={data.observations} />
    <Card title="历次就医服务" className="mb"><p className="muted">最近 20 次旅程；长期计划可继续关联后续就医。</p><Space wrap>{data.journeys.map(j => <Link key={j.id} to={'/journeys/' + j.id}><Tag>{names[j.kind]} #{j.id} · {j.status} · {dateText(j.event_at)}</Tag></Link>)}</Space><p><Link to={'/journeys?patient=' + patientId}>查看全部 / 建立新旅程 →</Link></p></Card>
    <Card title="预约与到院记录"><Alert type="info" showIcon message="到院时间及凭证是团队登记的核实记录；医院数据自动核验尚待接口接入。" /><Table rowKey="id" size="small" dataSource={data.appointments} pagination={false} columns={[{ title: '类型', dataIndex: 'type', render: v => names[v] }, { title: '预约时间', dataIndex: 'appointment_at', render: dateText }, { title: '状态', dataIndex: 'status', render: v => <Status value={v} /> }, { title: '到院时间', dataIndex: 'arrived_at', render: dateText }, { title: '登记凭证', dataIndex: 'evidence' }]} /><Link to={path('revisits')}>办理复诊预约与核验 →</Link></Card>
  </div>}</LoadState>
}
