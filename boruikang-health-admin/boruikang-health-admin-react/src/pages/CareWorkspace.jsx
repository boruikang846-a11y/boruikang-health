import React, { useState } from 'react'
import { Link, Navigate, useLocation, useOutletContext, useSearchParams } from 'react-router-dom'
import { Alert, Card, Select, Space, Tabs, Tag } from 'antd'
import { api, useLoad } from '../api'
import { LoadState, PageTitle } from '../ui'
import { afterCareStages, doctorCareStages, legacyDestination, preCareStages, stageSearch } from '../careNavigation'
import Journeys, { AfterCare } from './Journeys'
import { Dashboard, Patients, PatientDetail } from './Patients'
import { DoctorHome, DoctorReports, DoctorTasks } from './Doctor'
import Screening from './Screening'
import Tasks from './Tasks'
import Invitations from './Invitations'
import Appointments from './Appointments'
import Referrals from './Referrals'

export function LegacyCareRedirect() {
  const location = useLocation()
  return <Navigate replace to={legacyDestination(location.pathname, location.search) || '/journeys'} />
}

export function JourneyWorkspace() {
  const account = useOutletContext(), doctor = account.role_code === 'DOCTOR'
  const [search, setSearch] = useSearchParams()
  const active = search.get('step') === 'workbench' ? 'workbench' : 'journeys'
  const patientContext = search.get('patient') ? '?patient=' + encodeURIComponent(search.get('patient')) : ''
  return <><Card className="care-entry mb" title="按服务阶段开始办理"><div className="care-path-grid">
    {!doctor && <Link to={'/screening' + patientContext}><span>01 · 诊前</span><h3>诊前高危患者筛查中心</h3><p>筛查分层 → 建档分派 → 首次联系与邀约 → 预约到诊</p></Link>}
    <Link to={'/after-care' + patientContext}><span>{doctor ? '我的患者服务' : '02 · 诊后'}</span><h3>诊后健康服务中心</h3><p>核对档案和报告 → 个案计划 → 医生审核 → 随访、异常、复诊与转诊</p></Link>
  </div><p className="muted mt">每次就诊通过下方旅程串联交接、原始报告、个案计划和结果。环节待办按当前账号的患者分派权限显示。</p></Card>
    <Tabs activeKey={active} onChange={step => setSearch(stageSearch(search, step))} items={[{ key: 'journeys', label: '就诊旅程与个案计划' }, { key: 'workbench', label: doctor ? '医生今日待办' : '团队今日待办' }]} />
    {active === 'workbench' ? doctor ? <DoctorHome /> : <Dashboard /> : <Journeys />}
  </>
}

function RevisitWorkspace({ patientId }) {
  const [search, setSearch] = useSearchParams()
  const view = search.get('revisit_view') === 'tasks' || search.has('task') ? 'tasks' : 'appointments'
  return <><Tabs activeKey={view} onChange={value => { const next = stageSearch(search, 'revisits'); next.set('revisit_view', value); setSearch(next) }} items={[{ key: 'appointments', label: '复诊预约与到诊结果' }, { key: 'tasks', label: '复诊与到诊任务' }]} />
    {view === 'appointments' ? <Appointments patientId={patientId} appointmentType="REVISIT" /> : <><Alert className="mb" type="info" showIcon message="此任务队列同时保留首次到诊和复诊跟踪任务；请核对关联预约类型。仅查看复诊预约，请切换至“复诊预约与到诊结果”。" /><Tasks taskType="REVISIT" patientId={patientId} titleOverride="复诊与到诊任务" /></>}
  </>
}

const guidance = {
  intake: ['运营 / 护士录入与核验', '导入筛查名单，核对来源、联系方式与院方判定依据；完成分层后建档并分派责任医生和负责人。', '筛查分层依据来自院方或筛查医生，工作人员只登记结论。'],
  outreach: ['运营 / 护士首次联系', '接收分配的联系任务，核实本人或授权联系人，记录接通结果、服务意愿与下一步时间。', '未接通需登记原因并安排重试；医学问题交责任医生处理。'],
  invitations: ['运营 / 护士执行邀约', '按轮次记录邀约方式、患者意愿和下次联系时间；愿意到诊后进入预约到诊环节。', '未建档对象先在筛查名单完成建档入组，才能关联邀约记录。'],
  appointments: ['运营 / 护士核实履约', '登记预约时间与科室，核实到院证据、爽约原因和诊疗结果；到诊后进入旅程完成报告与诊后交接。', '预约登记、已发提醒和到院核验分别留痕，不能相互代替。'],
  consultation: ['运营 / 护士整理问题，医生审核', '登记患者咨询，关联原始报告并起草回复；责任医生审核后，人工联系并记录反馈。', '个体化医学建议必须由患者责任医生本人在系统里审核。'],
  overview: ['运营 / 护士与责任医生协同', '查看未完成交接、待审核计划和未结问题；进入同一次就诊旅程，明确负责人、截止时间和下一步。', '建立档案或完成到诊不会自动完成服务交接，需在旅程中核验。'],
  patients: ['核对档案与责任分派', '在此统一导入、管理患者档案；核对授权、责任医生、负责人及原报告，再建立或接续就诊旅程。', '患者档案贯穿诊前诊后；归入本中心不代表所有患者均已完成就诊。'],
  followups: ['运营 / 护士起草与执行，医生审核与查收', '关联本次原报告 → 起草随访意见 → 提交责任医生审核 → 按已通过正文联系 → 记录结果并交医生查收。', '修改医学建议后需要重新审核；未接通需保留联系记录并安排重试。'],
  alerts: ['运营 / 护士核实升级，责任医生处置', '记录异常事实与来源，响应后升级责任医生；医生本人给出处置，团队核验患者收到反馈。', '已通知不等于已关闭，运营人员不能代医生登记临床处置。'],
  revisits: ['运营 / 护士持续跟踪', '依据医生安排登记复诊任务与预约，核实到院及诊疗结果；未到院记录原因，继续安排跟进。', '复诊完成以核验结果为依据，不能仅凭已发送提醒完成。'],
  referrals: ['运营 / 护士协调，医生提供医学依据', '依据院方转诊安排记录发起、接收、到达、反馈；核对接收机构与下一位负责人。', '转诊台账用于协调与留痕，工作人员不替代医生作诊疗决策。'],
  'doctor-workbench': ['责任医生本人办理', '先看待处置异常和报告，再审核团队意见，最后查收随访结果并反馈下一步。', '仅处理分配给自己的患者，医学审核与异常处置由本人完成。'],
  reports: ['责任医生查看原报告', '阅读患者原始报告，确认已阅并填写意见，供团队起草个案随访内容。', '确认已阅不等于审核随访意见，需在意见审核环节另行确认。'],
  reviews: ['责任医生审核个体意见', '核对原报告与草稿，审核通过或退回修改；通过后团队才能按已审核正文联系患者。', '审核必须由该患者的责任医生本人完成。'],
  results: ['责任医生查收服务结果', '查看已完成联系的随访记录，查收并给出后续反馈，异常需要进入处置环节。', '查收不替代异常处置；未结问题仍需追踪至反馈核验。'],
}

export default function CareWorkspace({ phase }) {
  const account = useOutletContext(), doctor = account.role_code === 'DOCTOR', before = phase === 'before'
  const [search, setSearch] = useSearchParams(), [keyword, setKeyword] = useState('')
  const stages = before ? preCareStages : doctor ? doctorCareStages : afterCareStages
  const step = stages.some(([key]) => key === search.get('step')) ? search.get('step') : stages[0][0]
  const patientId = /^\d+$/.test(search.get('patient') || '') && Number(search.get('patient')) > 0 ? Number(search.get('patient')) : undefined
  const scoped = !['intake', 'doctor-workbench', 'overview'].includes(step)
  const patientOptions = useLoad(() => scoped ? api('/patients/query', { page: 0, size: 30, keyword }) : Promise.resolve({ items: [] }), [scoped, keyword])
  const [owner, operation, boundary] = guidance[step]
  const context = patientId ? '?patient=' + patientId : ''
  const renderStage = () => {
    switch (step) {
      case 'intake': return <Screening />
      case 'outreach': return <Tasks taskType="OUTREACH" patientId={patientId} />
      case 'invitations': return <Invitations patientId={patientId} />
      case 'appointments': return <Appointments patientId={patientId} />
      case 'consultation': return <Tasks taskType="CONSULTATION" patientId={patientId} />
      case 'overview': return <AfterCare />
      case 'patients': return patientId ? <PatientDetail patientId={patientId} /> : <Patients />
      case 'followups': return <Tasks patientId={patientId} />
      case 'alerts': return doctor ? <DoctorTasks mode="alerts" patientId={patientId} /> : <Tasks taskType="ALERT" patientId={patientId} />
      case 'revisits': return <RevisitWorkspace patientId={patientId} />
      case 'referrals': return <Referrals patientId={patientId} />
      case 'doctor-workbench': return <DoctorHome />
      case 'reports': return <DoctorReports patientId={patientId} />
      case 'reviews': return <DoctorTasks mode="reviews" patientId={patientId} />
      case 'results': return <DoctorTasks mode="results" patientId={patientId} />
      default: return null
    }
  }
  return <><PageTitle title={before ? '诊前高危患者筛查中心' : '诊后健康服务中心'} subtitle={before ? '从筛查发现到到诊交接，按环节完成患者接入。' : '承接患者档案与原始报告，协同完成计划、随访、异常处置和复诊。'} extra={<Space wrap><Link to={'/journeys' + context}>查看就诊旅程</Link>{!doctor && <Link to={(before ? '/after-care' : '/screening') + context}>{before ? '转入诊后服务' : '回到诊前筛查'}</Link>}</Space>} />
    <Card className="care-guide mb" size="small"><Tag color="green">当前环节 · {stages.find(([key]) => key === step)[1]}</Tag><strong>{owner}</strong><p>{operation}</p><p className="muted">{boundary}</p></Card>
    <Tabs className="care-stage-tabs" activeKey={step} onChange={value => setSearch(stageSearch(search, value))} items={stages.map(([key, label]) => ({ key, label }))} />
    {scoped && <div className="care-patient-context"><span>患者范围</span><LoadState state={patientOptions}>{data => <Select aria-label="当前环节患者范围" showSearch allowClear filterOption={false} placeholder="全部可见患者，可搜索姓名" value={patientId} onSearch={setKeyword} style={{ width: 300, maxWidth: '100%' }} options={[...data.items.map(patient => ({ value: patient.id, label: patient.name + ' / #' + patient.id })), ...(patientId && !data.items.some(patient => patient.id === patientId) ? [{ value: patientId, label: '患者 #' + patientId }] : [])]} onChange={value => { const next = stageSearch(search, step); if (value) next.set('patient', value); else next.delete('patient'); setSearch(next) }} />}</LoadState><small>切换环节保留患者；切换患者清除上一项任务。</small></div>}
    {before && step !== 'intake' && <Alert className="mb" type="info" showIcon message="本环节办理已建档患者；筛查对象请先完成院方结论登记与建档入组。" />}
    {['invitations', 'appointments', 'consultation', 'followups', 'alerts', 'revisits', 'referrals'].includes(step) && <p className="muted">本环节使用患者共享台账，按所选患者和账号权限查询，包含该患者不同就诊阶段的记录。进入具体就诊旅程核对本次事件和计划。</p>}
    {!scoped && patientId && <p className="muted">已保留患者 #{patientId}，切换到办理环节时继续使用；当前总览与筛查名单按账号可见范围展示。</p>}
    <div className="care-stage-content" key={step + ':' + (patientId || 'all')}>{renderStage()}</div>
  </>
}
