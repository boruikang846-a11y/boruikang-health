import React, { useRef, useState } from 'react'
import { Link, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom'
import { Alert, App, Button, Card, DatePicker, Descriptions, Drawer, Form, Input, InputNumber, Select, Space, Switch, Tag } from 'antd'
import { ImportOutlined, PlusOutlined, ReloadOutlined, UploadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { api, useLoad } from '../api'
import { DataTable, dateText, doctorOptions, FormDialog, LoadState, names, options, ownerOptions, PageTitle, required, stamp, Status } from '../ui'
import EcgGradingGuide, { EcgGrade, ecgGuidance } from './EcgGradingGuide'
import FileImportDialog from './FileImportDialog'
import { createScreeningTemplate, parseScreeningFile, screeningImportColumns } from './screeningImport'
import { downloadScreeningCsv } from './screeningCenterModel'
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
export default function Screening({ scope = {}, title = "筛查名单与风险分层", onChanged }) {
  const account = useOutletContext()
  const { message } = App.useApp()
  const [detail, setDetail] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [filterForm] = Form.useForm()
  const changed = () => { state.reload(); onChanged?.() }
  const exportRows = async () => {
    setExporting(true)
    try {
      const rows = []
      for (let offset = 0; ; offset++) {
        const data = await api('/screenings/query', { ...filters, ...scope, page: offset, size: 100 })
        rows.push(...data.items)
        if (rows.length >= data.total_size || !data.items.length) break
      }
      downloadScreeningCsv(rows, title)
      message.success('已导出当前筛选结果 ' + rows.length + ' 条')
    } catch (e) { message.error(e.message) } finally { setExporting(false) }
  }
  const navigate = useNavigate()
  const [search] = useSearchParams()
  const [page, setPage] = useState(0)
  const [filters, setFilters] = useState(() => ({ screened_from: search.get("screened_from") || undefined, screened_to: search.get("screened_to") || undefined, pool_status: search.get("pool_status") || undefined }))
  const [create, setCreate] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [fileImportOpen, setFileImportOpen] = useState(false)
  const [judge, setJudge] = useState(null)
  const [enroll, setEnroll] = useState(null)
  const [result, setResult] = useState(null)
  const batch = useRef('')
  const state = useLoad(() => api('/screenings/query', { page, size: 10, ...filters, ...scope }), [page, JSON.stringify(filters), JSON.stringify(scope)])
  const orgs = useLoad(() => api('/orgs'))
  const campaigns = useLoad(() => api('/campaigns/query', { page: 0, size: 100 }))
  const staff = useLoad(() => api('/staff'))
  const clinicians = useLoad(() => api('/clinicians'))
  const orgName = id => orgs.data?.find(x => x.id === id)?.name || '—'
  return <><PageTitle title={title} subtitle="接收心电网络、体检和筛查名单，登记院方分层结论后建档入组，接续首次联系、邀约与到诊。" extra={<Space wrap><Button loading={exporting} onClick={exportRows}>导出筛选结果</Button><Button icon={<UploadOutlined />} onClick={() => setFileImportOpen(true)}>文件导入</Button><Button icon={<ImportOutlined />} onClick={() => { batch.current = newImportBatch(); setImportOpen(true) }}>粘贴导入</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => setCreate(true)}>人工录入</Button></Space>} />
    {result && <Alert className="mb" type="success" showIcon closable onClose={() => setResult(null)} message={'批次 ' + result.import_batch + '：新增 ' + result.created + ' 条，跳过 ' + result.skipped + ' 条'} description={result.messages.length ? <ul>{result.messages.map((m, i) => <li key={i}>{m}</li>)}</ul> : null} />}
    <Card className="screening-filter-card"><Form form={filterForm} initialValues={{ ...filters, dates: filters.screened_from && filters.screened_to ? [dayjs(filters.screened_from), dayjs(filters.screened_to)] : undefined }} layout="vertical" onFinish={values => { const { dates, ...rest } = values; setFilters({ ...rest, screened_from: dates?.[0]?.format('YYYY-MM-DD'), screened_to: dates?.[1]?.format('YYYY-MM-DD') }); setPage(0) }}>
      <div className="screening-filter-grid">
        <Form.Item name="keyword" label="姓名"><Input allowClear placeholder="请输入姓名" /></Form.Item>
        <Form.Item name="phone" label="手机号"><Input allowClear maxLength={24} placeholder="请输入手机号" /></Form.Item>
        <Form.Item name="id_card_tail" label="证件尾号"><Input allowClear maxLength={8} placeholder="仅查询留存的证件尾号" /></Form.Item>
        <Form.Item name="dates" label="检出日期"><DatePicker.RangePicker style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="pool_status" label="处理状态"><Select allowClear placeholder="全部状态" options={options(pool)} /></Form.Item>
        {!scope.risk_level && <Form.Item name="risk_level" label="风险等级"><Select allowClear placeholder="全部风险" options={options(['UNKNOWN', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])} /></Form.Item>}
        {!scope.source_type && <Form.Item name="source_type" label="检出来源"><Select allowClear placeholder="全部来源" options={options(sources)} /></Form.Item>}
        <div className="screening-filter-actions"><Button htmlType="submit" type="primary">查询</Button><Button onClick={() => { filterForm.setFieldsValue({ keyword: undefined, phone: undefined, id_card_tail: undefined, dates: undefined, pool_status: undefined, risk_level: undefined, source_type: undefined }); setFilters({}); setPage(0) }}>重置</Button><Button icon={<ReloadOutlined />} onClick={state.reload}>刷新</Button></div>
      </div>
    </Form></Card>
    <Card>
      <DataTable state={state} page={page} setPage={setPage} columns={[
        { title: '对象', dataIndex: 'name', render: (value, row) => <><Button type="link" className="screening-name" onClick={() => setDetail(row)}>{value}</Button><div className="muted">{names[row.gender]} / {row.age ?? '?'} 岁<div>{row.phone || '电话待补充'}</div><small>证件尾号 {row.id_card_tail || '未留存'}</small></div></> },
        { title: '来源', render: (_, row) => <>{names[row.source_type]}<div className="muted">{orgName(row.org_id)}{row.import_batch && ' / ' + row.import_batch}</div></> },
        { title: '发现', dataIndex: 'finding', render: (value, row) => <>{value}<div className="muted">{row.category} · {dateText(row.screened_at)}</div></> },
        { title: '本次心电分级', render: (_, row) => <><EcgGrade value={row.ecg_grade} /><div className="muted">{ecgGuidance[row.ecg_grade] || '核对院方报告；不自动按普通处理'}</div></> },
        { title: '患者风险 / 处理状态', render: (_, row) => <><Status value={row.pool_status} /> <Status value={row.risk_level} />{row.non_high_risk_reason && <div className="muted">{row.non_high_risk_reason}</div>}</> },
        { title: '负责人', dataIndex: 'owner_id', render: value => staff.data?.find(x => x.user_id === value)?.real_name || '—' },
        { title: '操作', render: (_, row) => <Space wrap><Button type="link" onClick={() => setDetail(row)}>详情</Button>{!['ENROLLED', 'DISCARDED'].includes(row.pool_status) && <Button type="link" onClick={() => setJudge(row)}>判定</Button>}
          {['HIGH_RISK', 'NON_HIGH_RISK'].includes(row.pool_status) && <Button type="link" onClick={() => setEnroll(row)}>建档入组</Button>}
          {row.patient_id && <Link to={'/patients/' + row.patient_id}>查看档案</Link>}</Space> },
      ]} /></Card>
    <Drawer title={(detail?.name || '') + ' · 筛查详情'} width={600} open={Boolean(detail)} onClose={() => setDetail(null)}>
      {detail && <><Space><Status value={detail.risk_level} /><Status value={detail.pool_status} /></Space><Descriptions className="mt" column={1} bordered size="small" items={[
        { key: 'source', label: '检出来源', children: names[detail.source_type] }, { key: 'org', label: '检出机构', children: orgName(detail.org_id) },
        { key: 'date', label: '检出时间', children: dateText(detail.screened_at) }, { key: 'phone', label: '联系电话', children: detail.phone || '待补充' },
        { key: 'finding', label: '检查结论 / 健康指标', children: detail.finding }, { key: 'category', label: '分类', children: detail.category || '待归类' },
        { key: 'ecg', label: '本次心电分级', children: <EcgGrade value={detail.ecg_grade} /> }, { key: 'ecg_evidence', label: '心电分级依据', children: detail.ecg_evidence || '未登记' },
        { key: 'evidence', label: '院方判定依据', children: detail.risk_evidence || '待补充' }, { key: 'judge', label: '判定时间', children: dateText(detail.judged_at) },
        { key: 'owner', label: '执行负责人', children: staff.data?.find(x => x.user_id === detail.owner_id)?.real_name || '待分配' },
        { key: 'note', label: '备注', children: detail.note || '—' }, { key: 'external', label: '来源编号', children: detail.external_id || '—' },
      ]} />{detail.patient_id && <p><Link to={'/after-care?step=patients&patient=' + detail.patient_id}>打开患者档案 →</Link></p>}</>}
    </Drawer>
    <FormDialog title="人工录入筛查对象" open={create} initialValues={{ source_type: scope.source_type || 'OUTPATIENT', gender: 'UNKNOWN', screened_at: dayjs(), owner_id: account.user_id }} onClose={() => setCreate(false)} onSubmit={async values => { await api('/screenings/create', { ...values, screened_at: stamp(values.screened_at) }); changed() }}>
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
      initialValues={{ source_type: scope.source_type || 'ECG_NETWORK', owner_id: account.user_id }} onClose={() => setFileImportOpen(false)} onSubmit={async (values, preview, importBatch) => {
        const response = await api('/screenings/import', { ...values, import_batch: importBatch, rows: preview.rows })
        setResult(fileImportResult(response, preview.entries)); changed(); return response
      }}><div className="form-grid"><Form.Item name="source_type" label="来源" rules={required}><Select options={options(sources)} /></Form.Item>
        <LoadState state={orgs}>{data => <Form.Item name="org_id" label="来源机构"><Select allowClear options={data.filter(o => o.active).map(o => ({ value: o.id, label: o.name }))} /></Form.Item>}</LoadState>
        <LoadState state={campaigns}>{data => <Form.Item name="campaign_id" label="所属活动"><Select allowClear options={data.items.filter(c => c.status !== 'CLOSED').map(c => ({ value: c.id, label: c.name }))} /></Form.Item>}</LoadState>
        {account.role_code === 'MANAGER' && <LoadState state={staff}>{data => <Form.Item name="owner_id" label="负责人"><Select options={ownerOptions(data)} /></Form.Item>}</LoadState>}
      </div></FileImportDialog>}
    <FormDialog title="粘贴导入筛查名单" width={760} open={importOpen} initialValues={{ source_type: scope.source_type || 'ECG_NETWORK', owner_id: account.user_id }} onClose={() => setImportOpen(false)} okText="导入" onSubmit={async values => {
      const rows = parseRows(values.text || '')
      if (!rows.length) throw new Error('请粘贴至少一行数据')
      const response = await api('/screenings/import', { source_type: values.source_type, import_batch: batch.current, org_id: values.org_id, campaign_id: values.campaign_id, owner_id: values.owner_id, rows })
      setResult(response); changed()
    }}>
      <Alert className="mb" type="info" message="从 Excel 或表格复制后粘贴，每行一位对象" description="列顺序：姓名、性别、年龄、电话、发现时间、发现结论、分类、来源编号、证件尾号。用制表符或逗号分隔；来源编号相同的记录会跳过。批次号自动生成。" />
      <div className="form-grid"><Form.Item name="source_type" label="来源" rules={required}><Select options={options(sources)} /></Form.Item>
        <LoadState state={orgs}>{data => <Form.Item name="org_id" label="来源机构"><Select allowClear options={data.filter(o => o.active).map(o => ({ value: o.id, label: o.name }))} /></Form.Item>}</LoadState>
        <LoadState state={campaigns}>{data => <Form.Item name="campaign_id" label="所属活动"><Select allowClear options={data.items.filter(c => c.status !== 'CLOSED').map(c => ({ value: c.id, label: c.name }))} /></Form.Item>}</LoadState>
        {account.role_code === 'MANAGER' && <LoadState state={staff}>{data => <Form.Item name="owner_id" label="负责人"><Select options={ownerOptions(data)} /></Form.Item>}</LoadState>}</div>
      <Form.Item name="text" label="粘贴内容" rules={required}><Input.TextArea rows={10} placeholder={'张某\t男\t66\t13800000000\t2026-09-28 08:30\t房颤波形\t心律失常\tECG-0001'} /></Form.Item>
    </FormDialog>
    <FormDialog title={'判定：' + (judge?.name || '')} open={Boolean(judge)} initialValues={{ pool_status: 'HIGH_RISK', risk_level: judge?.risk_level === 'UNKNOWN' ? 'HIGH' : judge?.risk_level, risk_evidence: judge?.risk_evidence, ecg_grade: judge?.ecg_grade, ecg_scope: judge?.ecg_scope, ecg_evidence: judge?.ecg_evidence }} onClose={() => setJudge(null)} onSubmit={async values => { await api('/screenings/judge', { id: judge.id, version: judge.version, ...values }); changed() }}>
      <p className="muted">{judge?.finding}</p>
      <EcgGradingGuide />
      <Form.Item name="ecg_grade" label="本次心电图危险分级（登记院方已审核报告）"><Select placeholder="未取得报告结论时保持空白 / 待核实" options={[{ value: 'CRITICAL', label: '危急' }, { value: 'WARNING', label: '预警' }, { value: 'NORMAL', label: '普通' }]} /></Form.Item>
      <Form.Item noStyle shouldUpdate={(a,b) => a.ecg_grade !== b.ecg_grade}>{({ getFieldValue }) => getFieldValue('ecg_grade') && <>
        <Form.Item name="ecg_scope" label="原报告适用范围" rules={required}><Select options={[{ value: 'REST_12_LEAD', label: '10 秒有效静息、12 导联及以上远程心电图' }, { value: 'ARRHYTHMIA_REFERENCE', label: '单导联或其他多导联，仅心律失常参照分级' }]} /></Form.Item>
        <Form.Item name="ecg_evidence" label="报告编号、院方审核人及具体分级依据" rules={required}><Input.TextArea maxLength={1000} rows={3} placeholder="核对本次原报告、导联与采样质量，以及适用的症状、速率、持续时间等条件；不是自行诊断。" /></Form.Item>
      </>}</Form.Item>
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
    <FormDialog title={'建档入组：' + (enroll?.name || '')} open={Boolean(enroll)} initialValues={{ department: '心血管内科', disease: enroll?.category || enroll?.finding, patient_type: 'OUTPATIENT', outreach: true, owner_id: enroll?.owner_id }} onClose={() => setEnroll(null)} onSubmit={async values => { const saved = await api('/screenings/enroll', { id: enroll.id, version: enroll.version, ...values }); changed(); if (saved.patient_id) navigate('/patients/' + saved.patient_id) }}>
      <Alert className="mb" type="warning" message={'风险 ' + (names[enroll?.risk_level] || '') + '，来源 ' + (names[enroll?.source_type] || '')} description="建档后可在诊后主动干预的患者档案中统一查阅；继续在诊前中心办理首次联系和邀约，联系截止时间按风险等级的 SLA 计算。" />
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
