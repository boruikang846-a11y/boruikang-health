import React, { useRef, useState } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import { Alert, Button, Card, DatePicker, Form, Input, InputNumber, Select, Space, Switch, Tag } from 'antd'
import { ImportOutlined, PlusOutlined, ReloadOutlined, UploadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { api, useLoad } from '../api'
import { DataTable, dateText, doctorOptions, FormDialog, LoadState, names, options, ownerOptions, PageTitle, required, stamp, Status } from '../ui'
import FileImportDialog from './FileImportDialog'
import { createScreeningTemplate, parseScreeningFile, screeningImportColumns } from './screeningImport'
import { fileImportResult, newImportBatch } from './fileImport'

const sources = ['ECG_NETWORK', 'EXAM', 'HEALTH_SCREENING', 'STROKE_SCREENING', 'OUTPATIENT', 'INPATIENT', 'CAMPAIGN']
const pool = ['NEW', 'HIGH_RISK', 'NON_HIGH_RISK', 'ENROLLED', 'DISCARDED']
function parseRows(text) {
  return text.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(line => {
    const cells = line.split(/\t|,|，/).map(x => x.trim())
    const [name, gender, age, phone, screenedAt, finding, category, externalId, idCardTail] = cells
    return { name, gender: gender === '男' ? 'MALE' : gender === '女' ? 'FEMALE' : ['MALE', 'FEMALE'].includes(gender) ? gender : 'UNKNOWN', age: age ? Number(age) : undefined, phone,
      screened_at: screenedAt && dayjs(screenedAt).isValid() ? dayjs(screenedAt).format('YYYY-MM-DDTHH:mm:ss') : undefined, finding, category: category || undefined, external_id: externalId || undefined, id_card_tail: idCardTail || undefined }
  })
}
export default function Screening() {
  const account = useOutletContext()
  const navigate = useNavigate()
  const [page, setPage] = useState(0)
  const [filters, setFilters] = useState({})
  const [create, setCreate] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [fileImportOpen, setFileImportOpen] = useState(false)
  const [judge, setJudge] = useState(null)
  const [enroll, setEnroll] = useState(null)
  const [result, setResult] = useState(null)
  const batch = useRef('')
  const state = useLoad(() => api('/screenings/query', { page, size: 10, ...filters }), [page, JSON.stringify(filters)])
  const orgs = useLoad(() => api('/orgs'))
  const campaigns = useLoad(() => api('/campaigns/query', { page: 0, size: 100 }))
  const staff = useLoad(() => api('/staff'))
  const clinicians = useLoad(() => api('/clinicians'))
  const filter = (key, value) => { setFilters(previous => ({ ...previous, [key]: value === '' ? undefined : value })); setPage(0) }
  const orgName = id => orgs.data?.find(x => x.id === id)?.name || '—'
  return <><PageTitle title="筛查名单与风险分层" subtitle="接收心电网络、体检和筛查名单，登记院方分层结论后建档入组，接续首次联系、邀约与到诊。" extra={<Space wrap><Button icon={<UploadOutlined />} onClick={() => setFileImportOpen(true)}>文件导入</Button><Button icon={<ImportOutlined />} onClick={() => { batch.current = newImportBatch(); setImportOpen(true) }}>粘贴导入</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => setCreate(true)}>人工录入</Button></Space>} />
    {result && <Alert className="mb" type="success" showIcon closable onClose={() => setResult(null)} message={'批次 ' + result.import_batch + '：新增 ' + result.created + ' 条，跳过 ' + result.skipped + ' 条'} description={result.messages.length ? <ul>{result.messages.map((m, i) => <li key={i}>{m}</li>)}</ul> : null} />}
    <Card><div className="toolbar"><Input.Search placeholder="搜索姓名" allowClear onSearch={value => filter('keyword', value)} style={{ width: 200 }} />
      <Select aria-label="来源" placeholder="全部来源" allowClear style={{ width: 150 }} options={options(sources)} onChange={value => filter('source_type', value)} />
      <Select aria-label="池状态" placeholder="全部状态" allowClear style={{ width: 130 }} options={options(pool)} onChange={value => filter('pool_status', value)} />
      <Select aria-label="风险" placeholder="全部风险" allowClear style={{ width: 130 }} options={options(['UNKNOWN', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])} onChange={value => filter('risk_level', value)} />
      <LoadState state={campaigns}>{data => <Select aria-label="活动" placeholder="全部活动" allowClear style={{ width: 200 }} options={data.items.map(c => ({ value: c.id, label: c.name }))} onChange={value => filter('campaign_id', value)} />}</LoadState>
      <Button icon={<ReloadOutlined />} onClick={state.reload}>刷新</Button></div>
      <DataTable state={state} page={page} setPage={setPage} columns={[
        { title: '对象', dataIndex: 'name', render: (value, row) => <><strong>{value}</strong><div className="muted">{names[row.gender]} / {row.age ?? '?'} 岁 / {row.phone}</div></> },
        { title: '来源', render: (_, row) => <>{names[row.source_type]}<div className="muted">{orgName(row.org_id)}{row.import_batch && ' / ' + row.import_batch}</div></> },
        { title: '发现', dataIndex: 'finding', render: (value, row) => <>{value}<div className="muted">{row.category} · {dateText(row.screened_at)}</div></> },
        { title: '判定', render: (_, row) => <><Status value={row.pool_status} /> <Status value={row.risk_level} />{row.non_high_risk_reason && <div className="muted">{row.non_high_risk_reason}</div>}</> },
        { title: '负责人', dataIndex: 'owner_id', render: value => staff.data?.find(x => x.user_id === value)?.real_name || '—' },
        { title: '操作', render: (_, row) => <Space>{!['ENROLLED', 'DISCARDED'].includes(row.pool_status) && <Button type="link" onClick={() => setJudge(row)}>判定</Button>}
          {['HIGH_RISK', 'NON_HIGH_RISK'].includes(row.pool_status) && <Button type="link" onClick={() => setEnroll(row)}>建档入组</Button>}
          {row.patient_id && <Link to={'/patients/' + row.patient_id}>查看档案</Link>}</Space> },
      ]} /></Card>
    <FormDialog title="人工录入筛查对象" open={create} initialValues={{ source_type: 'OUTPATIENT', gender: 'UNKNOWN', screened_at: dayjs(), owner_id: account.user_id }} onClose={() => setCreate(false)} onSubmit={async values => { await api('/screenings/create', { ...values, screened_at: stamp(values.screened_at) }); state.reload() }}>
      <div className="form-grid"><Form.Item name="name" label="姓名" rules={required}><Input maxLength={80} /></Form.Item><Form.Item name="phone" label="联系电话" rules={required}><Input maxLength={24} /></Form.Item>
        <Form.Item name="gender" label="性别" rules={required}><Select options={options(['MALE', 'FEMALE', 'UNKNOWN'])} /></Form.Item><Form.Item name="age" label="年龄"><InputNumber min={0} max={130} /></Form.Item>
        <Form.Item name="source_type" label="来源" rules={required}><Select options={options(sources)} /></Form.Item><Form.Item name="screened_at" label="发现时间" rules={required}><DatePicker showTime style={{ width: '100%' }} /></Form.Item></div>
      <Form.Item name="finding" label="发现 / 检查结论" rules={required}><Input.TextArea rows={2} maxLength={1000} /></Form.Item>
      <div className="form-grid"><Form.Item name="category" label="分类"><Input maxLength={80} /></Form.Item><Form.Item name="external_id" label="来源编号（用于去重）"><Input maxLength={80} /></Form.Item>
        <LoadState state={orgs}>{data => <Form.Item name="org_id" label="来源机构"><Select allowClear options={data.filter(o => o.active).map(o => ({ value: o.id, label: o.name }))} /></Form.Item>}</LoadState>
        <LoadState state={campaigns}>{data => <Form.Item name="campaign_id" label="所属活动"><Select allowClear options={data.items.filter(c => c.status !== 'CLOSED').map(c => ({ value: c.id, label: c.name }))} /></Form.Item>}</LoadState>
        {account.role_code === 'MANAGER' && <LoadState state={staff}>{data => <Form.Item name="owner_id" label="负责人"><Select options={ownerOptions(data)} /></Form.Item>}</LoadState>}</div>
      <Form.Item name="note" label="备注"><Input.TextArea rows={2} maxLength={1000} /></Form.Item>
    </FormDialog>
    {fileImportOpen && <FileImportDialog title="文件导入筛查名单" columns={screeningImportColumns} parseFile={parseScreeningFile} createTemplate={createScreeningTemplate} templateName="筛查名单导入模板.xlsx"
      description="首行表头，姓名、联系电话、发现结论必填。发现时间为空使用导入时间；同来源的重复来源编号会跳过。文件先预览，确认后进入待判定池。"
      initialValues={{ source_type: 'ECG_NETWORK', owner_id: account.user_id }} onClose={() => setFileImportOpen(false)} onSubmit={async (values, preview, importBatch) => {
        const response = await api('/screenings/import', { ...values, import_batch: importBatch, rows: preview.rows })
        setResult(fileImportResult(response, preview.entries)); state.reload(); return response
      }}><div className="form-grid"><Form.Item name="source_type" label="来源" rules={required}><Select options={options(sources)} /></Form.Item>
        <LoadState state={orgs}>{data => <Form.Item name="org_id" label="来源机构"><Select allowClear options={data.filter(o => o.active).map(o => ({ value: o.id, label: o.name }))} /></Form.Item>}</LoadState>
        <LoadState state={campaigns}>{data => <Form.Item name="campaign_id" label="所属活动"><Select allowClear options={data.items.filter(c => c.status !== 'CLOSED').map(c => ({ value: c.id, label: c.name }))} /></Form.Item>}</LoadState>
        {account.role_code === 'MANAGER' && <LoadState state={staff}>{data => <Form.Item name="owner_id" label="负责人"><Select options={ownerOptions(data)} /></Form.Item>}</LoadState>}
      </div></FileImportDialog>}
    <FormDialog title="粘贴导入筛查名单" width={760} open={importOpen} initialValues={{ source_type: 'ECG_NETWORK', owner_id: account.user_id }} onClose={() => setImportOpen(false)} okText="导入" onSubmit={async values => {
      const rows = parseRows(values.text || '')
      if (!rows.length) throw new Error('请粘贴至少一行数据')
      const response = await api('/screenings/import', { source_type: values.source_type, import_batch: batch.current, org_id: values.org_id, campaign_id: values.campaign_id, owner_id: values.owner_id, rows })
      setResult(response); state.reload()
    }}>
      <Alert className="mb" type="info" message="从 Excel 或表格复制后粘贴，每行一位对象" description="列顺序：姓名、性别、年龄、电话、发现时间、发现结论、分类、来源编号、证件尾号。用制表符或逗号分隔；来源编号相同的记录会跳过。批次号自动生成。" />
      <div className="form-grid"><Form.Item name="source_type" label="来源" rules={required}><Select options={options(sources)} /></Form.Item>
        <LoadState state={orgs}>{data => <Form.Item name="org_id" label="来源机构"><Select allowClear options={data.filter(o => o.active).map(o => ({ value: o.id, label: o.name }))} /></Form.Item>}</LoadState>
        <LoadState state={campaigns}>{data => <Form.Item name="campaign_id" label="所属活动"><Select allowClear options={data.items.filter(c => c.status !== 'CLOSED').map(c => ({ value: c.id, label: c.name }))} /></Form.Item>}</LoadState>
        {account.role_code === 'MANAGER' && <LoadState state={staff}>{data => <Form.Item name="owner_id" label="负责人"><Select options={ownerOptions(data)} /></Form.Item>}</LoadState>}</div>
      <Form.Item name="text" label="粘贴内容" rules={required}><Input.TextArea rows={10} placeholder={'张某\t男\t66\t13800000000\t2026-09-28 08:30\t房颤波形\t心律失常\tECG-0001'} /></Form.Item>
    </FormDialog>
    <FormDialog title={'判定：' + (judge?.name || '')} open={Boolean(judge)} initialValues={{ pool_status: 'HIGH_RISK', risk_level: judge?.risk_level === 'UNKNOWN' ? 'HIGH' : judge?.risk_level, risk_evidence: judge?.risk_evidence }} onClose={() => setJudge(null)} onSubmit={async values => { await api('/screenings/judge', { id: judge.id, version: judge.version, ...values }); state.reload() }}>
      <p className="muted">{judge?.finding}</p>
      <Form.Item name="pool_status" label="判定结果" rules={required}><Select options={options(['HIGH_RISK', 'NON_HIGH_RISK', 'DISCARDED'])} /></Form.Item>
      <Form.Item noStyle shouldUpdate={(a, b) => a.pool_status !== b.pool_status}>{({ getFieldValue }) => {
        const s = getFieldValue('pool_status')
        return <>{s !== 'DISCARDED' && <div className="form-grid"><Form.Item name="risk_level" label="风险分层" rules={required}><Select options={options(s === 'HIGH_RISK' ? ['HIGH', 'CRITICAL'] : ['LOW', 'MEDIUM'])} /></Form.Item>
          <Form.Item name="risk_evidence" label="院方判定依据" rules={s === 'HIGH_RISK' ? required : undefined}><Input maxLength={400} placeholder="心电室复核结论、医生姓名或报告编号" /></Form.Item></div>}
          {s === 'NON_HIGH_RISK' && <Form.Item name="non_high_risk_reason" label="非高危原因" rules={required}><Input maxLength={200} /></Form.Item>}
          {s === 'DISCARDED' && <Form.Item name="note" label="作废原因" rules={required}><Input maxLength={1000} /></Form.Item>}</>
      }}</Form.Item>
      {account.role_code === 'MANAGER' && <LoadState state={staff}>{data => <Form.Item name="owner_id" label="改派负责人"><Select allowClear options={ownerOptions(data)} /></Form.Item>}</LoadState>}
      <Alert type="info" message="判定只记录院方或筛查医生的结论，系统不做医学判断。高危对象建档后按 SLA 自动开出首次联系任务。" />
    </FormDialog>
    <FormDialog title={'建档入组：' + (enroll?.name || '')} open={Boolean(enroll)} initialValues={{ department: '心血管内科', disease: enroll?.category || enroll?.finding, patient_type: 'OUTPATIENT', outreach: true, owner_id: enroll?.owner_id }} onClose={() => setEnroll(null)} onSubmit={async values => { const saved = await api('/screenings/enroll', { id: enroll.id, version: enroll.version, ...values }); state.reload(); if (saved.patient_id) navigate('/patients/' + saved.patient_id) }}>
      <Alert className="mb" type="warning" message={'风险 ' + (names[enroll?.risk_level] || '') + '，来源 ' + (names[enroll?.source_type] || '')} description="建档后可在诊后健康服务中心的患者档案中统一查阅；继续在诊前中心办理首次联系和邀约，联系截止时间按风险等级的 SLA 计算。" />
      <div className="form-grid"><Form.Item name="department" label="科室" rules={required}><Input maxLength={80} /></Form.Item><Form.Item name="disease" label="病种 / 管理原因" rules={required}><Input maxLength={120} /></Form.Item>
        <Form.Item name="patient_type" label="患者类型"><Select options={options(['OUTPATIENT', 'INPATIENT', 'DISCHARGED', 'UNKNOWN'])} /></Form.Item>
        <LoadState state={clinicians}>{data => <Form.Item name="doctor_id" label="责任医生"><Select allowClear options={doctorOptions(data)} /></Form.Item>}</LoadState>
        {account.role_code === 'MANAGER' && <LoadState state={staff}>{data => <Form.Item name="owner_id" label="负责人"><Select options={ownerOptions(data)} /></Form.Item>}</LoadState>}
        <Form.Item name="existing_patient_id" label="已有档案编号（关联而非新建）"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item></div>
      <Form.Item name="outreach" label="同时开出首次联系任务" valuePropName="checked"><Switch /></Form.Item>
      <Form.Item name="note" label="内部备注"><Input.TextArea rows={2} maxLength={2000} /></Form.Item>
    </FormDialog>
  </>
}
