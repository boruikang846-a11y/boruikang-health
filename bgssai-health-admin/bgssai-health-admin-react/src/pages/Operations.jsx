import React, { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Alert, App, Button, Card, DatePicker, Descriptions, Form, Input, InputNumber, Modal, QRCode, Select, Space, Statistic, Switch, Table, Tag } from 'antd'
import { PlusOutlined, PrinterOutlined, ReloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { api, useLoad } from '../api'
import { DataTable, dateText, FormDialog, LoadState, names, options, PageTitle, required, Status } from '../ui'

export function Knowledge() {
  const account = useOutletContext()
  const { modal, message } = App.useApp()
  const [page, setPage] = useState(0)
  const [kind, setKind] = useState(undefined)
  const [keyword, setKeyword] = useState('')
  const [editor, setEditor] = useState(null)
  const [detail, setDetail] = useState(null)
  const state = useLoad(() => api('/knowledge/query', { page, size: 10, kind, keyword }), [page, kind, keyword])
  const canEdit = ['MANAGER', 'DOCTOR'].includes(account.role_code)
  const isManager = account.role_code === 'MANAGER'
  const editableKinds = isManager ? ['SOP', 'EDUCATION', 'PACKAGE'] : ['EDUCATION', 'PACKAGE']
  return <><PageTitle title="知识与 SOP" subtitle="运营团队制定、发布服务 SOP 并培训医生；医生按流程协作，审核宣教与服务包内容。" extra={canEdit && <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditor({ kind: isManager ? 'SOP' : 'EDUCATION', department: '综合服务' })}>新建内容</Button>} />
    <Card><div className="toolbar"><Select aria-label="知识类型" placeholder="全部类型" allowClear style={{ width: 160 }} options={options(['SOP', 'EDUCATION', 'PACKAGE'])} onChange={value => { setKind(value); setPage(0) }} />
      <Input.Search placeholder="搜索标题" allowClear style={{ width: 280 }} onSearch={value => { setKeyword(value); setPage(0) }} /><Button onClick={state.reload} icon={<ReloadOutlined />}>刷新</Button></div>
      <DataTable state={state} page={page} setPage={setPage} columns={[
        { title: '标题', dataIndex: 'title', render: (value, row) => <Button type="link" onClick={() => setDetail(row)}>{value}</Button> },
        { title: '类型', dataIndex: 'kind', render: value => names[value] }, { title: '科室', dataIndex: 'department' },
        { title: '版本', dataIndex: 'version', render: value => 'v' + value }, { title: '状态', dataIndex: 'status', render: value => <Status value={value} /> },
        { title: '操作', render: (_, row) => <Space>{canEdit && (row.kind !== 'SOP' || isManager) && <Button type="link" onClick={() => setEditor(row)}>编辑</Button>}
          {(row.kind === 'SOP' ? isManager : account.role_code === 'DOCTOR') && row.status === 'DRAFT' && <Button type="link" onClick={() => modal.confirm({ title: row.kind === 'SOP' ? '发布此服务 SOP 版本？' : '审核并发布此版本？', content: <div><p>{row.title}</p><p className="pre-wrap">{row.content}</p><small>来源：{row.source}</small></div>, okText: '确认发布', cancelText: '取消', onOk: async () => { try { await api('/knowledge/publish', { id: row.id, version: row.version }); state.reload() } catch (e) { message.error(e.message); throw e } } })}>{row.kind === 'SOP' ? '发布 SOP' : '审核发布'}</Button>}</Space> },
      ]} /></Card>
    <Modal title={detail?.title} open={Boolean(detail)} footer={<Button onClick={() => setDetail(null)}>关闭</Button>} onCancel={() => setDetail(null)}><Tag>{names[detail?.kind]}</Tag><Tag>v{detail?.version}</Tag><p className="pre-wrap">{detail?.content}</p><p className="muted">来源：{detail?.source}</p>{detail?.kind === 'PACKAGE' && <p>服务周期 {detail.service_days} 天 / 随访 {detail.followup_count} 次</p>}</Modal>
    <FormDialog title={editor?.id ? '编辑并保存为草稿' : '新建知识内容'} open={Boolean(editor)} initialValues={editor} onClose={() => setEditor(null)} onSubmit={async values => {
      await api('/knowledge/save', { ...values, id: editor.id, version: editor.version }); state.reload()
    }}>
      <Form.Item name="title" label="标题" rules={required}><Input maxLength={160} /></Form.Item><div className="form-grid">
        <Form.Item name="kind" label="类型" rules={required}><Select disabled={Boolean(editor?.id)} options={options(editableKinds)} /></Form.Item><Form.Item name="department" label="适用科室" rules={required}><Input maxLength={80} /></Form.Item></div>
      <Form.Item name="content" label="内容" rules={required}><Input.TextArea rows={8} maxLength={5000} showCount /></Form.Item>
      <Form.Item name="source" label="来源 / 审批依据" rules={required}><Input maxLength={300} placeholder="记录资料名称或医院审核依据" /></Form.Item>
      <Form.Item noStyle shouldUpdate={(a, c) => a.kind !== c.kind}>{({ getFieldValue }) => getFieldValue('kind') === 'PACKAGE' && <div className="form-grid">
        <Form.Item name="service_days" label="服务周期（天）" rules={required}><InputNumber min={1} max={730} /></Form.Item><Form.Item name="followup_count" label="约定随访次数" rules={required}><InputNumber min={1} max={365} /></Form.Item></div>}</Form.Item>
      <Alert type="info" message="保存后进入草稿状态：SOP 由运营团队发布，宣教与服务包由医生审核发布。历史任务保留正文快照。" />
    </FormDialog>
  </>
}
export function Channels() {
  const account = useOutletContext()
  const { modal, message } = App.useApp()
  const [page, setPage] = useState(0)
  const [create, setCreate] = useState(false)
  const [detail, setDetail] = useState(null)
  const state = useLoad(() => account.role_code === 'MANAGER' ? api('/channels?page=' + page + '&size=10') : Promise.resolve({ items: [] }), [page])
  const staff = useLoad(() => api('/staff'))
  if (account.role_code !== 'MANAGER') return <Alert type="info" message="渠道管理由运营主管负责" />
  return <><PageTitle title="渠道管理" subtitle="维护患者来源与服务团队；当前二维码仅用于展示患者服务介绍。" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setCreate(true)}>创建渠道</Button>} />
    <Card><DataTable state={state} page={page} setPage={setPage} columns={[
      { title: '渠道名称', dataIndex: 'title' }, { title: '来源', dataIndex: 'source', render: value => names[value] }, { title: '科室', dataIndex: 'department' },
      { title: '状态', dataIndex: 'active', render: value => <Tag color={value ? 'green' : 'default'}>{value ? '已启用' : '已停用'}</Tag> },
      { title: '操作', render: (_, row) => <Space><Button type="link" onClick={() => setDetail(row)}>介绍二维码</Button><Button type="link" danger={row.active} onClick={() => modal.confirm({
        title: row.active ? '停用此渠道？' : '启用此渠道？', content: '管理后台保留渠道记录；公开介绍页面不采集患者信息。', okText: '确认', cancelText: '取消',
        onOk: async () => { try { await api('/channels/toggle', { id: row.id, active: !row.active }); state.reload() } catch (e) { message.error(e.message); throw e } },
      })}>{row.active ? '停用' : '启用'}</Button></Space> },
    ]} /></Card>
    <Modal title="患者服务介绍入口" open={Boolean(detail)} onCancel={() => setDetail(null)} footer={<Button onClick={() => setDetail(null)}>关闭</Button>}>
      <p>{detail?.title}</p>{detail && <div className="qr-wrap"><QRCode value={detail.enrollment_url} size={200} status={detail.active ? 'active' : 'expired'} /></div>}
      <p className="muted">当前二维码仅打开患者服务介绍页，不提供自助入组或个人数据采集。</p><Input.TextArea readOnly rows={3} value={detail?.enrollment_url} aria-label="介绍链接" />
      <Button className="mt" onClick={async () => { try { await navigator.clipboard.writeText(detail.enrollment_url); message.success('链接已复制') } catch { message.info('请选中上方链接手动复制') } }}>复制介绍链接</Button>
    </Modal>
    <FormDialog title="创建渠道" open={create} initialValues={{ source: 'OUTPATIENT', department: '综合服务' }} onClose={() => setCreate(false)} onSubmit={async values => { await api('/channels/create', values); state.reload() }}>
      <Form.Item name="title" label="渠道名称" rules={required}><Input maxLength={120} /></Form.Item><div className="form-grid">
        <Form.Item name="source" label="患者来源" rules={required}><Select options={options(['PRIMARY_CARE', 'EXAM', 'OUTPATIENT', 'DISCHARGE', 'CAMPAIGN'])} /></Form.Item>
        <Form.Item name="department" label="科室" rules={required}><Input maxLength={80} /></Form.Item></div>
      <LoadState state={staff}>{data => <div className="form-grid"><Form.Item name="doctor_id" label="责任医生" rules={required}><Select options={data.filter(x => x.role_code === 'DOCTOR').map(x => ({ value: x.user_id, label: x.real_name }))} /></Form.Item>
        <Form.Item name="owner_id" label="负责管家 / 运营" rules={required}><Select options={data.filter(x => ['NURSE', 'OPERATOR', 'MANAGER'].includes(x.role_code)).map(x => ({ value: x.user_id, label: x.real_name }))} /></Form.Item></div>}</LoadState>
    </FormDialog>
  </>
}
export function Reports() {
  const [range, setRange] = useState([dayjs().subtract(6, 'day'), dayjs()])
  const [query, setQuery] = useState({ from_date: range[0].format('YYYY-MM-DD'), to_date: range[1].format('YYYY-MM-DD') })
  const state = useLoad(() => api('/reports/weekly', query), [JSON.stringify(query)])
  const percentage = value => value == null ? '--' : value + '%'
  return <><PageTitle title="医生周报" subtitle="统一统计口径，核对服务履约与复诊结果。" extra={<Button icon={<PrinterOutlined />} disabled={!state.data} onClick={() => window.print()}>打印周报</Button>} />
    <Card className="mb no-print"><div className="toolbar"><DatePicker.RangePicker value={range} onChange={setRange} allowClear={false} /><Button type="primary" disabled={!range?.[0] || !range?.[1]} onClick={() => setQuery({ from_date: range[0].format('YYYY-MM-DD'), to_date: range[1].format('YYYY-MM-DD') })}>生成报表</Button><span className="muted">最长 93 天，以北京时间统计</span></div></Card>
    <LoadState state={state}>{data => <section className="print-report"><h2>{data.from_date} 至 {data.to_date}</h2><div className="stats-grid">
      {[['随访完成率', percentage(data.completion_rate), data.completed_count + ' / ' + data.due_count + ' 项'],
        ['按时完成率', percentage(data.on_time_rate), data.on_time_count + ' / ' + data.due_count + ' 项'],
        ['异常闭环率', percentage(data.alert_close_rate), data.closed_alert_count + ' / ' + data.alert_count + ' 项'],
        ['复诊到院率', percentage(data.arrival_rate), data.arrived_count + ' / ' + data.revisit_count + ' 项']].map(([title, value, description]) => <Card key={title}><Statistic title={title} value={value} /><p className="muted">{description}</p></Card>)}
    </div><Card className="mt" title="责任医生服务概览"><Table rowKey="doctor_id" pagination={false} dataSource={data.doctors} scroll={{ x: 600 }} columns={[
      { title: '医生', dataIndex: 'doctor_name' }, { title: '在册患者', dataIndex: 'patient_count' }, { title: '应随访', dataIndex: 'due_count' }, { title: '已完成', dataIndex: 'completed_count' }, { title: '当前待处理异常', dataIndex: 'open_alert_count' },
    ]} /></Card><Card className="mt" title="报表口径"><p>应随访为区间内到期且未取消的随访任务，完成率与按时完成率使用同一任务集合。到院需有核验证据，无分母显示 --。</p><p>生成时间：{dateText(data.as_of)} / 外部投递：未发送</p><p className="muted">当前可见患者 {data.patient_count} 人。周报仅在系统内生成，未接通邮件或企业微信自动投递。</p></Card></section>}</LoadState>
  </>
}
const providers = { AI: 'AI 随访草稿', WE_COM: '医院企业微信', WECHAT_OFFICIAL: '医院公众号', HIS: 'HIS / EMR 数据', WEEKLY_DELIVERY: '周报外部投递' }
export function Settings() {
  const account = useOutletContext()
  const [editor, setEditor] = useState(null)
  const state = useLoad(() => api('/integrations'))
  return <><PageTitle title="接入设置" subtitle="区分配置状态与真实接通状态，按医院授权逐项联调。" extra={<Button icon={<ReloadOutlined />} onClick={state.reload}>刷新</Button>} />
    <LoadState state={state}>{data => <div className="integration-grid">{data.map(item => <Card key={item.provider} title={providers[item.provider]} extra={<Tag color={item.status === 'CONFIGURED_UNVERIFIED' ? 'gold' : 'default'}>{item.status === 'CONFIGURED_UNVERIFIED' ? '已配置 · 待联调' : '未接入'}</Tag>}>
      <p>{item.provider === 'AI' ? '辅助整理问询草稿。所有建议仍由责任医生审核、人工联系。' : item.provider === 'HIS' ? '已提供虚构医院 Mock，可在“医院数据”页联调导入。真实医院接口尚未接通，待提供接口、字段字典与授权。' : '待医院提供授权与接入资料。当前仅提供患者服务介绍，后台记录人工服务过程。'}</p>
      {item.provider === 'AI' && <><Descriptions size="small" column={1} items={[{ key: 'model', label: '模型', children: item.model_name || '未设置' }, { key: 'key', label: 'API Key', children: item.configured ? '已配置（不回显）' : '未配置' }]} />
        {account.role_code === 'PLATFORM_ADMIN' && <Button className="mt" onClick={() => setEditor(item)}>配置 AI 接入</Button>}</>}
    </Card>)}</div>}</LoadState>
    <FormDialog title="配置 AI 接入" open={Boolean(editor)} initialValues={editor ? { provider: 'AI', endpoint: editor.endpoint, model_name: editor.model_name, enabled: editor.enabled } : {}} onClose={() => setEditor(null)} onSubmit={async values => { await api('/integrations/save', { ...values, provider: 'AI' }); state.reload() }}>
      <Form.Item name="endpoint" label="TokenHub 端点" rules={required}><Select options={['https://dev.user.bgssai-tokenhub.cn/v1/chat/completions', 'https://www.bgssai-tokenhub.cn/v1/chat/completions'].map(value => ({ value, label: value }))} /></Form.Item>
      <Form.Item name="model_name" label="模型名称" rules={required}><Input maxLength={120} /></Form.Item><Form.Item name="secret" label="API Key（留空保留原值）"><Input.Password autoComplete="new-password" /></Form.Item>
      <Form.Item name="enabled" label="启用 AI 草稿" valuePropName="checked"><Switch /></Form.Item>
      <Alert type="info" message="保存配置不代表已通过调用联调。密钥不会在接口响应中回显。" />
    </FormDialog>
  </>
}
