import React, { useState } from 'react'
import { Alert, Button, Empty, Form, Modal, Space, Spin, Table, Tag } from 'antd'
import dayjs from 'dayjs'

export const names = {
  MANAGER: '运营主管', DOCTOR: '责任医生', NURSE: '健康管家', OPERATOR: '运营人员', PLATFORM_ADMIN: '平台管理员',
  FOLLOWUP: '随访', CONSULTATION: '患者咨询', ALERT: '异常处理', REVISIT: '复诊',
  PENDING: '待处理', IN_PROGRESS: '处理中', PENDING_REVIEW: '待医生审核', APPROVED: '已审核',
  REJECTED: '已退回', CONTACTED: '已触达', COMPLETED: '已完成', CANCELLED: '已取消', ESCALATED: '待医生处置',
  BOOKED: '已预约', ARRIVED: '已到院', NO_SHOW: '未到院', UNKNOWN: '待评估', LOW: '低风险',
  MEDIUM: '中风险', HIGH: '高风险', CRITICAL: '重点关注', ENROLLED: '已入组', MANAGING: '管理中',
  PAUSED: '已暂停', CLOSED: '已结案', MALE: '男', FEMALE: '女',
  SOP: '随访 SOP', EDUCATION: '健康宣教', PACKAGE: '服务包', DRAFT: '草稿', PUBLISHED: '已发布',
  OUTPATIENT: '门诊记录', DISCHARGE: '出院记录', EXAM: '体检记录', OBSERVATION: '患者自测',
  PRIMARY_CARE: '基层协作', CAMPAIGN: '筛查活动', TEMPLATE: 'SOP 模板', MANUAL: '人工编辑', AI: 'AI 辅助',
}
const colors = { HIGH: 'orange', CRITICAL: 'red', PENDING_REVIEW: 'gold', APPROVED: 'cyan', COMPLETED: 'green',
  CONTACTED: 'blue', ESCALATED: 'red', REJECTED: 'orange', LOW: 'green', PUBLISHED: 'green', P0: 'red', P1: 'orange', P2: 'blue' }
export const options = values => values.map(value => ({ value, label: names[value] || value }))
export const dateText = value => value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '—'
export function Status({ value }) { return <Tag color={colors[value]}>{names[value] || value || '—'}</Tag> }
export function PageTitle({ title, subtitle, extra }) {
  return <div className="page-title"><div><div className="eyebrow">HEALTH / 医患协作</div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{extra}</div>
}
export function LoadState({ state, children }) {
  if (state.loading) return <div className="loading"><Spin /><span>正在加载…</span></div>
  if (state.error) return <Alert type="error" showIcon message="加载失败" description={state.error} action={<Button onClick={state.reload}>重试</Button>} />
  return children(state.data)
}
export function DataTable({ state, columns, page, setPage, size = 10 }) {
  return <LoadState state={state}>{data => <Table rowKey="id" columns={columns} dataSource={data?.items || []}
    scroll={{ x: 800 }} locale={{ emptyText: <Empty description="暂无匹配记录" /> }}
    pagination={{ current: page + 1, pageSize: size, total: data?.total_size || 0, showSizeChanger: false,
      showTotal: total => '共 ' + total + ' 条', onChange: value => setPage(value - 1) }} />}</LoadState>
}
export function FormDialog({ title, open, initialValues, onClose, onSubmit, children, width = 600, okText = '保存' }) {
  const [form] = Form.useForm()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  return <Modal title={title} open={open} width={width} destroyOnClose onCancel={() => !busy && onClose()}
    footer={<Space><Button disabled={busy} onClick={onClose}>取消</Button><Button type="primary" loading={busy} onClick={() => form.submit()}>{okText}</Button></Space>}
    afterOpenChange={visible => { if (visible) { form.resetFields(); setError(null) } }}>
    {error && <Alert type="error" showIcon message={error} className="mb" />}
    <Form form={form} layout="vertical" initialValues={initialValues} disabled={busy} onFinish={async values => {
      if (busy) return
      setBusy(true); setError(null)
      try { await onSubmit(values); onClose() } catch (e) { setError(e.message) } finally { setBusy(false) }
    }}>{children}</Form>
  </Modal>
}
export const required = [{ required: true, message: '请填写此项' }]
