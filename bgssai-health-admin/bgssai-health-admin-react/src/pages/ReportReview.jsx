import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Button, Input, Modal, Space, Tag } from 'antd'
import { api } from '../api'
import { dateText, names } from '../ui'

/** One line under a report: whether the responsible doctor has read it, and the doctor's opinion. */
export function ReportStatus({ record, doctorName }) {
  if (!record || record.record_type === 'OBSERVATION') return null
  if (!record.doctor_viewed_at) return <p className="muted">责任医生尚未查看此报告。</p>
  return <div className="doctor-opinion"><Tag color="green">医生已阅</Tag><small>{doctorName ? doctorName + ' · ' : ''}{dateText(record.doctor_viewed_at)}</small>
    {record.doctor_opinion && <p className="pre-wrap"><strong>医生意见：</strong>{record.doctor_opinion}</p>}</div>
}

/** The responsible doctor reads a report, confirms it and optionally writes an opinion for the follow-up team. */
export function ReportReviewDialog({ record, onClose, onSaved }) {
  const [opinion, setOpinion] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  useEffect(() => { setOpinion(record?.doctor_opinion || ''); setError(null) }, [record?.id])
  const viewed = Boolean(record?.doctor_viewed_at)
  async function save() {
    if (busy) return
    setBusy(true); setError(null)
    try { await api('/records/review', { id: record.id, opinion: opinion.trim() || undefined }); onSaved(); onClose() }
    catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  return <Modal title={record ? names[record.record_type] + '报告 · ' + (record.patient_name || '') : ''} open={Boolean(record)} width={720} destroyOnClose onCancel={() => !busy && onClose()}
    footer={<Space><Button disabled={busy} onClick={onClose}>关闭</Button><Button type="primary" loading={busy} disabled={viewed && !opinion.trim()} onClick={save}>{viewed ? '更新意见' : '确认已阅'}</Button></Space>}>
    {record && <>{error && <Alert className="mb" type="error" showIcon message={error} />}
      <Space wrap><Tag>{names[record.record_type]}</Tag>{record.source_system === 'HOSPITAL_MOCK' && <Tag color="gold">模拟医院接口 · {record.external_id}</Tag>}<small>{dateText(record.occurred_at)}</small>
        {record.patient_id && <Link to={'/patients/' + record.patient_id} onClick={onClose}>查看患者档案</Link>}</Space>
      <div className="report-body pre-wrap">{record.content || '（无文字内容）'}</div>
      {record.medication_cycle_days != null && <p>原记录用药周期：{record.medication_cycle_days} 天</p>}{record.next_visit_date && <p>原记录复诊日期：{record.next_visit_date}</p>}
      {viewed && <p className="muted">已于 {dateText(record.doctor_viewed_at)} 确认已阅。</p>}
      <label className="field-label" htmlFor="report-opinion">医生意见（{viewed ? '更新时必填' : '可选'}）</label>
      <div className="opinion-field"><Input.TextArea id="report-opinion" rows={4} maxLength={2000} showCount value={opinion} onChange={e => setOpinion(e.target.value)} placeholder="例如：随访重点核对服药和复诊安排；如有胸痛加重请立即就医。团队起草随访意见时会看到这条意见。" /></div>
    </>}
  </Modal>
}
