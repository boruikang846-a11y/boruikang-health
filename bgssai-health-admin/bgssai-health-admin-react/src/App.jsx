import React, { useEffect, useState } from 'react'
import { Link, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Alert, Avatar, Button, Card, Form, Input, Layout, Menu, Space, Spin, Tag } from 'antd'
import { DashboardOutlined, TeamOutlined, ScheduleOutlined, AlertOutlined, CalendarOutlined,
  ReadOutlined, QrcodeOutlined, BarChartOutlined, SettingOutlined, LogoutOutlined, HeartOutlined } from '@ant-design/icons'
import { api, setToken, token } from './api'
import { names } from './ui'
import { Dashboard, Patients, PatientDetail } from './pages/Patients'
import Tasks from './pages/Tasks'
import Hospital from './pages/Hospital'
import SystemOverview from './pages/SystemOverview'
import { Knowledge, Channels, Reports, Settings } from './pages/Operations'

const navigation = [
  ['/workbench', '运营工作台', DashboardOutlined], ['/patients', '患者中心', TeamOutlined],
  ['/followups', '随访与咨询', ScheduleOutlined], ['/alerts', '异常处理', AlertOutlined],
  ['/revisits', '复诊跟踪', CalendarOutlined], ['/knowledge', '宣教与服务内容', ReadOutlined],
  ['/channels', '渠道管理', QrcodeOutlined], ['/reports', '随访统计与复盘', BarChartOutlined],
  ['/hospital', '医院数据', QrcodeOutlined], ['/settings', '接入设置', SettingOutlined], ['/overview', '系统介绍', HeartOutlined],
]
function Login({ onLogin, account }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const location = useLocation()
  if (account) return <Navigate to={account.role_code === 'PLATFORM_ADMIN' ? '/settings' : '/workbench'} replace />
  return <div className="login-page"><section className="login-story">
    <div className="brand"><HeartOutlined /> BGSSAI Health</div>
    <div><div className="eyebrow">CONTINUOUS CARE</div><h1>每一次随访，<br />都有下文。</h1><p>连接患者、医生与健康管理团队。<br />从入组到复诊，让院外服务有记录、可跟踪。</p>
      <div className="login-steps"><span>患者建档</span><span>随访审核</span><span>持续管理</span></div></div>
    <small>医患运营管理平台 / HEALTH-ADMIN</small>
  </section><section className="login-panel"><Card bordered={false}><Tag color="blue">医护与运营团队</Tag><h2>登录工作台</h2><p className="muted">使用医院分配的工作账号继续</p>
    {error && <Alert type="error" showIcon message={error} className="mb" />}
    <Form layout="vertical" onFinish={async values => {
      if (busy) return; setBusy(true); setError(null)
      try { const result = await api('/login', values); setToken(result.jwt_token); onLogin(result) }
      catch (e) { setError(e.message) } finally { setBusy(false) }
    }}>
      <Form.Item name="identifier" label="工作账号" rules={[{ required: true, message: '请输入工作账号' }]}><Input size="large" autoComplete="username" placeholder="请输入工作账号" /></Form.Item>
      <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}><Input.Password size="large" autoComplete="current-password" placeholder="请输入密码" /></Form.Item>
      <Button type="primary" size="large" htmlType="submit" block loading={busy}>进入工作台</Button>
    </Form><p className="mt"><Link to="/overview">了解整个系统与团队分工 →</Link></p><p className="login-note">账号由机构管理员分配。平台管理员与临床工作账号的权限相互独立。</p>
  </Card></section></div>
}
function Shell({ account, logout }) {
  const location = useLocation()
  const visible = navigation.filter(([path]) => account.role_code === 'PLATFORM_ADMIN' ? ['/settings', '/overview'].includes(path) : path !== '/channels' || account.role_code === 'MANAGER')
  return <Layout className="app-shell"><Layout.Sider width={222} breakpoint="lg" collapsedWidth={64} className="sidebar">
    <Link className="brand" to={visible[0][0]}><HeartOutlined /><span>BGSSAI <b>Health</b></span></Link>
    <div className="nav-caption">院外连续服务</div>
    <Menu mode="inline" selectedKeys={['/' + location.pathname.split('/')[1]]} items={visible.map(([path, title, Icon]) => ({
      key: path, icon: <Icon />, label: <Link to={path}>{title}</Link>,
    }))} /><div className="sidebar-foot"><span className="online-dot" /> 医患协作 / MVP 1.3</div>
  </Layout.Sider><Layout><header className="topbar"><span className="muted">医患运营管理平台 <span className="topbar-divider">/</span> 工作空间</span>
    <Space><Tag>{names[account.role_code]}</Tag><Avatar size="small" style={{ background: '#e5efff', color: '#2469d9' }}>{account.real_name?.slice(0, 1)}</Avatar><span>{account.real_name}</span><Button type="text" icon={<LogoutOutlined />} onClick={logout}>退出</Button></Space>
  </header><main className="main-content"><Outlet context={account} /></main></Layout></Layout>
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
  const allowed = account && (account.role_code !== 'PLATFORM_ADMIN' || location.pathname === '/settings')
  return <Routes><Route path="/overview" element={<SystemOverview account={account} />} /><Route path="/login" element={<Login account={account} onLogin={result => { setAccount(result); navigate(result.role_code === 'PLATFORM_ADMIN' ? '/settings' : '/workbench') }} />} />
    <Route element={account ? allowed ? <Shell account={account} logout={async () => { try { await api('/logout', {}) } catch {} setToken(null); setAccount(null); navigate('/login') }} /> : <Navigate to="/settings" replace /> : <Navigate to="/login" replace />}>
      <Route path="/workbench" element={<Dashboard />} /><Route path="/patients" element={<Patients />} /><Route path="/patients/:id" element={<PatientDetail />} />
      <Route path="/followups" element={<Tasks />} /><Route path="/alerts" element={<Tasks taskType="ALERT" />} /><Route path="/revisits" element={<Tasks taskType="REVISIT" />} />
      <Route path="/hospital" element={<Hospital />} /><Route path="/knowledge" element={<Knowledge />} /><Route path="/channels" element={<Channels />} /><Route path="/reports" element={<Reports />} /><Route path="/settings" element={<Settings />} />
      <Route path="*" element={<Navigate to="/workbench" replace />} />
    </Route></Routes>
}
