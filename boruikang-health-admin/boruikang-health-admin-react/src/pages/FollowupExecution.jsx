import React, { useEffect, useRef, useState } from 'react'
import { Alert, Button, Checkbox, DatePicker, Form, Input, Modal, Select, Space, Table, Tag, Timeline } from 'antd'
import dayjs from 'dayjs'
import { api, useLoad } from '../api'
import { dateText, LoadState, required } from '../ui'

export const contactNames = { CONNECTED: '已核实并完成联系', NO_ANSWER: '未接通', BUSY: '忙线 / 不便沟通', WRONG_NUMBER: '号码问题', REFUSED: '拒绝联系', IDENTITY_UNVERIFIED: '身份未核实', FAMILY_ANSWERED: '家属接听', NOT_COOPERATIVE: '不配合', DECEASED: '已去世', OTHER: '其他' }
const methods = [{ value: 'PHONE', label: '电话' }, { value: 'IN_PERSON', label: '当面' }, { value: 'WECHAT', label: '微信' }, { value: 'MANUAL_OTHER', label: '其他人工方式' }]
export function ContactExecution({ task, busy, run }) {
  const [result, setResult] = useState(task.status === 'APPROVED' ? 'CONNECTED' : 'NO_ANSWER')
  const success = result === 'CONNECTED'
  return <div className="action-block"><h3>按步骤记录实际联系</h3>
    <p className="muted">先核实身份，再按医生审核的内容问询。未接通也要留下记录与下一次处理计划。</p>
    <Form layout="vertical" initialValues={{ method: 'PHONE', contact_at: dayjs(), recipient_role: 'PATIENT', identity_verified: false, report_reviewed: false }} onFinish={values => {
      const data = { method: values.method, evidence: values.evidence, contact_at: values.contact_at.format('YYYY-MM-DDTHH:mm:ss') }
      if (success) run('contact', { ...data, recipient_role: values.recipient_role, identity_verified: values.identity_verified, report_reviewed: Boolean(values.report_reviewed), medication_feedback: values.medication_feedback, patient_questions: values.patient_questions, satisfaction: values.satisfaction, complaint: values.complaint })
      else run('attempt', { ...data, result, reason: values.reason, next_plan: values.next_plan, next_contact_at: values.next_contact_at.format('YYYY-MM-DDTHH:mm:ss') })
    }}>
      <div className="form-grid"><Form.Item label="1. 联系结果"><Select value={result} onChange={setResult} options={Object.entries(contactNames).filter(([key]) => key !== 'CONNECTED' || task.status === 'APPROVED').map(([value, label]) => ({ value, label }))} /></Form.Item>
        <Form.Item name="method" label="联系方式" rules={required}><Select options={methods} /></Form.Item></div>
      <Form.Item name="contact_at" label="实际联系时间" rules={required}><DatePicker showTime style={{ width: '100%' }} /></Form.Item>
      {success ? <><Form.Item name="recipient_role" label="2. 联系对象" rules={required}><Select options={[{ value: 'PATIENT', label: '患者本人' }, { value: 'AUTHORIZED_CONTACT', label: '经核实的授权联系人' }]} /></Form.Item>
        <Form.Item name="identity_verified" valuePropName="checked" rules={[{ validator: (_, value) => value ? Promise.resolve() : Promise.reject(new Error('请先核实身份')) }]}><Checkbox>已核实本人或授权联系人身份</Checkbox></Form.Item>
        {task.record_id && <Form.Item name="report_reviewed" valuePropName="checked" rules={[{ validator: (_, value) => value ? Promise.resolve() : Promise.reject(new Error('请核对上方关联原报告')) }]}><Checkbox>已对照本任务关联的原报告核对问询内容</Checkbox></Form.Item>}
        <Form.Item name="medication_feedback" label="3. 原医嘱执行情况 / 用药疑问" rules={required}><Input.TextArea rows={3} maxLength={2000} placeholder="记录患者实际反馈；没有相关内容时明确写无或不适用，不自行调整用药。" /></Form.Item>
        <Form.Item name="patient_questions" label="近期反馈与需要医生解答的问题" rules={required}><Input.TextArea rows={3} maxLength={2000} placeholder="请记录原话重点；如无问题请明确记录。需要医生处理的异常请另行升级。" /></Form.Item>
      </> : <><Alert className="mb" type="warning" showIcon message="本次不计有效随访，保留原任务截止时间" />
        <Form.Item name="reason" label="2. 未完成原因" rules={required}><Input.TextArea rows={2} maxLength={1000} /></Form.Item>
        <Form.Item name="next_contact_at" label="3. 下次处理时间" rules={required}><DatePicker showTime style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="next_plan" label="下次处理计划" rules={required}><Input.TextArea rows={2} maxLength={1000} placeholder="例如核对联系方式、确认联系意愿、按约定时间再联系；拒绝联系不等于继续拨打。" /></Form.Item>
      </>}
      {success && <div className="form-grid"><Form.Item name="satisfaction" label="满意度（1-5，可选）"><Select allowClear options={[1,2,3,4,5].map(v => ({ value: v, label: v + ' 分' }))} /></Form.Item><Form.Item name="complaint" label="投诉 / 意见（可选）"><Input maxLength={1000} /></Form.Item></div>}
      <Form.Item name="evidence" label="实际联系凭证" rules={required}><Input.TextArea maxLength={1000} rows={2} placeholder="记录实际使用的联系方式、核验情况或联系记录编号，不填写虚构成功结果。" /></Form.Item>
      <Button type="primary" htmlType="submit" loading={busy}>{success ? '记录已核实的人工联系' : '保存未完成原因与下次计划'}</Button>
      <p className="muted">这里只登记你已经执行的操作，不会发起外呼或发送患者消息。</p>
    </Form>
  </div>
}
export function ContactHistory({ attempts }) {
  if (!attempts?.length) return null
  return <div className="context-block"><h3>历次联系记录</h3><Timeline items={attempts.map(a => ({ color: a.result === 'CONNECTED' ? 'green' : 'orange', children: <div>
    <Tag>{contactNames[a.result] || a.result}</Tag><small>{dateText(a.contact_at)} · {methods.find(x => x.value === a.method)?.label}</small>
    {a.reason && <p>原因：{a.reason}</p>}{a.next_contact_at && <p>下次处理：{dateText(a.next_contact_at)} · {a.next_plan}</p>}
    {a.medication_feedback && <p>原医嘱反馈：{a.medication_feedback}</p>}{a.patient_questions && <p>问题与反馈：{a.patient_questions}</p>}{a.satisfaction != null && <p>满意度 {a.satisfaction} 分{a.complaint ? '，投诉：' + a.complaint : ''}</p>}<p className="muted">凭证：{a.evidence}</p>
  </div> }))} /></div>
}
const stages = [['ENROLLMENT','入组',0],['D3','D3',3],['D7','D7',7],['D30','D30',30],['M3','三个月',90],['Y1','一年',365]]
export function ScheduleFollowups({ open, patientId, onClose, onSaved }) {
  const [patient, setPatient] = useState(patientId)
  const [keyword, setKeyword] = useState('')
  const [record, setRecord] = useState(null)
  const [nodes, setNodes] = useState([])
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const key = useRef('')
  const patients = useLoad(() => open && !patientId ? api('/patients/query', { page: 0, size: 100, keyword }) : Promise.resolve({ items: [] }), [open, patientId, keyword])
  const records = useLoad(() => open && patient ? api('/records/query', { patient_id: patient, page: 0, size: 100 }) : Promise.resolve({ items: [] }), [open, patient])
  useEffect(() => { if (open) { setPatient(patientId); setRecord(null); setNodes([]); setConfirmed(false); setError(null); key.current = crypto.randomUUID() } }, [open, patientId])
  const selected = records.data?.items.find(x => x.id === record)
  return <Modal title="结合原报告安排随访节点" open={open} width={800} onCancel={() => !busy && onClose()} destroyOnClose footer={<Space><Button onClick={onClose} disabled={busy}>取消</Button><Button type="primary" loading={busy} disabled={!patient || !record || !nodes.length || !confirmed || nodes.some(n => !n.due_at || !n.title.trim())} onClick={async () => {
    setBusy(true); setError(null)
    try { await api('/tasks/schedule', { patient_id: patient, record_id: record, request_key: key.current, nodes: nodes.map(n => ({ stage: n.stage, title: n.title, due_at: n.due_at.format('YYYY-MM-DDTHH:mm:ss') })) }); onSaved(); onClose() } catch (e) { setError(e.message) } finally { setBusy(false) }
  }}>确认日期并安排任务</Button></Space>}>
    {error && <Alert type="error" message={error} className="mb" />}
    <Alert type="info" className="mb" message="节点名称是工作安排，不代表医院已批准的临床随访时间表" description="请根据原报告和团队确认的安排选择节点、逐项核对日期；确认后生成待执行任务。" />
    {!patientId && <LoadState state={patients}>{data => <Select aria-label="安排随访的患者" className="mb" style={{ width: '100%' }} placeholder="搜索并选择患者" showSearch filterOption={false} onSearch={setKeyword} value={patient} options={data.items.map(p => ({ value: p.id, label: p.name + ' #' + p.id }))} onChange={v => { setPatient(v); setRecord(null); setNodes([]); setConfirmed(false) }} />}</LoadState>}
    <LoadState state={records}>{data => <Select aria-label="随访原报告" className="mb" style={{ width: '100%' }} placeholder="选择本次安排依据的原报告" value={record} options={data.items.filter(r => ['DISCHARGE','OUTPATIENT','EXAM'].includes(r.record_type)).map(r => ({ value: r.id, label: `#${r.id} ${dateText(r.occurred_at)} ${r.content?.slice(0,35) || ''}` }))} onChange={v => { setRecord(v); setNodes([]); setConfirmed(false) }} />}</LoadState>
    {selected && <><p className="pre-wrap context-block">{selected.content}</p><Space wrap className="mb">{stages.map(([stage,label,days]) => <Button key={stage} disabled={nodes.some(n => n.stage === stage)} onClick={() => { setNodes([...nodes, { stage, title: label + ' 随访', due_at: dayjs(selected.occurred_at).add(days,'day').hour(17).minute(0).second(0) }]); setConfirmed(false) }}>添加 {label}</Button>)}</Space>
      <Table pagination={false} rowKey="stage" dataSource={nodes} columns={[
        { title: '节点', dataIndex: 'stage' }, { title: '任务名称', render: (_,n) => <Input value={n.title} maxLength={160} onChange={e => setNodes(nodes.map(x => x.stage === n.stage ? { ...x, title:e.target.value } : x))} /> },
        { title: '确认的截止时间', render: (_,n) => <DatePicker showTime value={n.due_at} onChange={v => { setNodes(nodes.map(x => x.stage === n.stage ? { ...x, due_at:v } : x)); setConfirmed(false) }} /> },
        { title: '', render: (_,n) => <Button type="link" danger onClick={() => setNodes(nodes.filter(x => x.stage !== n.stage))}>移除</Button> },
      ]} scroll={{ x: 650 }} /><Checkbox className="mt" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}>已结合原报告和实际业务安排逐项确认日期</Checkbox></>}
  </Modal>
}
