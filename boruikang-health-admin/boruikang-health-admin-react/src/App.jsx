import React, { useEffect, useState } from 'react'
import { Link, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Alert, App as AntApp, Avatar, Button, Card, Form, Input, Layout, Menu, Space, Spin, Tag } from 'antd'
import { DashboardOutlined, TeamOutlined, ScheduleOutlined, AlertOutlined, CalendarOutlined,
  ReadOutlined, QrcodeOutlined, BarChartOutlined, SettingOutlined, LogoutOutlined, HeartOutlined, KeyOutlined, IdcardOutlined,
  AuditOutlined, FileSearchOutlined, InboxOutlined } from '@ant-design/icons'
import { api, setToken, token } from './api'
import { FormDialog, names } from './ui'
import { Dashboard, Patients, PatientDetail } from './pages/Patients'
import Tasks from './pages/Tasks'
import Journeys, { JourneyDetail, AfterCare } from './pages/Journeys'
import Hospital from './pages/Hospital'
import SystemOverview from './pages/SystemOverview'
import { Knowledge, Channels, Reports, Settings } from './pages/Operations'
import Screening from './pages/Screening'
import Invitations from './pages/Invitations'
import Appointments from './pages/Appointments'
import Packages from './pages/Packages'
import Referrals from './pages/Referrals'
import Accounts from './pages/Accounts'
import { DoctorHome, DoctorReports, DoctorTasks } from './pages/Doctor'
import WechatChannel from './pages/Wechat'
import { FunnelPlotOutlined, PhoneOutlined, CarryOutOutlined, GiftOutlined, SwapOutlined, WechatOutlined, WechatWorkOutlined } from '@ant-design/icons'

const navigation = [
  ['/journeys', '患者全旅程服务', HeartOutlined], ['/after-care', '诊后主动干预', ScheduleOutlined], ['/workbench', '运营工作台', DashboardOutlined], ['/screening', '患者池', FunnelPlotOutlined], ['/patients', '患者中心', TeamOutlined],
  ['/invitations', '邀约记录', PhoneOutlined], ['/appointments', '预约到诊', CarryOutOutlined],
  ['/followups', '随访与咨询', ScheduleOutlined], ['/wecom', '企业微信', WechatWorkOutlined], ['/official-account', '公众号', WechatOutlined], ['/alerts', '异常处理', AlertOutlined],
  ['/revisits', '复诊跟踪', CalendarOutlined], ['/packages', '服务包与方案', GiftOutlined], ['/referrals', '转诊', SwapOutlined], ['/knowledge', '宣教与服务内容', ReadOutlined],
  ['/channels', '渠道管理', QrcodeOutlined], ['/reports', '随访统计与复盘', BarChartOutlined],
  ['/hospital', '医院数据', QrcodeOutlined], ['/accounts', '医护账号', IdcardOutlined], ['/settings', '运营设置', SettingOutlined], ['/overview', '系统介绍', HeartOutlined],
]
const doctorNavigation = [
  ['/journeys', '患者全旅程服务', HeartOutlined], ['/after-care', '诊后主动干预', ScheduleOutlined],
  ['/doctor', '医生工作台', DashboardOutlined], ['/doctor/reviews', '随访意见审核', AuditOutlined], ['/doctor/reports', '患者报告', FileSearchOutlined],
  ['/doctor/results', '随访结果查收', InboxOutlined], ['/doctor/alerts', '异常处置', AlertOutlined], ['/patients', '我的患者', TeamOutlined],
  ['/knowledge', '宣教审核', ReadOutlined], ['/overview', '系统介绍', HeartOutlined],
]
/** Menu of each role; routes outside a role's menu redirect to its home page. */
export function menuFor(role) {
  if (role === 'DOCTOR') return doctorNavigation
  if (role === 'PLATFORM_ADMIN') return navigation.filter(([path]) => ['/settings', '/overview'].includes(path))
  if (role === 'MANAGER') return navigation
  return navigation.filter(([path]) => !['/channels', '/accounts'].includes(path))
}
const home = role => role === 'PLATFORM_ADMIN' ? '/settings' : role === 'DOCTOR' ? '/doctor' : '/workbench'
const reachable = (role, pathname) => menuFor(role).some(([path]) => pathname === path || pathname.startsWith(path + '/'))

function Login({ onLogin, account }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  if (account) return <Navigate to={home(account.role_code)} replace />
  return <div className="login-page"><section className="login-story">
    <div className="brand"><HeartOutlined /> 博瑞康 Health</div>
    <div><div className="eyebrow">CONTINUOUS CARE</div><h1>每一次随访，<br />都有下文。</h1><p>连接患者、医生与健康管理团队。<br />从入组到复诊，让院外服务有记录、可跟踪。</p>
      <div className="login-steps"><span>医生看报告</span><span>审核随访意见</span><span>团队持续跟进</span></div></div>
    <small>苏州博瑞康医疗科技有限公司 · 医患运营管理平台</small>
  </section><section className="login-panel"><Card bordered={false}><Tag color="blue">医护与运营团队</Tag><h2>登录工作台</h2><p className="muted">使用分配给你的工作账号登录</p>
    {error && <Alert type="error" showIcon message={error} className="mb" />}
    <Form layout="vertical" onFinish={async values => {
      if (busy) return; setBusy(true); setError(null)
      try { const result = await api('/login', values); setToken(result.jwt_token); onLogin(result) }
      catch (e) { setError(e.message) } finally { setBusy(false) }
    }}>
      <Form.Item name="identifier" label="工作账号" rules={[{ required: true, message: '请输入工作账号' }]}><Input size="large" autoComplete="username" placeholder="请输入工作账号" /></Form.Item>
      <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}><Input.Password size="large" autoComplete="current-password" placeholder="请输入密码" /></Form.Item>
      <Button type="primary" size="large" htmlType="submit" block loading={busy}>进入工作台</Button>
    </Form><p className="mt"><Link to="/overview">了解整个系统与团队分工 →</Link></p>
  </Card></section></div>
}
function PasswordDialog({ open, onClose }) {
  const { message } = AntApp.useApp()
  return <FormDialog title="修改密码" open={open} onClose={onClose} okText="确认修改" onSubmit={async values => {
    const result = await api('/password', { old_password: values.old_password, new_password: values.new_password }); setToken(result.jwt_token); message.success('密码已修改')
  }}>
    <Form.Item name="old_password" label="原密码" rules={[{ required: true, message: '请输入原密码' }]}><Input.Password autoComplete="current-password" /></Form.Item>
    <Form.Item name="new_password" label="新密码" rules={[{ required: true, message: '请输入新密码' }, { min: 8, max: 64, message: '密码 8–64 位' }]}><Input.Password autoComplete="new-password" /></Form.Item>
    <Form.Item name="confirm" label="再次输入新密码" dependencies={['new_password']} rules={[{ required: true, message: '请再次输入新密码' }, ({ getFieldValue }) => ({ validator: (_, value) => !value || value === getFieldValue('new_password') ? Promise.resolve() : Promise.reject(new Error('两次输入不一致')) })]}><Input.Password autoComplete="new-password" /></Form.Item>
  </FormDialog>
}
function Shell({ account, logout }) {
  const location = useLocation()
  const [password, setPassword] = useState(false)
  const visible = menuFor(account.role_code)
  const selected = visible.map(([path]) => path).filter(path => location.pathname === path || location.pathname.startsWith(path + '/')).sort((a, b) => b.length - a.length)[0]
  return <Layout className="app-shell"><Layout.Sider width={222} breakpoint="lg" collapsedWidth={64} className="sidebar">
    <Link className="brand" to={visible[0][0]}><HeartOutlined /><span>博瑞康 <b>Health</b></span></Link>
    <div className="nav-caption">{account.role_code === 'DOCTOR' ? '医生工作台' : '院外连续服务'}</div>
    <Menu mode="inline" selectedKeys={[selected]} items={visible.map(([path, title, Icon]) => ({
      key: path, icon: <Icon />, label: <Link to={path}>{title}</Link>,
    }))} /><div className="sidebar-foot"><span className="online-dot" /> 医患协作 / 2.0</div>
  </Layout.Sider><Layout><header className="topbar"><span className="muted">医患运营管理平台 <span className="topbar-divider">/</span> 工作空间</span>
    <Space><Tag>{names[account.role_code]}</Tag><Avatar size="small" style={{ background: '#e5efff', color: '#2469d9' }}>{account.real_name?.slice(0, 1)}</Avatar><span>{account.real_name}</span><Button type="text" icon={<KeyOutlined />} onClick={() => setPassword(true)}>修改密码</Button><Button type="text" icon={<LogoutOutlined />} onClick={logout}>退出</Button></Space>
  </header><main className="main-content"><div className="page-enter" key={location.pathname}><Outlet context={account} /></div></main></Layout>
    <PasswordDialog open={password} onClose={() => setPassword(false)} /></Layout>
}
export default function App() {
  const [account, setAccount] = useState(null)
  const [loading, setLoading] = useState(Boolean(token()))
  const [sessionError, setSessionError] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()
  useEffect(() => {
    if (token()) api('/me').then(setAccount).catch(e => setSessionError(e.message)).finally(() => setLoading(false))
    const expired = () => { setAccount(null); navigate('/login', { replace: true }) }
    window.addEventListener('health-session-expired', expired)
    return () => window.removeEventListener('health-session-expired', expired)
  }, [])
  if (loading) return <div className="loading full"><Spin size="large" /></div>
  if (sessionError && token() && !account) return <div className="loading full"><Alert type="error" message={sessionError} action={<Button onClick={() => window.location.reload()}>重试</Button>} /></div>
  const allowed = account && reachable(account.role_code, location.pathname)
  return <Routes><Route path="/overview" element={<SystemOverview account={account} />} /><Route path="/login" element={<Login account={account} onLogin={result => { setAccount(result); navigate(home(result.role_code)) }} />} />
    <Route element={account ? allowed ? <Shell account={account} logout={async () => { try { await api('/logout', {}) } catch {} setToken(null); setAccount(null); navigate('/login') }} /> : <Navigate to={home(account.role_code)} replace /> : <Navigate to="/login" replace />}>
      <Route path="/after-care" element={<AfterCare />} /><Route path="/journeys" element={<Journeys />} /><Route path="/journeys/:id" element={<JourneyDetail />} /><Route path="/workbench" element={<Dashboard />} /><Route path="/patients" element={<Patients />} /><Route path="/patients/:id" element={<PatientDetail />} />
      <Route path="/screening" element={<Screening />} /><Route path="/invitations" element={<Invitations />} /><Route path="/appointments" element={<Appointments />} /><Route path="/packages" element={<Packages />} /><Route path="/referrals" element={<Referrals />} />
      <Route path="/followups" element={<Tasks />} /><Route path="/alerts" element={<Tasks taskType="ALERT" />} /><Route path="/revisits" element={<Tasks taskType="REVISIT" />} />
      <Route path="/hospital" element={<Hospital />} /><Route path="/knowledge" element={<Knowledge />} /><Route path="/channels" element={<Channels />} /><Route path="/reports" element={<Reports />} /><Route path="/settings" element={<Settings />} />
      <Route path="/accounts" element={<Accounts />} /><Route path="/wecom" element={<WechatChannel provider="WE_COM" key="WE_COM" />} /><Route path="/official-account" element={<WechatChannel provider="WECHAT_OFFICIAL" key="WECHAT_OFFICIAL" />} />
      <Route path="/doctor" element={<DoctorHome />} /><Route path="/doctor/reviews" element={<DoctorTasks mode="reviews" key="reviews" />} /><Route path="/doctor/reports" element={<DoctorReports />} />
      <Route path="/doctor/results" element={<DoctorTasks mode="results" key="results" />} /><Route path="/doctor/alerts" element={<DoctorTasks mode="alerts" key="alerts" />} />
      <Route path="*" element={<Navigate to={account ? home(account.role_code) : '/login'} replace />} />
    </Route></Routes>
}
