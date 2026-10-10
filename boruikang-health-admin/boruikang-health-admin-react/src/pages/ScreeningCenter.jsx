import React, { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Alert, Button, Card, DatePicker, Empty, Progress, Segmented, Space, Tabs } from 'antd'
import { api, useLoad } from '../api'
import { LoadState, names, PageTitle } from '../ui'
import EcgGradingGuide, { ecgGuidance } from './EcgGradingGuide'
import Screening from './Screening'
import Invitations from './Invitations'
import Appointments from './Appointments'
import Tasks from './Tasks'
import Referrals from './Referrals'
import { screeningScopes, screeningSections } from './screeningCenterModel'
import './ScreeningCenter.css'

function Statistics() {
  const [range, setRange] = useState(null)
  const filters = { screened_from: range?.[0]?.format('YYYY-MM-DD'), screened_to: range?.[1]?.format('YYYY-MM-DD') }
  const state = useLoad(() => api('/screenings/statistics', filters), [JSON.stringify(filters)])
  const to = (step, extra = {}) => '/screening?' + new URLSearchParams({ step, ...extra, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) })
  return <><div className="screening-section-heading"><div><span className="screening-eyebrow">SCREENING OVERVIEW</span><h2>发现风险，让每一位患者得到跟进</h2><p>当前账号可见范围 · 按检出日期统计</p></div><Space wrap><DatePicker.RangePicker aria-label="统计日期范围" value={range} onChange={setRange} /><Button onClick={state.reload}>刷新数据</Button></Space></div>
    <LoadState state={state}>{data => <>
      <div className="screening-metric-grid">{[
        ['筛查记录', data.total, '全部来源记录', 'intake', ''], ['待判定', data.pending, '待核对院方结论', 'intake', 'amber'],
        ['高危 / 危急', data.high_risk, '高危与危急，剔除作废', 'high-risk', ''], ['心电危急', data.critical, '本次报告已登记为危急', 'critical', 'red'],
      ].map(([label, count, hint, step, tone]) => <Link className={'screening-metric ' + tone} key={label} to={to(step, label === '待判定' ? { pool_status: 'NEW' } : {})}><span>{label}</span><strong>{count}<small>条</small></strong><p>{hint}<b>↗</b></p></Link>)}</div>
      <div className="screening-chart-grid"><Card title="检出来源分布" extra={<span className="muted">记录数</span>}>
        {Object.entries(data.sources).map(([key, value]) => <div className="screening-bar" key={key}><span>{names[key] || key}</span><Progress percent={data.total ? value / data.total * 100 : 0} showInfo={false} strokeColor="#299e60" /><b>{value}</b></div>)}
      </Card><Card title="风险分层分布" extra={<span className="muted">依据已登记的院方结论</span>}>
        {Object.entries(data.risks).map(([key, value]) => <div className="screening-bar" key={key}><span>{names[key] || key}</span><Progress percent={data.total ? value / data.total * 100 : 0} showInfo={false} strokeColor={key === 'CRITICAL' ? '#d45a55' : key === 'HIGH' ? '#e3a44f' : '#59999c'} /><b>{value}</b></div>)}
      </Card></div>
      <Card title="跟进工作台"><div className="screening-work-items"><Link to={to('critical')}><strong>优先核实危急对象</strong><p>{data.critical} 条本次心电危急，核对报告与处理进度</p><span>进入预警 →</span></Link><Link to={to('high-risk')}><strong>跟进高危对象</strong><p>{data.high_risk} 条高危及危急记录，核对建档和首次联系</p><span>查看高危患者 →</span></Link><Link to="/screening?step=invitations"><strong>持续回访与邀约</strong><p>按轮次留痕，关联预约、到诊和下次联系</p><span>进入邀约记录 →</span></Link></div></Card>
      <p className="muted">统计口径：按筛查记录计数，同一患者多次检查会分别计数；已建档 {data.enrolled} 条。来源和风险分布包含作废记录。建档不代表服务激活，风险等级不等于已完成危急处置。</p>
      {!data.total && <Empty description="所选日期暂无筛查记录，可调整日期或导入名单" />}
    </>}</LoadState>
  </>
}

export default function ScreeningCenter() {
  const [search, setSearch] = useSearchParams()
  const requested = search.get('step') || 'statistics'
  const legacy = ['intake', 'outreach', 'appointments', 'consultation', 'alerts', 'referrals']
  const step = [...screeningSections.map(([key]) => key), ...legacy].includes(requested) ? requested : 'statistics'
  const [gradeView, setGradeView] = useState('CRITICAL')
  const [category, setCategory] = useState('')
  const [family, setFamily] = useState('全部')
  const [invitationView, setInvitationView] = useState('records')
  const patientId = /^\d+$/.test(search.get('patient') || '') ? Number(search.get('patient')) : undefined
  const active = legacy.includes(step) ? step === 'intake' ? 'network' : 'invitations' : step
  const title = screeningSections.find(([key]) => key === active)?.[1]
  let body
  if (step === 'statistics') body = <Statistics />
  else if (step === 'outreach') body = <Tasks taskType="OUTREACH" patientId={patientId} />
  else if (step === 'appointments') body = <Appointments patientId={patientId} />
  else if (step === 'consultation' || step === 'alerts') body = <Tasks taskType={step === 'alerts' ? 'ALERT' : 'CONSULTATION'} patientId={patientId} />
  else if (step === 'referrals') body = <Referrals patientId={patientId} />
  else if (step === 'invitations') body = <><Tabs activeKey={invitationView} onChange={setInvitationView} items={[{ key: 'records', label: '回访邀约记录' }, { key: 'appointments', label: '预约与到诊' }, { key: 'outreach', label: '首次联系' }, { key: 'referrals', label: '转诊衔接' }]} />{invitationView === 'records' ? <Invitations patientId={patientId} /> : invitationView === 'appointments' ? <Appointments patientId={patientId} /> : invitationView === 'referrals' ? <Referrals patientId={patientId} /> : <Tasks taskType="OUTREACH" patientId={patientId} />}</>
  else body = <>{['critical', 'network', 'exam', 'health', 'high-risk'].includes(step) && <EcgGradingGuide />}
    {step === 'critical' && <><Alert className="mb" type={gradeView === 'CRITICAL' ? 'error' : gradeView === 'WARNING' ? 'warning' : gradeView === 'NORMAL' ? 'success' : 'info'} showIcon message={ecgGuidance[gradeView] || '核实原报告与院方分级结论，未核实记录不按普通处理'} description="本次心电图分级与患者长期风险分别记录。历史危急标签尚未核实的记录保留独立入口，不自动转换为指南分级。" /><Tabs activeKey={gradeView} onChange={setGradeView} items={[{ key: 'CRITICAL', label: '危急心电图' }, { key: 'WARNING', label: '预警心电图' }, { key: 'NORMAL', label: '普通心电图' }, { key: 'UNASSESSED', label: '待核实分级' }, { key: 'LEGACY', label: '历史 / 其他危急风险' }]} /></>}
    <div className={step === 'network' ? 'screening-network-layout' : ''}>
      {step === 'network' && <Card className="screening-category-panel"><Segmented value={family} options={['全部', '心律失常', '冠心病']} onChange={value => { setFamily(value); setCategory('') }} />{['', ...(family !== '冠心病' ? ['房颤', '房扑', '频发室早、室速', '高度或三度房室传导阻滞', '预激综合征', ...(family === '全部' ? ['冠心病', '心肌缺血'] : [])] : ['冠心病', '心肌缺血'])].map(value => <Button block key={value} type={category === value ? 'primary' : 'text'} onClick={() => setCategory(value)}>{value || '全部分类'}</Button>)}<p className="muted">按登记分类查询，未归类记录在“全部分类”中显示。</p></Card>}
      <div className="screening-records"><Screening key={step + ':' + category + ':' + family + ':' + gradeView} scope={{ ...(screeningScopes[step] || {}), ...(step === 'critical' ? gradeView === 'LEGACY' ? { ecg_grade: undefined, risk_level: 'CRITICAL', high_risk: true } : { ecg_grade: gradeView } : {}), ...(step === 'network' && category ? { category } : {}), ...(step === 'network' && family !== '全部' ? { category_group: family === '冠心病' ? 'CORONARY' : 'ARRHYTHMIA' } : {}) }} title={step === 'intake' ? '全部筛查名单' : title} /></div>
    </div></>
  return <div className="screening-center"><PageTitle title="诊前高危患者筛查中心" subtitle="多源筛查 · 风险核实 · 主动邀约 · 持续跟进" extra={<Link to="/journeys">患者全旅程 →</Link>} />
    <Tabs className="screening-center-tabs" activeKey={active} onChange={value => { setCategory(''); setSearch(new URLSearchParams({ step: value, ...(patientId ? { patient: patientId } : {}) })) }} items={screeningSections.map(([key, label]) => ({ key, label }))} />
    {patientId && <Alert className="mb" type="info" message={'邀约及办理环节保留患者 #' + patientId + '；统计与筛查来源名单按当前账号权限展示。'} />}{body}
  </div>
}
