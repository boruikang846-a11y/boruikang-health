import React, { useEffect, useState } from 'react'
import { Alert, Button, Empty, Form, Modal, Space, Spin, Table, Tag } from 'antd'
import dayjs from 'dayjs'

export const names = {
  MANAGER: '运营主管', DOCTOR: '医生', NURSE: '护士', OPERATOR: '运营人员', PLATFORM_ADMIN: '平台管理员',
  FOLLOWUP: '随访', CONSULTATION: '患者咨询', ALERT: '异常处理', REVISIT: '复诊', OUTREACH: '首次联系',
  PENDING: '待处理', IN_PROGRESS: '处理中', PENDING_REVIEW: '待医生审核', APPROVED: '已审核',
  REJECTED: '已退回', CONTACTED: '已触达', COMPLETED: '已完成', CANCELLED: '已取消', ESCALATED: '待医生处置',
  BOOKED: '已预约', REMINDED: '已提醒', ARRIVED: '已到院', NO_SHOW: '未到院', UNKNOWN: '待评估', LOW: '低风险',
  MEDIUM: '中风险', HIGH: '高风险', CRITICAL: '重点关注', ENROLLED: '已入组', MANAGING: '管理中', REVISIT_DUE: '待复诊',
  PAUSED: '已暂停', CLOSED: '已结案', TRANSFERRED: '已转出', LOST: '已失访', MALE: '男', FEMALE: '女',
  EDUCATION: '健康宣教', PACKAGE: '服务包', DRAFT: '草稿', PUBLISHED: '已发布', ACTIVE: '启用中', RETIRED: '已停用',
  OUTPATIENT: '门诊', DISCHARGE: '出院', EXAM: '体检', OBSERVATION: '指标记录', INPATIENT: '住院', DISCHARGED: '已出院',
  PRIMARY_CARE: '基层协作', CAMPAIGN: '活动', TEMPLATE: '基础问询模板', MANUAL: '人工录入', AI: 'AI 随访建议',
  ECG_NETWORK: '心电网络', COMMUNITY_SCREENING: '社区筛查', PRIMARY_REFERRAL: '基层转诊', HEALTH_SCREENING: '健康筛查', STROKE_SCREENING: '卒中筛查',
  NEW: '待判定', HIGH_RISK: '高危', NON_HIGH_RISK: '非高危', DISCARDED: '已作废',
  WILLING: '愿意到院', UNDECIDED: '犹豫', REFUSED: '拒绝', ALREADY_TREATED: '已在本院就诊', TREATED_ELSEWHERE: '已在外院就诊', NO_ANSWER: '无人接听', BUSY: '占线', WRONG_NUMBER: '号码错误', FAMILY_ANSWERED: '家属接听', DECEASED: '已去世', OTHER: '其他',
  PHONE: '电话', SMS: '短信', WECHAT: '微信', IN_PERSON: '当面', PHONE_NOTE: '电话留言', SCRIPT: '话术',
  SELF: '自行到院', FAMILY_ESCORT: '家属陪同', GREEN_CHANNEL: '绿色通道', STAFF_BOOKED: '团队代约', SELF_BOOKED: '患者自约', ONLINE: '线上预约',
  SPECIALIST_CLINIC: '专病门诊', DISTANCE: '路程远', COST: '费用顾虑', NO_SLOT: '无号源', FORGOT: '忘记', EXTERNAL_HOSPITAL: '去了外院', ILLNESS: '身体不适',
  OUTPATIENT_TREATED: '门诊处理', EXAM_ORDERED: '已开检查', ADMITTED: '收治入院', REFERRED: '已转诊', NO_ACTION: '无需处理',
  STAFF: '团队登记', PATIENT_REPORT: '患者上报', ECG: '心电预警', LOST_CONTACT: '失联', RULE: '规则触发',
  EMERGENCY: '急诊', OBSERVE: '继续观察', FALSE_ALARM: '误报',
  BASIC: '基础', STANDARD: '标准', PREMIUM: '重点', POST_VISIT: '门诊后', POST_DISCHARGE: '出院后', POST_SURGERY: '术后', SCREENING: '筛查后', LONG_TERM: '长期管理',
  PENDING_ACTIVATION: '待激活', EXPIRED: '已到期', UPGRADED: '已升级',
  OUTBOUND: '转出', INBOUND: '转入', UPWARD: '上转', DOWNWARD: '下转', LATERAL: '平转', INITIATED: '已发起', ACCEPTED: '已接收', FEEDBACK_RECORDED: '已反馈',
  HOSPITAL: '医院', BRANCH: '分中心', COMMUNITY: '社区', TOWNSHIP: '乡镇卫生院', VILLAGE: '村卫生室', EXAM_CENTER: '体检中心',
  DAILY_INVITATION: '日常邀约', EARLY_INTERVENTION: '早干预', CLINIC_EVENT: '义诊', PLANNED: '计划中',
  FIRST_CONTACT: '首次联系', URGENT: '紧急', FAMILY: '家属', ARRIVAL_REMINDER: '到诊提醒', FOLLOWUP_REMINDER: '随访提醒', REVISIT_REMINDER: '复诊提醒', HESITANT: '犹豫', COMPLAINT: '投诉',
  STOPPED: '已停用', HOSPITAL_RECORD: '院方记录', GOOD: '依从好', PARTIAL: '部分依从', POOR: '依从差',
  DEVICE: '设备', HOME_VISIT: '上门', STAFF_ENTRY: '团队代录',
  WE_COM: '企业微信', WECHAT_OFFICIAL: '公众号', MP_TEMPLATE: '公众号模板消息', WELCOME: '欢迎语', REMOVED: '已失联',
  SENDING: '发送中', SENT: '已发出', PENDING_CONFIRM: '待成员确认', FAILED: '失败', RECEIVED: '待处理', HANDLED: '已处理',
}
const colors = { HIGH: 'orange', CRITICAL: 'red', PENDING_REVIEW: 'gold', APPROVED: 'cyan', COMPLETED: 'green',
  CONTACTED: 'blue', ESCALATED: 'red', REJECTED: 'orange', LOW: 'green', PUBLISHED: 'green', P0: 'red', P1: 'orange', P2: 'blue',
  HIGH_RISK: 'red', NON_HIGH_RISK: 'green', DISCARDED: 'default', ENROLLED: 'blue', WILLING: 'green', REFUSED: 'orange', NO_ANSWER: 'default',
  ARRIVED: 'green', NO_SHOW: 'orange', CANCELLED: 'default', REMINDED: 'cyan', BOOKED: 'blue', ACTIVE: 'green', RETIRED: 'default', EXPIRED: 'orange', LOST: 'red', TRANSFERRED: 'default',
  MANAGING: 'green', REVISIT_DUE: 'gold', OUTREACH: 'purple', LOST_CONTACT: 'red', FEEDBACK_RECORDED: 'cyan', ACCEPTED: 'blue', INITIATED: 'gold', PENDING_ACTIVATION: 'gold', UPGRADED: 'cyan',
  SENDING: 'blue', SENT: 'green', PENDING_CONFIRM: 'gold', FAILED: 'red', RECEIVED: 'orange', HANDLED: 'default' }
export const options = values => values.map(value => ({ value, label: names[value] || value }))
export const dateText = value => value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '—'
export const dayText = value => value ? dayjs(value).format('YYYY-MM-DD') : '—'
export const money = cents => cents == null ? '—' : cents === 0 ? '免费' : (cents / 100).toFixed(2) + ' 元'
export const stamp = value => value ? value.format('YYYY-MM-DDTHH:mm:ss') : undefined
export const day = value => value ? value.format('YYYY-MM-DD') : undefined
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
  // Reset as soon as the dialog opens (not after the open animation), so early typing is never wiped.
  useEffect(() => { if (open) { form.resetFields(); setError(null) } }, [open])
  return <Modal title={title} open={open} width={width} destroyOnClose onCancel={() => !busy && onClose()}
    footer={<Space><Button disabled={busy} onClick={onClose}>取消</Button><Button type="primary" loading={busy} onClick={() => form.submit()}>{okText}</Button></Space>}>
    {error && <Alert type="error" showIcon message={error} className="mb" />}
    <Form form={form} layout="vertical" initialValues={initialValues} disabled={busy} onFinish={async values => {
      if (busy) return
      setBusy(true); setError(null)
      try { await onSubmit(values); onClose() } catch (e) { setError(e.message) } finally { setBusy(false) }
    }}>{children}</Form>
  </Modal>
}
export const required = [{ required: true, message: '请填写此项' }]
/** Eases a metric from 0 to its value on mount; strings and reduced-motion users get the value directly. */
export function CountUp({ value, duration = 900 }) {
  const target = Number(value)
  const animate = Number.isFinite(target) && typeof window !== 'undefined' && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const [shown, setShown] = useState(animate ? 0 : target)
  useEffect(() => {
    if (!animate) { setShown(target); return }
    let frame
    const start = performance.now()
    const tick = now => {
      const progress = Math.min(1, (now - start) / duration)
      setShown(Math.round(target * (1 - Math.pow(1 - progress, 3))))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target])
  return <span className="count-up">{Number.isFinite(target) ? shown.toLocaleString() : value}</span>
}
export const countUp = value => <CountUp value={value} />
/** Enabled doctor accounts for pickers; disabled doctors stay resolvable by id for history. */
export const doctorOptions = clinicians => (clinicians || []).filter(x => x.active).map(x => ({ value: x.id, label: x.name + (x.department ? ' / ' + x.department : '') }))
/** Patient owners: operators, nurses or the operations manager. */
export const ownerOptions = staff => (staff || []).filter(x => ['OPERATOR', 'NURSE', 'MANAGER'].includes(x.role_code)).map(x => ({ value: x.user_id, label: x.real_name + ' / ' + names[x.role_code] }))
