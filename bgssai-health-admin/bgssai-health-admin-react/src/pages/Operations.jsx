import React, { useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { Alert, App, Button, Card, DatePicker, Descriptions, Form, Input, InputNumber, Modal, QRCode, Select, Space, Statistic, Switch, Table, Tag } from 'antd'
import { PlusOutlined, PrinterOutlined, ReloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import ReportArchives from './ReportArchives'
import { Campaigns, Orgs, Sla, Templates } from './Configuration'
import { api, useLoad } from '../api'
import { DataTable, dateText, FormDialog, LoadState, names, options, PageTitle, required, Status } from '../ui'
import { Tabs } from 'antd'

export function Knowledge() {
  const account = useOutletContext()
  const { modal, message } = App.useApp()
  const [page, setPage] = useState(0)
  const [kind, setKind] = useState(undefined)
  const [keyword, setKeyword] = useState('')
  const [editor, setEditor] = useState(null)
  const [detail, setDetail] = useState(null)
  const [publish, setPublish] = useState(null)
  const state = useLoad(() => api('/knowledge/query', { page, size: 10, kind, keyword }), [page, kind, keyword])
  const clinicians = useLoad(() => api('/clinicians'))
  const canEdit = account.role_code === 'MANAGER'
  const isManager = account.role_code === 'MANAGER'
  const editableKinds = ['EDUCATION', 'PACKAGE']
  return <><PageTitle title="宣教与服务内容" subtitle="运营团队整理内容；取得院方医生审核回执后登记凭证并发布。" extra={canEdit && <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditor({ kind: 'EDUCATION', department: '综合服务' })}>新建内容</Button>} />
    <Card><div className="toolbar"><Select aria-label="知识类型" placeholder="全部类型" allowClear style={{ width: 160 }} options={options(['EDUCATION', 'PACKAGE'])} onChange={value => { setKind(value); setPage(0) }} />
      <Input.Search placeholder="搜索标题" allowClear style={{ width: 280 }} onSearch={value => { setKeyword(value); setPage(0) }} /><Button onClick={state.reload} icon={<ReloadOutlined />}>刷新</Button></div>
      <DataTable state={state} page={page} setPage={setPage} columns={[
        { title: '标题', dataIndex: 'title', render: (value, row) => <Button type="link" onClick={() => setDetail(row)}>{value}</Button> },
        { title: '类型', dataIndex: 'kind', render: value => names[value] }, { title: '科室', dataIndex: 'department' },
        { title: '版本', dataIndex: 'version', render: value => 'v' + value }, { title: '状态', dataIndex: 'status', render: value => <Status value={value} /> },
        { title: '操作', render: (_, row) => <Space>{canEdit && <Button type="link" onClick={() => setEditor(row)}>编辑</Button>}
          {isManager && row.status === 'DRAFT' && <Button type="link" onClick={() => setPublish(row)}>登记院方审核</Button>}</Space> },
      ]} /></Card>
    <Modal title={detail?.title} open={Boolean(detail)} footer={<Button onClick={() => setDetail(null)}>关闭</Button>} onCancel={() => setDetail(null)}><Tag>{names[detail?.kind]}</Tag><Tag>v{detail?.version}</Tag><p className="pre-wrap">{detail?.content}</p><p className="muted">来源：{detail?.source}</p>{detail?.review_evidence && <p>院方审核凭证：{detail.review_evidence}</p>}{detail?.kind === 'PACKAGE' && <p>服务周期 {detail.service_days} 天 / 随访 {detail.followup_count} 次</p>}</Modal>
    <FormDialog title="登记院方内容审核" open={Boolean(publish)} initialValues={{ review_channel: 'SIGNED_DOCUMENT', reviewed_at: dayjs() }} onClose={() => setPublish(null)} onSubmit={async values => { await api('/knowledge/publish', { id: publish.id, version: publish.version, ...values, reviewed_at: values.reviewed_at.format('YYYY-MM-DDTHH:mm:ss') }); state.reload() }}>
      <p>请先将“{publish?.title}”交院方医生核对。运营人员只能记录实际取得的审核结果，本操作不会自动发送文件。</p>
      <LoadState state={clinicians}>{data => <Form.Item name="reviewer_id" label="院方审核医生" rules={required}><Select options={data.map(x => ({ value: x.id, label: x.name + ' / ' + x.department }))} /></Form.Item>}</LoadState>
      <div className="form-grid"><Form.Item name="review_channel" label="审核渠道" rules={required}><Select options={[['PHONE','电话'],['IN_PERSON','当面'],['HOSPITAL_SYSTEM','医院系统'],['SIGNED_DOCUMENT','签字文件'],['MANUAL_OTHER','其他已核实方式']].map(([value,label]) => ({value,label}))} /></Form.Item><Form.Item name="reviewed_at" label="实际审核时间" rules={required}><DatePicker showTime style={{ width: '100%' }} /></Form.Item></div>
      <Form.Item name="review_evidence" label="审核凭证 / 记录编号" rules={required}><Input.TextArea maxLength={1000} rows={3} /></Form.Item>
    </FormDialog>
    <FormDialog title={editor?.id ? '编辑并保存为草稿' : '新建知识内容'} open={Boolean(editor)} initialValues={editor} onClose={() => setEditor(null)} onSubmit={async values => {
      await api('/knowledge/save', { ...values, id: editor.id, version: editor.version }); state.reload()
    }}>
      <Form.Item name="title" label="标题" rules={required}><Input maxLength={160} /></Form.Item><div className="form-grid">
        <Form.Item name="kind" label="类型" rules={required}><Select disabled={Boolean(editor?.id)} options={options(editableKinds)} /></Form.Item><Form.Item name="department" label="适用科室" rules={required}><Input maxLength={80} /></Form.Item></div>
      <Form.Item name="content" label="内容" rules={required}><Input.TextArea rows={8} maxLength={5000} showCount /></Form.Item>
      <Form.Item name="source" label="来源 / 审批依据" rules={required}><Input maxLength={300} placeholder="记录资料名称或医院审核依据" /></Form.Item>
      <Form.Item noStyle shouldUpdate={(a, c) => a.kind !== c.kind}>{({ getFieldValue }) => getFieldValue('kind') === 'PACKAGE' && <div className="form-grid">
        <Form.Item name="service_days" label="服务周期（天）" rules={required}><InputNumber min={1} max={730} /></Form.Item><Form.Item name="followup_count" label="约定随访次数" rules={required}><InputNumber min={1} max={365} /></Form.Item></div>}</Form.Item>
      <Alert type="info" message="先保存草稿，再取得院方审核回执并登记凭证。资料是随访问询的可选参考，历史任务保留正文快照。" />
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
  const clinicians = useLoad(() => api('/clinicians'))
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
      <LoadState state={staff}>{data => <div className="form-grid"><Form.Item name="doctor_id" label="院方责任医生（无需登录）" rules={required}><Select options={(clinicians.data || []).map(x => ({ value: x.id, label: x.name + ' / ' + x.department }))} /></Form.Item>
        <Form.Item name="owner_id" label="我方运营负责人" rules={required}><Select options={data.filter(x => ['OPERATOR', 'MANAGER'].includes(x.role_code)).map(x => ({ value: x.user_id, label: x.real_name }))} /></Form.Item></div>}</LoadState>
    </FormDialog>
  </>
}
const percentage = value => value == null ? '--' : value + '%'
function Metrics({ query }) {
  const state = useLoad(() => api('/reports/metrics', query), [JSON.stringify(query)])
  const dictionary = useLoad(() => api('/reports/metric-dictionary'))
  return <><LoadState state={state}>{data => <div className="metric-grid">{data.metrics.map(m => <div key={m.code} className={'metric-box' + (m.met == null ? '' : m.met ? ' met' : ' missed')}><small>{m.name}</small><div className="value">{m.denominator == null ? m.numerator : percentage(m.rate)}</div><small>{m.denominator == null ? '在管' : m.numerator + ' / ' + m.denominator}{m.target != null && ' · 目标 ' + (m.lower_is_better ? '≤' : '≥') + m.target + '%'}</small></div>)}</div>}</LoadState>
    <Card className="mt" title="指标字典" size="small"><LoadState state={dictionary}>{rows => <Table size="small" rowKey="code" pagination={false} dataSource={rows} scroll={{ x: 900 }} columns={[{ title: '指标', dataIndex: 'name' }, { title: '分子', dataIndex: 'numerator' }, { title: '分母', dataIndex: 'denominator' }, { title: '排除', dataIndex: 'exclusions' }, { title: '目标', dataIndex: 'target', render: (v, r) => v == null ? '—' : (r.lower_is_better ? '≤' : '≥') + v + '%' }]} />}</LoadState></Card></>
}
function Funnel({ query }) {
  const state = useLoad(() => api('/reports/funnel', query), [JSON.stringify(query)])
  const steps = [['screened', '检出'], ['high_risk', '高危'], ['enrolled', '建档'], ['invited', '邀约'], ['reached', '触达'], ['willing', '愿意'], ['booked', '预约'], ['arrived', '到院'], ['effective_arrival', '有效到诊'], ['package_activated', '入组'], ['followup_done', '随访完成'], ['revisit_done', '复诊完成']]
  return <LoadState state={state}>{data => <><div className="funnel">{steps.map(([key, label], i) => <React.Fragment key={key}>{i > 0 && <span className="funnel-arrow">→</span>}<div className="funnel-step"><b>{data[key]}</b><small>{label}</small></div></React.Fragment>)}</div>
    <Table className="mt" size="small" rowKey="campaign_id" pagination={false} dataSource={data.campaigns} scroll={{ x: 900 }} columns={[{ title: '活动', dataIndex: 'name', render: (v, r) => <>{v} <Status value={r.status} /></> }, { title: '目标', dataIndex: 'target_count' }, { title: '检出', dataIndex: 'screened' }, { title: '高危', dataIndex: 'high_risk' }, { title: '建档', dataIndex: 'enrolled' }, { title: '邀约', dataIndex: 'invited' }, { title: '触达', dataIndex: 'reached' }, { title: '愿意', dataIndex: 'willing' }, { title: '预约', dataIndex: 'booked' }, { title: '到院', dataIndex: 'arrived' }]} /></>}</LoadState>
}
function Operators({ query }) {
  const state = useLoad(() => api('/reports/operators', query), [JSON.stringify(query)])
  return <LoadState state={state}>{rows => <Table rowKey="owner_id" pagination={false} dataSource={rows} scroll={{ x: 1100 }} columns={[
    { title: '运营人员', dataIndex: 'owner_name' }, { title: '负责患者', dataIndex: 'managed' }, { title: '高风险', dataIndex: 'high_risk' }, { title: '邀约 / 触达', render: (_, r) => r.invited_patients + ' / ' + r.reached_patients }, { title: '触达率', dataIndex: 'reach_rate', render: percentage },
    { title: '预约', dataIndex: 'booked' }, { title: '有效到诊', dataIndex: 'effective_arrived' }, { title: '到诊转化率', dataIndex: 'arrival_rate', render: percentage }, { title: '随访', render: (_, r) => r.followup_done + ' / ' + r.followup_due }, { title: '随访完成率', dataIndex: 'followup_rate', render: percentage },
    { title: '逾期', dataIndex: 'overdue' }, { title: '失访', dataIndex: 'lost' }, { title: '评级', dataIndex: 'rating', render: v => <Tag color={v === '优秀' ? 'green' : v === '良好' ? 'blue' : v === '合格' ? 'gold' : 'red'}>{v}</Tag> },
  ]} />}</LoadState>
}
function Daily() {
  const [date, setDate] = useState(dayjs())
  const state = useLoad(() => api('/reports/daily', { date: date.format('YYYY-MM-DD') }), [date.format('YYYY-MM-DD')])
  const items = [['new_screenings', '新入池'], ['new_patients', '新建档'], ['invitations', '邀约次数'], ['reached', '触达次数'], ['appointments_booked', '新预约'], ['arrived', '到院'], ['followups_due', '应随访'], ['followups_done', '完成随访'], ['alerts_opened', '新异常'], ['alerts_closed', '关闭异常'], ['messages_logged', '已发消息'], ['enrollments_activated', '激活服务'], ['overdue_open', '累计逾期']]
  return <><div className="toolbar"><DatePicker value={date} onChange={v => v && setDate(v)} allowClear={false} /></div><LoadState state={state}>{data => <div className="metric-grid">{items.map(([key, label]) => <div key={key} className="metric-box"><small>{label}</small><div className="value">{data[key]}</div></div>)}</div>}</LoadState></>
}
export function Reports() {
  const [range, setRange] = useState([dayjs().subtract(6, 'day'), dayjs()])
  const [query, setQuery] = useState({ from_date: range[0].format('YYYY-MM-DD'), to_date: range[1].format('YYYY-MM-DD') })
  const state = useLoad(() => api('/reports/weekly', query), [JSON.stringify(query)])
  return <><PageTitle title="随访统计与运营复盘" subtitle="十项运营指标、漏斗、按人绩效与日统计都从台账计算；周报交付给院方。" extra={<Button icon={<PrinterOutlined />} disabled={!state.data} onClick={() => window.print()}>打印周报</Button>} />
    <Card className="mb no-print"><div className="toolbar"><DatePicker.RangePicker value={range} onChange={setRange} allowClear={false} /><Button type="primary" disabled={!range?.[0] || !range?.[1]} onClick={() => setQuery({ from_date: range[0].format('YYYY-MM-DD'), to_date: range[1].format('YYYY-MM-DD') })}>生成报表</Button><span className="muted">周报最长 93 天，指标最长一年，以北京时间统计</span></div></Card>
    <Card className="mb"><Tabs items={[{ key: 'metrics', label: '十项指标', children: <Metrics query={query} /> }, { key: 'funnel', label: '漏斗与活动', children: <Funnel query={query} /> }, { key: 'operators', label: '按人绩效', children: <Operators query={query} /> }, { key: 'daily', label: '日统计', children: <Daily /> }]} /></Card>
    <LoadState state={state}>{data => <section className="print-report"><h2>{data.from_date} 至 {data.to_date}</h2><div className="stats-grid">
      {[['随访完成率', percentage(data.completion_rate), data.completed_count + ' / ' + data.due_count + ' 项'],
        ['按时完成率', percentage(data.on_time_rate), data.on_time_count + ' / ' + data.due_count + ' 项'],
        ['异常闭环率', percentage(data.alert_close_rate), data.closed_alert_count + ' / ' + data.alert_count + ' 项'],
        ['复诊到院率', percentage(data.arrival_rate), data.arrived_count + ' / ' + data.revisit_count + ' 项']].map(([title, value, description]) => <Card key={title}><Statistic title={title} value={value} /><p className="muted">{description}</p></Card>)}
    </div><Card className="mt" title="我方运营执行情况"><Table rowKey="owner_id" pagination={false} dataSource={data.nurses || []} scroll={{ x: 900 }} columns={[
      { title: '执行人', dataIndex: 'owner_name' }, { title: '应随访', dataIndex: 'due_count' }, { title: '已完成', dataIndex: 'completed_count' },
      { title: '随访完成率', dataIndex: 'completion_rate', render: percentage }, { title: '按时完成率', dataIndex: 'on_time_rate', render: percentage },
      { title: '当前逾期', dataIndex: 'overdue_count' }, { title: '待再次联系', dataIndex: 'contact_pending_count' },
      { title: '操作', render: (_,n) => <Link to={'/followups?assignee=' + n.owner_id + '&due_from=' + data.from_date + '&due_to=' + data.to_date}>查看任务</Link> },
    ]} /><p className="muted">完成率按所选截止日期区间计算；逾期和待再次联系显示当前待办。拨号失败不会增加完成数量。</p></Card>
    <Card className="mt no-print" title="接下来要处理"><Space wrap><Link to="/followups?contact=1">待再次联系 {data.contact_pending_count || 0} 项</Link><Link to="/followups?handover=1">查看待院方确认的随访记录</Link><Link to={'/revisits?pending=1&due_from=' + dayjs().subtract(1,'day').format('YYYY-MM-DD') + '&due_to=' + dayjs().subtract(1,'day').format('YYYY-MM-DD')}>昨日复诊待核实 {data.yesterday_revisit_pending_count || 0} 项</Link></Space></Card>
    <Card className="mt" title="院方医生关联患者概览"><Table rowKey="doctor_id" pagination={false} dataSource={data.doctors} scroll={{ x: 600 }} columns={[
      { title: '医生', dataIndex: 'doctor_name' }, { title: '在册患者', dataIndex: 'patient_count' }, { title: '应随访', dataIndex: 'due_count' }, { title: '已完成', dataIndex: 'completed_count' }, { title: '当前待处理异常', dataIndex: 'open_alert_count' },
    ]} /></Card><Card className="mt" title="报表口径"><p>应随访为区间内到期且未取消的随访任务，完成率与按时完成率使用同一任务集合。到院需有核验证据，无分母显示 --。</p><p>生成时间：{dateText(data.as_of)} / 外部投递：未发送</p><p className="muted">当前可见患者 {data.patient_count} 人。周报仅在系统内生成，未接通邮件或企业微信自动投递。</p></Card></section>}</LoadState>
    <ReportArchives query={query} />
  </>
}
const providers = { AI: 'AI 随访草稿', WE_COM: '医院企业微信', WECHAT_OFFICIAL: '医院公众号', HIS: 'HIS / EMR 数据', WEEKLY_DELIVERY: '周报外部投递' }
function Integrations() {
  const account = useOutletContext()
  const [editor, setEditor] = useState(null)
  const state = useLoad(() => api('/integrations'))
  return <><div className="toolbar"><Button icon={<ReloadOutlined />} onClick={state.reload}>刷新</Button></div>
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
export function Settings() {
  const account = useOutletContext()
  if (account.role_code === 'PLATFORM_ADMIN') return <><PageTitle title="接入设置" subtitle="区分配置状态与真实接通状态，按医院授权逐项联调。" /><Integrations /></>
  return <><PageTitle title="运营设置" subtitle="机构网络、活动、SLA 时限、短信话术模板与外部接入，都由运营主管维护。" />
    <Tabs items={[{ key: 'orgs', label: '机构', children: <Orgs /> }, { key: 'campaigns', label: '活动', children: <Campaigns /> }, { key: 'sla', label: 'SLA 时限', children: <Sla /> }, { key: 'templates', label: '短信与话术', children: <Templates /> }, { key: 'integrations', label: '外部接入', children: <Integrations /> }]} /></>
}
