import React, { useState } from 'react'
import { App, Button, Card, Form, Input, Select, Space, Tag } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { api, useLoad } from '../api'
import { DataTable, dateText, FormDialog, names, PageTitle, required } from '../ui'

const password = [{ required: true, message: '请填写初始密码' }, { min: 8, max: 64, message: '密码 8–64 位' }]
/** The operations manager opens logins for hospital doctors and nurses and for our own operators. */
export default function Accounts() {
  const { modal, message } = App.useApp()
  const [page, setPage] = useState(0)
  const [role, setRole] = useState(undefined)
  const [keyword, setKeyword] = useState('')
  const [create, setCreate] = useState(false)
  const [reset, setReset] = useState(null)
  const [wecom, setWecom] = useState(null)
  const state = useLoad(() => api('/accounts/query', { page, size: 10, role_code: role, keyword: keyword || undefined }), [page, role, keyword])
  const toggle = row => modal.confirm({
    title: row.enabled ? '停用「' + row.real_name + '」的账号？' : '启用「' + row.real_name + '」的账号？',
    content: row.enabled ? '停用后立即退出登录，不能再登录；其负责的患者与任务保持不变，请另行转交。' : '启用后需重新登录。', okText: '确认', cancelText: '取消',
    onOk: async () => { try { await api('/accounts/status', { id: row.id, enabled: !row.enabled }); state.reload() } catch (e) { message.error(e.message); throw e } },
  })
  return <><PageTitle title="医护账号" subtitle="为院方医生、护士和我方运营人员开通登录账号。医生负责看报告、审核随访意见；护士与运营人员负责随访执行。" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setCreate(true)}>新增账号</Button>} />
    <Card><div className="toolbar"><Select aria-label="角色" value={role} allowClear placeholder="全部角色" style={{ width: 150 }} options={['DOCTOR', 'NURSE', 'OPERATOR', 'MANAGER'].map(value => ({ value, label: names[value] }))} onChange={value => { setRole(value); setPage(0) }} />
      <Input.Search placeholder="搜索姓名" allowClear style={{ width: 200 }} onSearch={value => { setKeyword(value.trim()); setPage(0) }} /><Button icon={<ReloadOutlined />} onClick={state.reload}>刷新</Button></div>
      <DataTable state={state} page={page} setPage={setPage} columns={[
        { title: '姓名', dataIndex: 'real_name', render: (value, row) => <><strong>{value}</strong><div className="muted">账号 {row.username}</div></> },
        { title: '角色', dataIndex: 'role_code', render: value => <Tag color={value === 'DOCTOR' ? 'blue' : value === 'NURSE' ? 'cyan' : 'default'}>{names[value]}</Tag> },
        { title: '科室', dataIndex: 'department', render: value => value || '—' },
        { title: '状态', dataIndex: 'enabled', render: value => <Tag color={value ? 'green' : 'default'}>{value ? '启用中' : '已停用'}</Tag> },
        { title: '企业微信成员', dataIndex: 'wecom_user_id', render: (value, row) => <Button type="link" onClick={() => setWecom(row)}>{value || '登记'}</Button> },
        { title: '开通时间', dataIndex: 'gmt_create', render: dateText },
        { title: '操作', render: (_, row) => row.role_code === 'MANAGER' ? <span className="muted">—</span> : <Space><Button type="link" onClick={() => setReset(row)}>重置密码</Button><Button type="link" danger={row.enabled} onClick={() => toggle(row)}>{row.enabled ? '停用' : '启用'}</Button></Space> },
      ]} /></Card>
    <FormDialog title="新增账号" open={create} initialValues={{ role_code: 'DOCTOR' }} onClose={() => setCreate(false)} onSubmit={async values => { await api('/accounts/create', values); state.reload() }}>
      <div className="form-grid"><Form.Item name="role_code" label="角色" rules={required}><Select options={['DOCTOR', 'NURSE', 'OPERATOR'].map(value => ({ value, label: names[value] }))} /></Form.Item>
        <Form.Item name="real_name" label="姓名" rules={required}><Input maxLength={80} /></Form.Item>
        <Form.Item name="username" label="登录账号" rules={[...required, { pattern: /^[a-zA-Z0-9_.-]{3,40}$/, message: '3–40 位字母、数字、点、下划线或短横线' }]}><Input maxLength={40} autoComplete="off" /></Form.Item>
        <Form.Item noStyle shouldUpdate={(a, b) => a.role_code !== b.role_code}>{({ getFieldValue }) => <Form.Item name="department" label="科室" rules={getFieldValue('role_code') === 'OPERATOR' ? undefined : required}><Input maxLength={80} placeholder="例如 心血管内科" /></Form.Item>}</Form.Item></div>
      <Form.Item name="password" label="初始密码" rules={password} extra="请线下告知本人，登录后在右上角「修改密码」自行更换。"><Input.Password maxLength={64} autoComplete="new-password" /></Form.Item>
    </FormDialog>
    <FormDialog title={'企业微信成员账号 · ' + (wecom?.real_name || '')} open={Boolean(wecom)} initialValues={{ wecom_user_id: wecom?.wecom_user_id || '' }} onClose={() => setWecom(null)} onSubmit={async values => { await api('/accounts/wecom', { id: wecom.id, wecom_user_id: values.wecom_user_id || '' }); state.reload() }}>
      <p className="muted">填写该工作人员在医院企业微信通讯录里的成员账号（UserID）。患者加他为好友时，系统据此知道是谁添加的；渠道活码也用负责人的成员账号生成。留空保存表示清除。</p>
      <Form.Item name="wecom_user_id" label="成员账号" rules={[{ pattern: /^[A-Za-z0-9_.@-]{0,64}$/, message: '最多 64 位字母、数字、点、下划线、@ 或短横线' }]}><Input maxLength={64} autoComplete="off" /></Form.Item>
    </FormDialog>
    <FormDialog title={'重置密码 · ' + (reset?.real_name || '')} open={Boolean(reset)} onClose={() => setReset(null)} onSubmit={async values => { await api('/accounts/reset-password', { id: reset.id, password: values.password }); state.reload() }}>
      <p className="muted">重置后该账号立即退出登录，需要用新密码重新登录。</p>
      <Form.Item name="password" label="新密码" rules={password}><Input.Password maxLength={64} autoComplete="new-password" /></Form.Item>
    </FormDialog>
  </>
}
