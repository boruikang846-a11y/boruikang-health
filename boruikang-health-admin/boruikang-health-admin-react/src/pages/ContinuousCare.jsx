import React, { useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { Alert, Button, Card, DatePicker, Empty, Form, Input, Select, Space, Table, Tag, Collapse } from 'antd'
import dayjs from 'dayjs'
import { api, useLoad } from '../api'
import { dateText, day, FormDialog, LoadState, names, required } from '../ui'
import './continuous-care.css'

const approvals = { PENDING: '待责任医生审核', APPROVED: '医生已审核', REJECTED: '已退回修改', REQUIRES_REVIEW: '医生或服务授权变更，需重新审核' }
const states = { ACTIVE: '持续管理中', PAUSED: '已暂停', CLOSED: '本周期已结束' }
const assessments = { ON_TRACK: '按目标推进', NEEDS_ADJUSTMENT: '需要调整', UNKNOWN: '资料不足，待评估' }
const events = { PLAN_SAVED: '保存计划版本', APPROVED: '医生审核通过', REJECTED: '医生退回', STAGE_REVIEW: '医生阶段复盘', JOURNEY_LINKED: '关联就医旅程', PAUSE: '暂停管理', RESUME: '恢复管理', CLOSE: '结束本周期' }
function snapshot(summary) {
  try { const value = JSON.parse(summary); return `基线：${value.baseline}\n目标：${value.goals}\n患者安排：${value.patient_instructions}\n复盘日期：${value.next_review_date}` } catch { return summary }
}

export function ContinuousCare({ patientId, plans, journeys, authorized, onChange }) {
  const account = useOutletContext(), doctor = account.role_code === 'DOCTOR'
  const [dialog, setDialog] = useState(null)
  const initial = dialog?.type === 'save' ? { ...dialog.plan, next_review_date: dialog.plan ? dayjs(dialog.plan.next_review_date) : undefined } : dialog?.type === 'review' ? { assessment: 'UNKNOWN' } : {}
  return <Card title="房颤连续管理" className="mb" extra={authorized && !plans.some(p => p.status !== 'CLOSED') && <Button type="primary" onClick={() => setDialog({ type: 'save' })}>建立长期计划</Button>}>
    <p className="muted">跨次就诊保留目标、计划版本和复盘。一轮就医服务结束后，长期管理继续按本计划办理。</p>
    {!authorized && <Alert type="warning" showIcon message="服务授权无效或服务已暂停，当前仅可回顾历史。" />}
    {!plans.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="尚未建立房颤长期计划" />}
    {plans.map(plan => <section key={plan.id} className="continuity-plan">
      <Space wrap><strong>房颤 · 管理周期 #{plan.id}</strong><Tag>{states[plan.status]}</Tag><Tag color={plan.approval_status === 'APPROVED' ? 'green' : 'gold'}>{approvals[plan.approval_status]}</Tag><span className="muted">第 {plan.revision} 版</span></Space>
      <div className="continuity-columns"><div><small>个人基线与待确认资料</small><p className="pre-wrap">{plan.baseline}</p></div><div><small>本阶段管理目标</small><p className="pre-wrap">{plan.goals}</p></div><div><small>患者可见服务安排 · 审核通过后开放</small><p className="pre-wrap">{plan.patient_instructions}</p><b>下次复盘：{plan.next_review_date}</b></div></div>
      <p>关联就医旅程：{plan.journey_ids.length ? plan.journey_ids.map(id => <Link className="continuity-link" key={id} to={'/journeys/' + id}>旅程 #{id}</Link>) : '待关联本次或历史就医旅程'}</p>
      {authorized && plan.status !== 'CLOSED' && <Space wrap>
        <Button onClick={() => setDialog({ type: 'save', plan })}>调整计划</Button>
        <Button onClick={() => setDialog({ type: 'link', plan })}>关联就医旅程</Button>
        {doctor && plan.approval_status !== 'APPROVED' && <><Button type="primary" onClick={() => setDialog({ type: 'approve', plan, approve: true })}>审核通过</Button><Button onClick={() => setDialog({ type: 'approve', plan, approve: false })}>退回修改</Button></>}
        {doctor && plan.approval_status === 'APPROVED' && plan.status === 'ACTIVE' && <Button type="primary" onClick={() => setDialog({ type: 'review', plan })}>阶段复盘并反馈患者</Button>}
        <Button onClick={() => setDialog({ type: 'transition', plan, action: plan.status === 'ACTIVE' ? 'PAUSE' : 'RESUME' })}>{plan.status === 'ACTIVE' ? '暂停管理' : '恢复管理'}</Button>
        {doctor && <Button onClick={() => setDialog({ type: 'transition', plan, action: 'CLOSE' })}>结束本周期</Button>}
      </Space>}
      <Collapse className="mt" items={[{ key: 'history', label: `版本与复盘记录（最近 ${plan.history.length} 条，共 ${plan.history_count} 条）`, children: <div className="continuity-history">{plan.history.map(item => <article key={item.id}><Space><Tag>{events[item.kind] || item.kind}</Tag><span>第 {item.revision} 版</span><small>{dateText(item.created_at)}</small></Space><p className="pre-wrap">{snapshot(item.summary)}</p><small>依据：{item.evidence}</small>{item.kind === 'STAGE_REVIEW' && <><p>阶段评价：{assessments[item.assessment]}</p><p>患者可见：{item.patient_message}</p></>}</article>)}</div> }]} />
    </section>)}
    {dialog && <FormDialog open key={dialog.type + (dialog.plan?.id || '') + String(dialog.approve)} width={720} initialValues={initial} title={{ save: '房颤长期管理计划', approve: dialog.approve ? '责任医生审核计划' : '退回计划', link: '关联就医旅程', review: '阶段复盘与患者反馈', transition: dialog.action === 'CLOSE' ? '结束长期管理周期' : '调整管理状态' }[dialog.type]} onClose={() => setDialog(null)} onSubmit={async values => {
      const payload = { ...values, id: dialog.plan?.id, version: dialog.plan?.version }
      if (dialog.type === 'save') { payload.patient_id = Number(patientId); payload.next_review_date = day(values.next_review_date) }
      if (dialog.type === 'approve') payload.approve = dialog.approve
      if (dialog.type === 'transition') payload.action = dialog.action
      if (dialog.type === 'review') payload.next_review_date = day(values.next_review_date)
      await api('/continuity/' + dialog.type, payload); onChange()
    }}>
      {dialog.type === 'save' && <><Form.Item label="个人基线、资料来源与待确认事项" name="baseline" rules={required}><Input.TextArea rows={3} maxLength={2000} /></Form.Item><Form.Item label="管理目标与复查要求" name="goals" rules={required}><Input.TextArea rows={3} maxLength={2000} placeholder="根据本患者报告与医嘱填写，由责任医生确认" /></Form.Item><Form.Item label="审核后提供给患者的服务安排" name="patient_instructions" rules={required}><Input.TextArea rows={3} maxLength={2000} /></Form.Item><p className="muted">保存后需要责任医生审核。系统保留上一版本和已执行记录。</p></>}
      {dialog.type === 'link' && <Form.Item label="本患者就医旅程" name="journey_id" rules={required}><Select options={journeys.filter(j => !dialog.plan.journey_ids.includes(j.id)).map(j => ({ value: j.id, label: `#${j.id} ${names[j.kind] || j.kind} · ${dateText(j.event_at)}` }))} /></Form.Item>}
      {dialog.type === 'review' && <><Form.Item label="本次复盘依据旅程（可选）" name="journey_id"><Select allowClear options={dialog.plan.journey_ids.map(id => ({ value: id, label: '旅程 #' + id }))} /></Form.Item><Form.Item label="目标变化与阶段结果" name="summary" rules={required}><Input.TextArea rows={3} maxLength={2000} /></Form.Item><Form.Item label="阶段评价" name="assessment" rules={required}><Select options={Object.entries(assessments).map(([value, label]) => ({ value, label }))} /></Form.Item><Form.Item label="提供给患者的结果与下一步" name="patient_message" rules={required}><Input.TextArea rows={3} maxLength={2000} /></Form.Item></>}
      {['save', 'review'].includes(dialog.type) && <Form.Item label="下次复盘日期（请按个案确认）" name="next_review_date" rules={required}><DatePicker disabledDate={date => date.isBefore(dayjs().startOf('day'))} /></Form.Item>}
      <Form.Item label={dialog.type === 'save' ? '建立或调整依据' : '办理依据 / 审核意见'} name="evidence" rules={required}><Input.TextArea rows={2} maxLength={2000} /></Form.Item>
    </FormDialog>}
  </Card>
}

export function PatientFeedback({ patientId, authorized }) {
  const account = useOutletContext(), [reply, setReply] = useState(null)
  const state = useLoad(() => api('/service_center/feedback_query', { patient_id: Number(patientId) }), [patientId])
  return <Card title="患者反馈与处理进度" className="mb"><LoadState state={state}>{rows => <Table rowKey="id" size="small" dataSource={rows} pagination={{ pageSize: 5 }} scroll={{ x: 640 }} columns={[
    { title: '患者反馈', dataIndex: 'content' }, { title: '工单进度', render: (_, row) => <><Tag>{({ OPEN: '待接单', ACCEPTED: '处理中', RESOLVED: '待反馈核验', CLOSED: '已闭环' })[row.status]}</Tag><Link to={'/journeys/' + row.journey_id}>办理旅程工单</Link></> },
    { title: '患者可见回复', render: (_, row) => <>{row.patient_reply || '尚未发布'}{row.replied_at && <small className="display-block">{dateText(row.replied_at)}</small>}</> },
    { title: '操作', render: (_, row) => authorized && ['RESOLVED', 'CLOSED'].includes(row.status) && (row.kind === 'CLINICAL' ? account.role_code === 'DOCTOR' : account.role_code !== 'DOCTOR') && <Button onClick={() => setReply(row)}>发布患者回复</Button> },
  ]} />}</LoadState><p className="muted">显示最近 50 条受邀 H5 反馈。临床反馈由责任医生发布回复；内部处理记录保持在后台。</p>
    {reply && <FormDialog open title="发布患者可见回复" initialValues={{ patient_reply: reply.patient_reply }} onClose={() => setReply(null)} onSubmit={async values => { await api('/service_center/feedback_reply', { id: reply.id, case_version: reply.case_version, ...values }); state.reload() }}><Form.Item label="处理结果与下一步安排" name="patient_reply" rules={required}><Input.TextArea rows={5} maxLength={2000} /></Form.Item></FormDialog>}
  </Card>
}
