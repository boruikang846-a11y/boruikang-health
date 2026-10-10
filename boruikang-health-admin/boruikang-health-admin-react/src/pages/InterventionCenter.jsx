import React, { useState } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router-dom'
import { Alert, App, Button, DatePicker, Drawer, Form, Input, Select, Space, Table } from 'antd'
import { SearchOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { api, useLoad } from '../api'
import { dateText, FormDialog, LoadState, required } from '../ui'
import { centers, phases, workStatuses, workActions, availableActions } from '../interventionConfig'
import '../intervention.css'

const opts = object => Object.entries(object).map(([value, item]) => ({ value, label: item.title || item }))
const overdue = work => !['RESOLVED', 'CLOSED'].includes(work.status) && dayjs(work.due_at).isBefore(dayjs())
const Badge = ({ work }) => <span className={'ic-status ' + work.status.toLowerCase()}>{workStatuses[work.status]}</span>
function ReportSelect() {
  const patient = Form.useWatch('patient_id')
  const reports = useLoad(() => patient ? api('/records/query', { patient_id: patient, page: 0, size: 100 }) : Promise.resolve({ items: [] }), [patient])
  return <Form.Item label="关联原报告（临床内容必选）" name="record_id"><Select loading={reports.loading} allowClear placeholder="选择本患者的原报告" options={reports.data?.items.map(r => ({ value: r.id, label: `#${r.id} · ${dateText(r.occurred_at)} · ${r.record_type}` })) || []} notFoundContent={reports.error || '暂无报告，请先在患者档案补充'} /></Form.Item>
}
function WorkEditor({ work, center, phase, patientId, draft, close, saved }) {
  const [keyword, setKeyword] = useState('')
  const patients = useLoad(() => api('/patients/query', { page: 0, size: 100, keyword }), [keyword])
  const values = work ? { ...work, due_at: dayjs(work.due_at), reason: '' } : { center, phase, patient_id: patientId, category: draft?.category || centers[center].categories[phase][0], title: draft?.category || '', clinical: false, due_at: dayjs().add(1, 'hour') }
  return <FormDialog title={work ? '修改服务工作单' : '新建服务工作单'} open width={740} initialValues={values} onClose={close} onSubmit={async v => {
    const result = await api('/interventions/save', { ...v, id: work?.id, version: work?.version, record_id: v.record_id || null, due_at: v.due_at.format('YYYY-MM-DDTHH:mm:ss') }); saved(result)
  }}>
    <Alert type="info" showIcon className="mb" message="责任团队沿用患者分派。修改工作单后，原医学审核失效，需要重新提交。" />
    <Form.Item name="patient_id" label="患者" rules={required}><Select disabled={!!work} showSearch filterOption={false} onSearch={setKeyword} loading={patients.loading} placeholder="搜索患者姓名" options={[...(patients.data?.items || []).map(p => ({ value: p.id, label: p.name + ' / #' + p.id })), ...(work && !patients.data?.items.some(p => p.id === work.patient_id) ? [{ value: work.patient_id, label: work.patient_name }] : [])]} /></Form.Item>
    {patients.error && <Alert type="error" message={patients.error} />}
    <div className="form-grid"><Form.Item name="center" label="服务中心" rules={required}><Select options={opts(centers)} /></Form.Item><Form.Item name="phase" label="服务阶段" rules={required}><Select options={opts(phases)} /></Form.Item></div>
    <Form.Item name="category" label="服务事项" rules={[...required, { whitespace: true, max: 40 }]}><Input maxLength={40} /></Form.Item>
    <Form.Item name="title" label="工作单标题" rules={[...required, { whitespace: true, max: 160 }]}><Input maxLength={160} /></Form.Item>
    <div className="form-grid"><Form.Item name="due_at" label="截止时间" rules={required}><DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} /></Form.Item><Form.Item name="clinical" label="医学审核" rules={required}><Select disabled={work?.clinical} options={[{ value: false, label: '普通服务事项' }, { value: true, label: '临床内容 · 需责任医生审核' }]} /></Form.Item></div>
    <ReportSelect />
    <Form.Item name="content" label="服务内容 / 待审核正文" rules={[...required, { whitespace: true, max: 4000 }]}><Input.TextArea rows={5} maxLength={4000} showCount /></Form.Item>
    <Form.Item name="reason" label="新建或修改原因" rules={[...required, { whitespace: true, max: 2000 }]}><Input.TextArea rows={2} maxLength={2000} /></Form.Item>
  </FormDialog>
}
function WorkDetail({ id, close, edit, refreshed, doctor }) {
  const state = useLoad(() => api('/interventions/get', { id }), [id])
  const [action, setAction] = useState(null)
  const { message } = App.useApp()
  const staff = useLoad(() => api('/staff'), [])
  const doctors = useLoad(() => api('/clinicians'), [])
  const person = id => doctors.data?.find(p => p.id === id)?.name || staff.data?.find(p => p.user_id === id)?.real_name || '账号 #' + id
  return <Drawer open width={510} onClose={close} title="工作单办理" className="ic-drawer" destroyOnClose><LoadState state={state}>{work => <>
    <div className="ic-shell"><div className="ic-detail"><div className="ic-detail-head">工作单 / #{work.id}<span>版本 {work.version}</span></div><h2>{work.title}</h2><div className="ic-chips"><Badge work={work} /><span>{phases[work.phase].title}</span><span>{work.clinical ? '临床内容' : '普通服务'}</span></div>
      <div className="ic-person"><div className="ic-avatar">{work.patient_name?.slice(-1)}</div><strong>{work.patient_name}</strong><Link to={'/after-care?step=patients&patient=' + work.patient_id}>患者档案 ↗</Link></div>
      <dl className="ic-meta"><dt>服务负责人</dt><dd>{person(work.owner_id)}</dd><dt>责任医生</dt><dd>{person(work.doctor_id)}</dd><dt>服务事项</dt><dd>{work.category}</dd><dt>截止时间</dt><dd className={overdue(work) ? 'ic-red' : ''}>{dateText(work.due_at)} {overdue(work) && '· 已超时'}</dd></dl>
      <section className="ic-content"><h3>服务内容{!doctor && !['RESOLVED', 'CLOSED'].includes(work.status) && <Button onClick={() => edit(work)}>修改</Button>}</h3><p>{work.content}</p></section>
      {work.record_id && <details className="ic-report"><summary>原始报告 · #{work.record_id}</summary><p>{work.record_content || '报告已不可用，请核对患者档案'}</p>{doctor && <Button onClick={() => setAction('READ')}>本人确认报告已阅</Button>}</details>}
      {work.result && <section className="ic-content"><h3>办理结果</h3><p>{work.result}</p></section>}
      {work.arrived_at && <div className="ic-receipt">✓ 到院核验 · {dateText(work.arrived_at)}<p>{work.arrival_evidence}</p></div>}
      {work.score && <div className="ic-receipt">患者评价 {work.score} / 5<p>{work.feedback}</p></div>}
      {!doctor && <div className="ic-legacy"><Link to={'/after-care?step=appointments&patient=' + work.patient_id}>办理预约到院</Link><Link to={'/after-care?step=referrals&patient=' + work.patient_id}>转诊承接台账</Link><Link to={'/after-care?step=followups&patient=' + work.patient_id}>随访执行</Link></div>}
      {work.clinical && work.status === 'RESOLVED' && work.acknowledged_by !== work.doctor_id && <Alert type="info" message="等待当前责任医生查收结果后，可核验闭环。" />}
      {work.clinical && work.status === 'READY' && work.reviewer_id !== work.doctor_id && <Alert type="warning" message="责任医生已变更，请重新提交医学审核。" />}
      <div className="ic-work-actions">{availableActions(work, doctor).map((a, i) => <Button key={a} type={i === 0 ? 'primary' : 'default'} onClick={() => setAction(a)}>{workActions[a]}</Button>)}</div>
      <p className="muted" style={{ fontSize: 11 }}>操作只保存人工服务记录。实际患者联系请使用已经配置并核验的业务渠道。</p>
      <h3 className="ic-history-title">操作记录 <small>{work.logs.length} 条 · 仅追加</small></h3><ol className="ic-history">{work.logs.map(log => <li key={log.id}><div><strong>{workActions[log.action] || log.action}</strong><time>{dateText(log.at)}</time></div><p>{log.note}</p><small>{person(log.actor_id)}</small>{log.before_json && <details><summary>修改前后</summary><pre>{JSON.stringify({ 修改前: JSON.parse(log.before_json), 修改后: JSON.parse(log.after_json) }, null, 2)}</pre></details>}</li>)}</ol>
    </div></div>
    {action && <FormDialog key={action} open title={action === 'READ' ? '本人确认报告已阅' : workActions[action]} initialValues={{ occurred_at: dayjs(), score: 5 }} onClose={() => setAction(null)} onSubmit={async v => {
      if (action === 'READ') await api('/records/review', { id: work.record_id, opinion: v.note })
      else await api('/interventions/act', { id: work.id, version: work.version, action, note: v.note, score: action === 'RATE' ? v.score : undefined, occurred_at: action === 'ARRIVAL' ? v.occurred_at.format('YYYY-MM-DDTHH:mm:ss') : undefined })
      state.reload(); refreshed(); message.success('记录已保存')
    }}>
      {action === 'APPROVE' && <Alert className="mb" type="info" message="确认已核对原报告及当前正文，通过后团队可按本版本执行。" />}
      {action === 'ARRIVAL' && <Form.Item name="occurred_at" label="实际到院时间" rules={required}><DatePicker showTime disabledDate={date => date.isAfter(dayjs(), 'day')} /></Form.Item>}
      {action === 'RATE' && <Form.Item name="score" label="患者实际评价" rules={required}><Select options={[5, 4, 3, 2, 1].map(n => ({ value: n, label: n + ' 分' }))} /></Form.Item>}
      <Form.Item name="note" label={action === 'COMPLETE' ? '办理结果与患者反馈' : action === 'CLOSE' ? '患者反馈核验依据' : '办理依据 / 协作记录'} rules={[...required, { whitespace: true, max: 2000 }]}><Input.TextArea rows={5} maxLength={2000} showCount /></Form.Item>
    </FormDialog>}
  </>}</LoadState></Drawer>
}
export default function InterventionCenter() {
  const account = useOutletContext(), doctor = account.role_code === 'DOCTOR'
  const [search, setSearch] = useSearchParams(), [editor, setEditor] = useState(null), [detailRevision, setDetailRevision] = useState(0)
  const center = centers[search.get('center')] ? search.get('center') : 'OUTPATIENT', phase = phases[search.get('phase')] ? search.get('phase') : 'PRE'
  const patientId = /^\d+$/.test(search.get('patient') || '') ? Number(search.get('patient')) : undefined
  const page = Math.max(0, Number(search.get('page')) || 0), workId = /^\d+$/.test(search.get('work') || '') ? Number(search.get('work')) : null
  const status = Object.hasOwn(workStatuses, search.get('status')) ? search.get('status') : undefined
  const state = useLoad(() => api('/interventions/query', { center, phase, patient_id: patientId, page, size: 12, status, keyword: search.get('q') || undefined, overdue: search.get('overdue') === '1' }), [center, phase, patientId, page, status, search.get('q'), search.get('overdue')])
  const navigate = (values, clear = false) => { const q = clear ? new URLSearchParams({ center, phase }) : new URLSearchParams(search); q.delete('page'); Object.entries(values).forEach(([k, v]) => v == null || v === '' ? q.delete(k) : q.set(k, v)); setSearch(q) }
  const config = centers[center]
  return <div className="ic-shell"><div className="ic-breadcrumb">患者服务 / 诊后主动干预中心 / {config.title}</div><header className="ic-heading"><div><span className="ic-eyebrow">PATIENT SERVICE · {config.code}</span><h1>{config.title}</h1><p>{config.subtitle}</p></div><div className="ic-heading-actions"><Link className="btn" to="/after-care?step=patients">患者档案</Link>{!doctor && <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditor({})}>新建工作单</Button>}<Button icon={<ReloadOutlined />} aria-label="刷新工作队列" onClick={state.reload} /></div></header>
    <nav className="ic-phases" aria-label="服务阶段">{Object.entries(phases).map(([key, p]) => <a key={key} href={'#/after-care?center=' + center + '&phase=' + key} onClick={e => { e.preventDefault(); navigate({ phase: key, patient: patientId }, true) }} className={key === phase ? 'active' : ''}><span>{p.title}</span><small>{p.subtitle}</small></a>)}</nav>
    {patientId && <Alert className="mb" type="info" message={'当前患者范围：#' + patientId} action={<Button onClick={() => navigate({ patient: null, work: null })}>查看全部患者</Button>} />}
    <LoadState state={state}>{data => <>
      <div className="ic-metrics">{[['待处理', 'todo', 'TODO'], ['处理中', 'active', 'ACTIVE'], ['待医生审核', 'review', 'REVIEW'], ['待核验', 'resolved', 'RESOLVED'], ['超时未完成', 'overdue', null], ['已闭环', 'closed', 'CLOSED']].map(([label, key, s]) => <a href="#" key={key} className={'ic-metric ' + (key === 'overdue' ? 'urgent' : '')} onClick={e => { e.preventDefault(); navigate({ status: s, overdue: key === 'overdue' ? '1' : null, work: null }) }}><span>{label}</span><strong>{data.metrics[key]}<small>单</small></strong></a>)}</div>
      {center === 'CONSULTATION' ? <div className="ic-dashboard"><section><div className="ic-section-title"><h3>咨询响应与协作</h3><span>当前患者及阶段范围</span></div><div className="ic-response"><div><b>{data.metrics.todo}</b><span>待受理工作单</span></div><div><b>{data.metrics.overdue}</b><span>超时未完成</span></div><div><b>{data.metrics.review}</b><span>待医学审核</span></div></div><p>受理时记录需求和截止时间，医学问题转责任医生本人审核。</p></section><section><div className="ic-section-title"><h3>到院与服务质量</h3><span>人工核验 · 工作单口径</span></div><div className="ic-response"><div><b>{data.metrics.arrived}</b><span>已核验到院</span></div><div><b>{data.metrics.positive}<small>/ {data.metrics.rated}</small></b><span>满意评价 / 全部评价</span></div><div><b>{data.metrics.complaints}</b><span>未闭环投诉协办</span></div></div><p>到院须填写凭据；评价使用患者实际反馈，满意为4至5分。</p></section></div> : <div className="ic-service-types"><span>本阶段可办事项</span>{config.categories[phase].map(c => <button key={c} className="ic-service-chip" disabled={doctor} onClick={() => setEditor({ category: c })}>{c}{!doctor && " ＋"}</button>)}<span className="ic-service-tip">{doctor ? '责任医生 · 审核与临床反馈' : '运营 / 护士 · 接待与执行'}</span></div>}
      <section className="ic-queue"><div className="ic-section-title"><h2>{phases[phase].title}服务队列 <small>{data.page.total_size} 单</small></h2><span>按截止时间优先处理</span></div>
        <form key={[center, phase, search.get('q'), status].join(':')} className="ic-filter" onSubmit={e => { e.preventDefault(); const values = new FormData(e.currentTarget); navigate({ q: values.get('q'), work: null }) }}><Input name="q" defaultValue={search.get('q')} prefix={<SearchOutlined />} placeholder="搜索工作单标题" aria-label="搜索工作单标题" /><Select value={status} allowClear placeholder="全部状态" style={{ width: 150 }} options={opts(workStatuses)} onChange={s => navigate({ status: s, work: null })} /><Button htmlType="submit">查询</Button><Button onClick={() => navigate({ patient: patientId }, true)}>重置</Button></form>
        {search.get('overdue') === '1' && <div className="ic-filter-hint">正在查看：超时未完成</div>}
        <Table rowKey="id" dataSource={data.page.items} scroll={{ x: 750 }} locale={{ emptyText: '暂无工作单，可新建本阶段服务事项' }} pagination={{ current: page + 1, pageSize: 12, total: data.page.total_size, showSizeChanger: false, onChange: value => navigate({ page: value - 1 }) }} columns={[
          { title: '患者 / 服务事项', dataIndex: 'patient_name', render: (name, w) => <><strong>{name}</strong><small>{w.category} · #{w.id}</small></> },
          { title: '工作单', dataIndex: 'title', render: (title, w) => <>{title}<small>{w.clinical ? '需医学审核' : '普通服务'}</small></> },
          { title: '截止时间', dataIndex: 'due_at', render: (at, w) => <span className={overdue(w) ? 'ic-red' : ''}>{dateText(at)}<small>{overdue(w) ? '超时待跟进' : '按计划办理'}</small></span> },
          { title: '状态', render: (_, w) => <Badge work={w} /> },
          { title: '操作', render: (_, w) => <Button type="link" onClick={() => navigate({ work: w.id })}>打开办理 →</Button> },
        ]} /><footer className="ic-queue-foot">负责人随患者分派同步 · 修改、审核和结果均有记录</footer>
      </section>
    </>}</LoadState>
    <div className="ic-footer"><span><i /> 当前账号权限内的服务工作单 · 数据保存至系统</span><span>完成工作单不替代原始预约、转诊与医学记录</span></div><div className="ic-legacy"><Link to="/after-care?step=overview">个案计划与随访</Link>{!doctor && <><Link to="/after-care?step=appointments">预约到院台账</Link><Link to="/after-care?step=referrals">转诊承接台账</Link></>}<Link to="/after-care?step=patients">患者档案与责任分派</Link></div>
    {workId && <WorkDetail key={workId + ':' + detailRevision} id={workId} doctor={doctor} close={() => navigate({ work: null })} edit={setEditor} refreshed={state.reload} />}
    {editor && <WorkEditor key={editor.id || 'new'} work={editor.id ? editor : null} center={center} phase={phase} patientId={patientId} draft={editor} close={() => setEditor(null)} saved={work => { state.reload(); setDetailRevision(v => v + 1); navigate({ center: work.center, phase: work.phase, work: work.id }, true) }} />}
  </div>
}
