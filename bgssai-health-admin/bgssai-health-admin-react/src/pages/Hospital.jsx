import React, { useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { Alert, Button, Card, Collapse, Descriptions, Form, Select, Space, Tag } from 'antd'
import { CloudDownloadOutlined, EyeOutlined } from '@ant-design/icons'
import { api, useLoad } from '../api'
import { dateText, LoadState, names, PageTitle, required } from '../ui'

const scenarios = [{ value: 'NORMAL', label: '正常 · 2 位患者 / 3 份报告' }, { value: 'EMPTY', label: '空数据 · 暂无新增记录' }, { value: 'UNAVAILABLE', label: '故障 · 医院接口不可用' }]
export default function Hospital() {
  const account = useOutletContext()
  const state = useLoad(() => api('/hospital/status'))
  const staff = useLoad(() => account.role_code === 'MANAGER' ? api('/staff') : Promise.resolve([]))
  const [scenario, setScenario] = useState('NORMAL')
  const [preview, setPreview] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(null)
  const [form] = Form.useForm()
  const execute = async (action, values = {}) => {
    if (busy) return
    setBusy(action); setError(null); setResult(null)
    if (action === 'preview') setPreview(null)
    try {
      const data = await api(action === 'preview' ? '/hospital/mock/query' : '/hospital/sync', { scenario, ...values })
      if (action === 'preview') setPreview(data); else setResult(data)
    } catch (e) { setError(e.message) } finally { setBusy(null) }
  }
  return <><PageTitle title="医院数据" subtitle="患者及病历以医院接口为主要来源，人工录入作为补充。当前使用虚构医院 Mock 联调。" />
    <LoadState state={state}>{status => <>
      <Alert className="mb" showIcon type="info" message={status.mode === 'MOCK' ? '模拟医院接口已启用 · 真实医院尚未接通' : '医院 Mock 已禁用 · 真实医院尚未接通'} description="医院患者信息 → 门诊 / 出院报告 → 导入患者档案 → 关联随访与复诊任务。所有模拟数据明确标记来源，重复同步会跳过相同记录。" />
      {account.role_code !== 'MANAGER' ? <Card><p>医院数据预览与同步由运营主管负责。导入后，医生与护理团队按患者归属查看报告并开展随访。</p></Card> : status.mode === 'MOCK' && <>
        <Card className="mb" title="1. 预览医院模拟响应" extra={<Tag color="gold">HOSPITAL_MOCK</Tag>}><div className="toolbar"><Select aria-label="医院 Mock 场景" value={scenario} disabled={Boolean(busy)} style={{ width: 285, maxWidth: '100%' }} options={scenarios} onChange={value => { setScenario(value); setPreview(null); setResult(null); setError(null) }} /><Button icon={<EyeOutlined />} loading={busy === 'preview'} disabled={Boolean(busy)} onClick={() => execute('preview')}>预览数据</Button></div>
          <p className="muted">模拟接口包含医院患者编号和原始报告编号；仅使用虚构信息，不从真实医院读取患者数据。</p>
          {preview && (preview.patients.length === 0 ? <Alert message="医院模拟响应为空，本次没有可导入数据。" type="info" /> : <Collapse items={preview.patients.map(patient => ({ key: patient.hospital_patient_id, label: <Space wrap><strong>{patient.name}</strong><Tag>{patient.hospital_patient_id}</Tag><span>{patient.records.length} 份报告</span></Space>, children: <><Descriptions size="small" column={2} items={[{ key: 'department', label: '科室', children: patient.department }, { key: 'disease', label: '原记录病种', children: patient.disease }]} />{patient.records.map(record => <div className="context-block" key={record.external_id}><Tag>{names[record.record_type]}</Tag><Tag>{record.external_id}</Tag><p>{dateText(record.occurred_at)}</p><p className="pre-wrap">{record.content}</p><p>原记录用药周期：{record.medication_cycle_days == null ? '未提供' : record.medication_cycle_days + ' 天'} / 建议复诊日期：{record.next_visit_date || '未提供'}</p></div>)}</> }))} />)}
        </Card>
        <Card title="2. 选择服务负责人并同步"><Form form={form} layout="vertical" onFinish={values => execute('sync', values)}><LoadState state={staff}>{data => <div className="form-grid"><Form.Item label="责任医生" name="doctor_id" rules={required}><Select disabled={Boolean(busy)} options={data.filter(x => x.role_code === 'DOCTOR').map(x => ({ value: x.user_id, label: x.real_name }))} /></Form.Item><Form.Item label="负责管家 / 运营" name="owner_id" rules={required}><Select disabled={Boolean(busy)} options={data.filter(x => ['MANAGER', 'NURSE', 'OPERATOR'].includes(x.role_code)).map(x => ({ value: x.user_id, label: x.real_name }))} /></Form.Item></div>}</LoadState><p className="muted">负责人仅用于新档案；已有档案的分派与临床审核保持原记录。默认次日创建核对报告的团队待办，不推断临床随访时间。</p><Button type="primary" htmlType="submit" icon={<CloudDownloadOutlined />} loading={busy === 'sync'} disabled={Boolean(busy) || !staff.data}>同步模拟医院数据</Button></Form></Card>
      </>}
      {error && <Alert className="mt" type="error" showIcon message={error} description="本次操作未完成，请核对场景后重试。失败不会产生部分导入数据。" />}
      {result && <Card className="mt" title="本次同步结果" extra={<Tag color="gold">模拟数据</Tag>}><Descriptions column={{ xs: 1, sm: 2, lg: 4 }} items={[
        { key: 'created', label: '新增患者', children: result.created_patients }, { key: 'existing', label: '已有患者', children: result.existing_patients }, { key: 'records', label: '新增报告', children: result.created_records }, { key: 'skipped', label: '跳过重复报告', children: result.skipped_records },
      ]} /><Space wrap className="mt">{result.patient_ids.map(id => <Link key={id} to={'/patients/' + id}>查看档案 #{id} →</Link>)}</Space>{result.patient_ids.length === 0 && <p>本次没有新增数据。</p>}</Card>}
    </>}</LoadState>
  </>
}
