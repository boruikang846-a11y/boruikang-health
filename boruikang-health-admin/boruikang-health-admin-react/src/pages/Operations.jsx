import React, { useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { Alert, App, Button, Card, DatePicker, Descriptions, Form, Input, InputNumber, Modal, QRCode, Select, Space, Statistic, Switch, Table, Tag } from 'antd'
import { PlusOutlined, PrinterOutlined, ReloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import ReportArchives from './ReportArchives'
import { Campaigns, Orgs, Sla, Templates } from './Configuration'
import { ChannelTag } from './Wechat'
import { api, useLoad } from '../api'
import { DataTable, dateText, doctorOptions, FormDialog, LoadState, names, options, ownerOptions, PageTitle, required, Status } from '../ui'
import { Tabs } from 'antd'

export function Knowledge() {
  const account = useOutletContext()
  const { modal, message } = App.useApp()
  const [page, setPage] = useState(0)
  const [kind, setKind] = useState(undefined)
  const [keyword, setKeyword] = useState('')
  const [editor, setEditor] = useState(null)
  const [detail, setDetail] = useState(null)
  const state = useLoad(() => api('/knowledge/query', { page, size: 10, kind, keyword }), [page, kind, keyword])
  const clinicians = useLoad(() => api('/clinicians'))
  const canEdit = account.role_code === 'MANAGER'
  const isDoctor = account.role_code === 'DOCTOR'
  const publish = row => modal.confirm({ title: '审核发布「' + row.title + '」？', width: 560, content: <><p className="pre-wrap">{row.content}</p><p className="muted">来源：{row.source}</p><p>发布后团队可以在起草随访意见时引用。发布人记为您本人。</p></>, okText: '审核发布', cancelText: '取消',
    onOk: async () => { try { await api('/knowledge/publish', { id: row.id, version: row.version }); state.reload(); message.success('已发布') } catch (e) { message.error(e.message); throw e } } })
  const editableKinds = ['EDUCATION', 'PACKAGE']
  return <><PageTitle title={isDoctor ? '宣教审核' : '宣教与服务内容'} subtitle={isDoctor ? '运营团队整理的宣教与服务说明，经您审核后发布，团队才能在随访中引用。' : '运营团队整理内容，保存草稿后由医生在系统里审核发布。'} extra={canEdit && <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditor({ kind: 'EDUCATION', department: '综合服务' })}>新建内容</Button>} />
    <Card><div className="toolbar"><Select aria-label="知识类型" placeholder="全部类型" allowClear style={{ width: 160 }} options={options(['EDUCATION', 'PACKAGE'])} onChange={value => { setKind(value); setPage(0) }} />
      <Input.Search placeholder="搜索标题" allowClear style={{ width: 280 }} onSearch={value => { setKeyword(value); setPage(0) }} /><Button onClick={state.reload} icon={<ReloadOutlined />}>刷新</Button></div>
      <DataTable state={state} page={page} setPage={setPage} columns={[
        { title: '标题', dataIndex: 'title', render: (value, row) => <Button type="link" onClick={() => setDetail(row)}>{value}</Button> },
        { title: '类型', dataIndex: 'kind', render: value => names[value] }, { title: '科室', dataIndex: 'department' },
        { title: '版本', dataIndex: 'version', render: value => 'v' + value }, { title: '状态', dataIndex: 'status', render: value => <Status value={value} /> },
        { title: '操作', render: (_, row) => <Space>{canEdit && <Button type="link" onClick={() => setEditor(row)}>编辑</Button>}
          {isDoctor && row.status === 'DRAFT' && <Button type="link" onClick={() => publish(row)}>审核发布</Button>}
          {row.status === 'PUBLISHED' && row.reviewer_id && <span className="muted">{clinicians.data?.find(x => x.id === row.reviewer_id)?.name || ''} 审核</span>}</Space> },
      ]} /></Card>
    <Modal title={detail?.title} open={Boolean(detail)} footer={<Button onClick={() => setDetail(null)}>关闭</Button>} onCancel={() => setDetail(null)}><Tag>{names[detail?.kind]}</Tag><Tag>v{detail?.version}</Tag><p className="pre-wrap">{detail?.content}</p><p className="muted">来源：{detail?.source}</p>{detail?.reviewed_at && <p>审核发布：{clinicians.data?.find(x => x.id === detail.reviewer_id)?.name || ''} {dateText(detail.reviewed_at)}</p>}{detail?.kind === 'PACKAGE' && <p>服务周期 {detail.service_days} 天 / 随访 {detail.followup_count} 次</p>}</Modal>
    <FormDialog title={editor?.id ? '编辑并保存为草稿' : '新建知识内容'} open={Boolean(editor)} initialValues={editor} onClose={() => setEditor(null)} onSubmit={async values => {
      await api('/knowledge/save', { ...values, id: editor.id, version: editor.version }); state.reload()
    }}>
      <Form.Item name="title" label="标题" rules={required}><Input maxLength={160} /></Form.Item><div className="form-grid">
        <Form.Item name="kind" label="类型" rules={required}><Select disabled={Boolean(editor?.id)} options={options(editableKinds)} /></Form.Item><Form.Item name="department" label="适用科室" rules={required}><Input maxLength={80} /></Form.Item></div>
      <Form.Item name="content" label="内容" rules={required}><Input.TextArea rows={8} maxLength={5000} showCount /></Form.Item>
      <Form.Item name="source" label="来源" rules={required}><Input maxLength={300} placeholder="记录资料名称或出处" /></Form.Item>
      <Form.Item noStyle shouldUpdate={(a, c) => a.kind !== c.kind}>{({ getFieldValue }) => getFieldValue('kind') === 'PACKAGE' && <div className="form-grid">
        <Form.Item name="service_days" label="服务周期（天）" rules={required}><InputNumber min={1} max={730} /></Form.Item><Form.Item name="followup_count" label="约定随访次数" rules={required}><InputNumber min={1} max={365} /></Form.Item></div>}</Form.Item>
      <Alert type="info" message="保存后为草稿，医生在系统里审核发布后才能被随访引用；再次编辑会回到草稿。历史任务保留正文快照。" />
    </FormDialog>
  </>
}
export function Channels() {
  const account = useOutletContext()
  const { modal, message } = App.useApp()
  const [page, setPage] = useState(0)
  const [create, setCreate] = useState(false)
  const [detail, setDetail] = useState(null)
  const [wechat, setWechat] = useState(null)
  const [qrBusy, setQrBusy] = useState(null)
  const state = useLoad(() => account.role_code === 'MANAGER' ? api('/channels?page=' + page + '&size=10') : Promise.resolve({ items: [] }), [page])
  const staff = useLoad(() => api('/staff'))
  const clinicians = useLoad(() => api('/clinicians'))
  if (account.role_code !== 'MANAGER') return <Alert type="info" message="渠道管理由运营主管负责" />
  return <><PageTitle title="渠道管理" subtitle="维护患者来源与服务团队。介绍二维码打开患者服务介绍；微信二维码用于加企业微信好友或关注公众号。" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setCreate(true)}>创建渠道</Button>} />
    <Card><DataTable state={state} page={page} setPage={setPage} columns={[
      { title: '渠道名称', dataIndex: 'title' }, { title: '来源', dataIndex: 'source', render: value => names[value] }, { title: '科室', dataIndex: 'department' },
      { title: '状态', dataIndex: 'active', render: value => <Tag color={value ? 'green' : 'default'}>{value ? '已启用' : '已停用'}</Tag> },
      { title: '操作', render: (_, row) => <Space><Button type="link" onClick={() => setDetail(row)}>介绍二维码</Button><Button type="link" onClick={() => setWechat(row)}>微信二维码</Button><Button type="link" danger={row.active} onClick={() => modal.confirm({
        title: row.active ? '停用此渠道？' : '启用此渠道？', content: '管理后台保留渠道记录；公开介绍页面不采集患者信息。', okText: '确认', cancelText: '取消',
        onOk: async () => { try { await api('/channels/toggle', { id: row.id, active: !row.active }); state.reload() } catch (e) { message.error(e.message); throw e } },
      })}>{row.active ? '停用' : '启用'}</Button></Space> },
    ]} /></Card>
    <Modal title="患者服务介绍入口" open={Boolean(detail)} onCancel={() => setDetail(null)} footer={<Button onClick={() => setDetail(null)}>关闭</Button>}>
      <p>{detail?.title}</p>{detail && <div className="qr-wrap"><QRCode value={detail.enrollment_url} size={200} status={detail.active ? 'active' : 'expired'} /></div>}
      <p className="muted">当前二维码仅打开患者服务介绍页，不提供自助入组或个人数据采集。</p><Input.TextArea readOnly rows={3} value={detail?.enrollment_url} aria-label="介绍链接" />
      <Button className="mt" onClick={async () => { try { await navigator.clipboard.writeText(detail.enrollment_url); message.success('链接已复制') } catch { message.info('请选中上方链接手动复制') } }}>复制介绍链接</Button>
    </Modal>
    <Modal title={'微信二维码 · ' + (wechat?.title || '')} open={Boolean(wechat)} width={680} onCancel={() => setWechat(null)} footer={<Button onClick={() => setWechat(null)}>关闭</Button>}>
      <p className="muted">患者扫码加企业微信好友或关注公众号后，「企业微信」「公众号」页面里的联系人会带上本渠道。企业微信活码使用渠道负责人登记的成员账号。</p>
      <div className="integration-grid">{[['WE_COM', 'wecom_qr_url', '企业微信「联系我」'], ['WECHAT_OFFICIAL', 'official_qr_url', '公众号带参二维码']].map(([provider, field, title]) => <Card size="small" key={provider} title={title}>
        {wechat?.[field] ? wechat[field].startsWith('mock://') ? <Alert type="warning" message="模拟二维码，不能扫码" description={wechat[field]} /> : provider === 'WE_COM' ? <div className="qr-wrap"><img src={wechat[field]} alt="企业微信联系我二维码" width={180} height={180} /></div> : <div className="qr-wrap"><QRCode value={wechat[field]} size={180} /></div> : <p className="muted">尚未生成</p>}
        <Button className="mt" loading={qrBusy === provider} disabled={Boolean(qrBusy)} onClick={async () => { setQrBusy(provider); try { setWechat(await api('/channels/wechat-qr', { id: wechat.id, provider })); state.reload() } catch (e) { message.error(e.message) } finally { setQrBusy(null) } }}>{wechat?.[field] ? '重新生成' : '生成'}</Button>
      </Card>)}</div>
    </Modal>
    <FormDialog title="创建渠道" open={create} initialValues={{ source: 'OUTPATIENT', department: '综合服务' }} onClose={() => setCreate(false)} onSubmit={async values => { await api('/channels/create', values); state.reload() }}>
      <Form.Item name="title" label="渠道名称" rules={required}><Input maxLength={120} /></Form.Item><div className="form-grid">
        <Form.Item name="source" label="患者来源" rules={required}><Select options={options(['PRIMARY_CARE', 'EXAM', 'OUTPATIENT', 'DISCHARGE', 'CAMPAIGN'])} /></Form.Item>
        <Form.Item name="department" label="科室" rules={required}><Input maxLength={80} /></Form.Item></div>
      <LoadState state={staff}>{data => <div className="form-grid"><Form.Item name="doctor_id" label="责任医生" rules={required}><Select options={doctorOptions(clinicians.data)} /></Form.Item>
        <Form.Item name="owner_id" label="负责人（运营人员或护士）" rules={required}><Select options={ownerOptions(data)} /></Form.Item></div>}</LoadState>
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
  return <><PageTitle title="随访统计与运营复盘" subtitle="十项运营指标、漏斗、按人绩效与日统计都从台账计算；周报可打印交付院方。" extra={<Button icon={<PrinterOutlined />} disabled={!state.data} onClick={() => window.print()}>打印周报</Button>} />
    <Card className="mb no-print"><div className="toolbar"><DatePicker.RangePicker value={range} onChange={setRange} allowClear={false} /><Button type="primary" disabled={!range?.[0] || !range?.[1]} onClick={() => setQuery({ from_date: range[0].format('YYYY-MM-DD'), to_date: range[1].format('YYYY-MM-DD') })}>生成报表</Button><span className="muted">周报最长 93 天，指标最长一年，以北京时间统计</span></div></Card>
    <Card className="mb"><Tabs items={[{ key: 'metrics', label: '十项指标', children: <Metrics query={query} /> }, { key: 'funnel', label: '漏斗与活动', children: <Funnel query={query} /> }, { key: 'operators', label: '按人绩效', children: <Operators query={query} /> }, { key: 'daily', label: '日统计', children: <Daily /> }]} /></Card>
    <LoadState state={state}>{data => <section className="print-report"><h2>{data.from_date} 至 {data.to_date}</h2><div className="stats-grid">
      {[['随访完成率', percentage(data.completion_rate), data.completed_count + ' / ' + data.due_count + ' 项'],
        ['按时完成率', percentage(data.on_time_rate), data.on_time_count + ' / ' + data.due_count + ' 项'],
        ['异常闭环率', percentage(data.alert_close_rate), data.closed_alert_count + ' / ' + data.alert_count + ' 项'],
        ['复诊到院率', percentage(data.arrival_rate), data.arrived_count + ' / ' + data.revisit_count + ' 项']].map(([title, value, description]) => <Card key={title}><Statistic title={title} value={value} /><p className="muted">{description}</p></Card>)}
    </div><Card className="mt" title="运营人员与护士执行情况"><Table rowKey="owner_id" pagination={false} dataSource={data.nurses || []} scroll={{ x: 900 }} columns={[
      { title: '执行人', dataIndex: 'owner_name' }, { title: '应随访', dataIndex: 'due_count' }, { title: '已完成', dataIndex: 'completed_count' },
      { title: '随访完成率', dataIndex: 'completion_rate', render: percentage }, { title: '按时完成率', dataIndex: 'on_time_rate', render: percentage },
      { title: '当前逾期', dataIndex: 'overdue_count' }, { title: '待再次联系', dataIndex: 'contact_pending_count' },
      { title: '操作', render: (_,n) => <Link to={'/followups?assignee=' + n.owner_id + '&due_from=' + data.from_date + '&due_to=' + data.to_date}>查看任务</Link> },
    ]} /><p className="muted">完成率按所选截止日期区间计算；逾期和待再次联系显示当前待办。拨号失败不会增加完成数量。</p></Card>
    <Card className="mt no-print" title="接下来要处理"><Space wrap><Link to="/followups?contact=1">待再次联系 {data.contact_pending_count || 0} 项</Link><Link to="/followups?handover=1">查看待医生查收的随访记录</Link><Link to={'/revisits?pending=1&due_from=' + dayjs().subtract(1,'day').format('YYYY-MM-DD') + '&due_to=' + dayjs().subtract(1,'day').format('YYYY-MM-DD')}>昨日复诊待核实 {data.yesterday_revisit_pending_count || 0} 项</Link></Space></Card>
    <Card className="mt" title="责任医生患者概览"><Table rowKey="doctor_id" pagination={false} dataSource={data.doctors} scroll={{ x: 600 }} columns={[
      { title: '医生', dataIndex: 'doctor_name' }, { title: '在册患者', dataIndex: 'patient_count' }, { title: '应随访', dataIndex: 'due_count' }, { title: '已完成', dataIndex: 'completed_count' }, { title: '当前待处理异常', dataIndex: 'open_alert_count' },
    ]} /></Card><Card className="mt" title="报表口径"><p>应随访为区间内到期且未取消的随访任务，完成率与按时完成率使用同一任务集合。到院需有核验证据，无分母显示 --。</p><p>生成时间：{dateText(data.as_of)} / 外部投递：未发送</p><p className="muted">当前可见患者 {data.patient_count} 人。周报仅在系统内生成，未接通邮件或企业微信自动投递。</p></Card></section>}</LoadState>
    <ReportArchives query={query} />
  </>
}
const providers = { AI: 'DeepSeek 随访建议', WE_COM: '医院企业微信', WECHAT_OFFICIAL: '医院公众号', HIS: 'HIS / EMR 数据', WEEKLY_DELIVERY: '周报外部投递' }
const DEEPSEEK = 'https://api.deepseek.com/chat/completions'
const deepseekModels = [
  { value: 'deepseek-flash', label: 'deepseek-flash（建议）' },
  { value: 'deepseek-v4-pro', label: 'deepseek-v4-pro' },
]
const wechatFields = { WE_COM: ['企业 ID（CorpID）', '客户联系 Secret'], WECHAT_OFFICIAL: ['AppID', 'AppSecret'] }
/** WeCom or Official Account credentials. "已接通" appears only after a real connection test succeeded. */
function WechatIntegration({ item, canConfigure, onChanged }) {
  const { message } = App.useApp()
  const [editor, setEditor] = useState(false)
  const [busy, setBusy] = useState(false)
  const wecom = item.provider === 'WE_COM'
  const callback = window.location.origin + item.callback_path
  async function verify() {
    if (busy) return
    setBusy(true)
    try { const result = await api('/integrations/wechat/verify', { provider: item.provider }); if (result.status === 'CONNECTED') message.success('已接通：微信返回了有效凭证'); else message.error('连接失败：' + (result.last_error || '微信未返回凭证')); onChanged() }
    catch (e) { message.error(e.message) } finally { setBusy(false) }
  }
  return <Card title={providers[item.provider]} extra={<ChannelTag item={item} />}>
    <p>{wecom ? '患者加医院企业微信成员为好友后，系统同步好友关系与来源渠道。工作人员发起的消息以群发任务下发，成员在企业微信里确认后才发出。未开通会话存档，系统看不到聊天正文。' : '患者关注医院公众号后，可向其发送模板消息；患者 48 小时内有互动时可以发文字。患者来信进入「公众号」页面的待处理。'}</p>
    <Descriptions size="small" column={1} items={[
      { key: 'app', label: wechatFields[item.provider][0], children: item.app_id || '未设置' },
      { key: 'secret', label: wechatFields[item.provider][1], children: item.configured ? '已配置（不回显）' : '未配置' },
      { key: 'mode', label: '通道类型', children: item.mode === 'MOCK' ? '模拟通道（不连接微信，仅演示）' : '正式接入' },
      { key: 'callback', label: '回调地址', children: <span className="callback-url">{callback}</span> },
      { key: 'ready', label: '回调 Token / AESKey', children: item.callback_ready ? '已配置（不回显）' : wecom ? '未配置（企业微信必填）' : '未配置' },
      { key: 'verified', label: '连接测试', children: item.mode === 'MOCK' ? '模拟通道无需测试' : item.status === 'CONNECTED' ? dateText(item.verified_at) + ' 成功' : item.status === 'FAILED' ? dateText(item.verified_at) + ' 失败：' + (item.last_error || '') : item.configured ? '保存后尚未测试' : '—' },
    ]} />
    {canConfigure && <Space className="mt" wrap><Button onClick={() => setEditor(true)}>配置</Button><Button loading={busy} disabled={!item.configured || item.mode === 'MOCK'} onClick={verify}>测试连接</Button>
      <Button type="link" onClick={async () => { try { await navigator.clipboard.writeText(callback); message.success('回调地址已复制') } catch { message.info('请选中上方地址手动复制') } }}>复制回调地址</Button></Space>}
    <FormDialog title={'配置' + providers[item.provider]} open={editor} initialValues={{ app_id: item.app_id || '', mode: item.mode || 'LIVE', enabled: item.enabled }} onClose={() => setEditor(false)}
      onSubmit={async values => { await api('/integrations/wechat/save', { provider: item.provider, app_id: values.app_id, secret: values.secret || '', callback_token: values.callback_token || '', aes_key: values.aes_key || '', mode: values.mode, enabled: Boolean(values.enabled) }); onChanged() }}>
      <div className="form-grid"><Form.Item name="app_id" label={wechatFields[item.provider][0]} rules={[...required, { pattern: /^[A-Za-z0-9_-]{6,64}$/, message: '6–64 位字母、数字、下划线或短横线' }]}><Input maxLength={64} autoComplete="off" /></Form.Item>
        <Form.Item name="secret" label={wechatFields[item.provider][1] + '（留空保留原值）'}><Input.Password maxLength={200} autoComplete="new-password" /></Form.Item>
        <Form.Item name="callback_token" label="回调 Token（留空保留原值）" rules={[{ pattern: /^[A-Za-z0-9]{3,32}$/, message: '3–32 位字母数字' }]}><Input.Password maxLength={32} autoComplete="new-password" /></Form.Item>
        <Form.Item name="aes_key" label={'EncodingAESKey（留空保留原值' + (wecom ? '' : '，明文模式可不填') + '）'} rules={[{ pattern: /^[A-Za-z0-9]{43}$/, message: '43 位字母数字' }]}><Input.Password maxLength={43} autoComplete="new-password" /></Form.Item>
        <Form.Item name="mode" label="通道类型" rules={required}><Select options={[{ value: 'LIVE', label: '正式接入' }, ...(item.mock_allowed ? [{ value: 'MOCK', label: '模拟通道（仅演示）' }] : [])]} /></Form.Item>
        <Form.Item name="enabled" label="启用" valuePropName="checked"><Switch /></Form.Item></div>
      <Alert type="info" message={'把回调地址、Token、EncodingAESKey 填到' + (wecom ? '企业微信管理后台「客户联系 → API → 接收事件服务器」' : '公众号后台「基本配置 → 服务器配置」') + '，并把本服务器出口 IP 加入可信 IP / 白名单。保存不代表已接通，请再点「测试连接」。密钥只保存在服务端，不回显。'} />
    </FormDialog>
  </Card>
}
function AiBalance({ configured }) {
  const state = useLoad(() => configured ? api('/integrations/ai/balance') : Promise.resolve(null), [configured])
  return <section className="mt" aria-label="DeepSeek 账户余额"><Space wrap><h3>DeepSeek 账户余额</h3>
    <Button icon={<ReloadOutlined />} loading={configured && state.loading} disabled={!configured || state.loading} onClick={state.reload}>刷新余额</Button></Space>
    {!configured ? <p className="muted">保存 DeepSeek API Key 后可查询余额。</p> : <LoadState state={state}>{data => data && <>
      {!data.is_available && <Alert className="mb" type="warning" showIcon message="当前账户无可用余额，请在 DeepSeek 平台检查余额。" />}
      {data.balance_infos.map(item => <Descriptions key={item.currency} title={item.currency === 'CNY' ? '人民币（CNY）' : '美元（USD）'} size="small" column={1} items={[
        { key: 'total', label: '总可用余额', children: <strong>{item.total_balance} {item.currency}</strong> },
        { key: 'granted', label: '赠送余额', children: item.granted_balance + ' ' + item.currency },
        { key: 'topped', label: '充值余额', children: item.topped_up_balance + ' ' + item.currency },
      ]} />)}
      <p className="muted">查询时间：{dateText(data.checked_at)}</p>
    </>}</LoadState>}
    <p className="muted">总额包含赠送与充值余额。余额属于此 API Key 对应的 DeepSeek 账户，可能与其他应用共享。</p>
  </section>
}
function Integrations() {
  const account = useOutletContext()
  const [editor, setEditor] = useState(null)
  const state = useLoad(() => api('/integrations'))
  const canConfigure = account.role_code === 'PLATFORM_ADMIN' || account.role_code === 'MANAGER'
  return <><div className="toolbar"><Button icon={<ReloadOutlined />} onClick={state.reload}>刷新</Button></div>
    <LoadState state={state}>{data => <div className="integration-grid">{data.map(item => ['WE_COM', 'WECHAT_OFFICIAL'].includes(item.provider) ? <WechatIntegration key={item.provider} item={item} canConfigure={canConfigure} onChanged={state.reload} /> : <Card key={item.provider} title={providers[item.provider]} extra={<Tag color={item.status === 'CONFIGURED_UNVERIFIED' ? 'gold' : 'default'}>{item.provider === 'AI' ? (item.status === 'CONFIGURED_UNVERIFIED' ? '已启用 · 待验证' : '未启用') : '未接入'}</Tag>}>
      <p>{item.provider === 'AI' ? '按关联的出院小结或病历正文生成随访建议草稿。启用前不会外发。建议仍由责任医生审核，再由人工联系患者。' : item.provider === 'HIS' ? '已提供虚构医院 Mock，可在“医院数据”页联调导入。真实医院接口尚未接通，待提供接口、字段字典与授权。' : '待医院提供授权与接入资料。当前仅提供患者服务介绍，后台记录人工服务过程。'}</p>
      {item.provider === 'AI' && <><Descriptions size="small" column={1} items={[{ key: 'endpoint', label: '接口', children: item.endpoint || '未设置' }, { key: 'model', label: '模型', children: item.model_name || '未设置' }, { key: 'key', label: 'API Key', children: item.configured ? '已配置（不回显）' : '未配置' }]} />
        {canConfigure && <><Button className="mt" onClick={() => setEditor(item)}>配置 DeepSeek</Button><AiBalance configured={item.configured} /></>}</>}
    </Card>)}</div>}</LoadState>
    <FormDialog title="配置 DeepSeek" open={Boolean(editor)} initialValues={editor ? { model_name: editor.model_name || 'deepseek-flash', enabled: editor.enabled } : {}} onClose={() => setEditor(null)} onSubmit={async values => { await api('/integrations/save', { ...values, provider: 'AI', endpoint: DEEPSEEK }); state.reload() }}>
      <p>服务商：DeepSeek</p>
      <Form.Item name="model_name" label="DeepSeek 模型" rules={required}><Select options={deepseekModels} /></Form.Item>
      <Form.Item name="secret" label="DeepSeek API Key（留空保留原值）"><Input.Password autoComplete="new-password" /></Form.Item>
      <Form.Item name="enabled" label="启用随访建议生成" valuePropName="checked"><Switch /></Form.Item>
      <Alert type="info" message="启用后，随访页点击「根据病历生成随访建议」会把该任务关联报告的正文发给 DeepSeek。密钥只保存在服务端，保存本身不代表已经调用成功。" />
    </FormDialog>
  </>
}
export function Settings() {
  const account = useOutletContext()
  if (account.role_code === 'PLATFORM_ADMIN') return <><PageTitle title="接入设置" subtitle="区分配置状态与真实接通状态，按医院授权逐项联调。" /><Integrations /></>
  return <><PageTitle title="运营设置" subtitle="机构网络、活动、SLA 时限、短信话术与微信模板、外部接入，都由运营主管维护。" />
    <Tabs items={[{ key: 'orgs', label: '机构', children: <Orgs /> }, { key: 'campaigns', label: '活动', children: <Campaigns /> }, { key: 'sla', label: 'SLA 时限', children: <Sla /> }, { key: 'templates', label: '短信、话术与微信', children: <Templates /> }, { key: 'integrations', label: '外部接入', children: <Integrations /> }]} /></>
}
