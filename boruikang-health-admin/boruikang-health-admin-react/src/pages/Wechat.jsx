import React, { useEffect, useRef, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { Alert, App, Badge, Button, Card, Drawer, Form, Input, Modal, Segmented, Select, Space, Switch, Tag } from 'antd'
import { ReloadOutlined, SyncOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { api, useLoad } from '../api'
import { DataTable, dateText, FormDialog, LoadState, names, PageTitle, required, Status } from '../ui'

/** WeCom and the Official Account are separate menu pages; each says what its own channel can and cannot do. */
export const channelPages = {
  WE_COM: { path: '/wecom', title: '企业微信', who: '企业微信客户', join: '加企业微信好友',
    subtitle: '患者加医院企业微信成员为好友后，在这里核实身份并绑定患者档案。消息以群发任务下发，成员在企业微信里确认后才发出。',
    events: [{ value: 'FOLLOW', label: '加好友' }, { value: 'UNFOLLOW', label: '删好友' }], mockId: 'wm-demo-0006' },
  WECHAT_OFFICIAL: { path: '/official-account', title: '公众号', who: '公众号粉丝', join: '关注公众号',
    subtitle: '患者关注医院公众号后，在这里核实身份并绑定患者档案。患者来信进入待处理；48 小时内有互动可以回文字，否则发模板消息。',
    events: [{ value: 'FOLLOW', label: '关注' }, { value: 'TEXT', label: '患者发来文字' }, { value: 'UNFOLLOW', label: '取消关注' }], mockId: 'openid-demo-0003' },
}
const kinds = { TEXT: '文字', TEMPLATE: '模板消息', APPROVED_ADVICE: '已审核正文', WELCOME: '欢迎语', EVENT: '关系事件' }
const channelStatus = { NOT_CONFIGURED: ['default', '未配置'], CONFIGURED_UNVERIFIED: ['gold', '已配置 · 未验证'], CONNECTED: ['green', '已接通'], FAILED: ['red', '连接失败'], MOCK: ['gold', '模拟通道'] }
/** Friends have a nickname; Official Account followers do not, so the tail of the openid tells them apart. */
export const contactName = contact => contact.nickname || (contact.channel === 'WE_COM' ? '企业微信客户 ' : '公众号粉丝 ') + contact.external_id.slice(-6)
export function ChannelTag({ item }) {
  const [color, label] = channelStatus[item.status] || channelStatus.NOT_CONFIGURED
  return <Tag color={item.enabled || item.status === 'NOT_CONFIGURED' ? color : 'default'}>{item.enabled || item.status === 'NOT_CONFIGURED' ? label : label + ' · 未启用'}</Tag>
}
const within48 = contact => contact.last_inbound_at && dayjs().diff(dayjs(contact.last_inbound_at), 'hour') < 48
function resultMessage(message, result) {
  if (result.status === 'FAILED') message.error('发送失败：' + (result.error || '微信未受理'))
  else if (result.status === 'PENDING_CONFIRM') message.info('已创建企业微信群发任务，成员在企业微信里确认后才会发出')
  else message.success('微信接口已受理' + (result.mock ? '（模拟通道，未真实发出）' : ''))
}

/** Text, Official Account template message, or a follow-up text the responsible doctor has approved. */
function SendBox({ contact, onSent }) {
  const { message } = App.useApp()
  const official = contact.channel === 'WECHAT_OFFICIAL'
  const [kind, setKind] = useState(official && !within48(contact) ? 'TEMPLATE' : 'TEXT')
  const [content, setContent] = useState('')
  const [templateCode, setTemplateCode] = useState(undefined)
  const [taskId, setTaskId] = useState(undefined)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const key = useRef(crypto.randomUUID())
  const templates = useLoad(() => api('/templates/query', { page: 0, size: 100, active: true, channel: kind === 'TEMPLATE' ? 'MP_TEMPLATE' : 'WECHAT' }), [kind])
  const tasks = useLoad(() => contact.patient_id ? api('/tasks/query', { page: 0, size: 20, patient_id: contact.patient_id, status: 'APPROVED' }) : Promise.resolve({ items: [] }), [contact.patient_id])
  const approved = (tasks.data?.items || []).filter(task => task.approved_text)
  const advice = approved.find(task => task.id === taskId)
  const textBlocked = official && !within48(contact) && kind !== 'TEMPLATE'
  const ready = kind === 'APPROVED_ADVICE' ? Boolean(advice) : kind === 'TEMPLATE' ? Boolean(templateCode && content.trim()) : Boolean(content.trim())
  async function send() {
    if (busy) return
    setBusy(true); setError(null)
    try {
      const result = await api('/wechat/messages/send', { contact_id: contact.id, kind, content: kind === 'APPROVED_ADVICE' ? undefined : content, template_code: kind === 'APPROVED_ADVICE' ? undefined : templateCode, task_id: kind === 'APPROVED_ADVICE' ? taskId : undefined, request_key: key.current })
      key.current = crypto.randomUUID(); resultMessage(message, result)
      if (result.status !== 'FAILED') { setContent(''); setTemplateCode(undefined); setTaskId(undefined) }
      onSent()
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  if (contact.relation !== 'ACTIVE') return <Alert type="warning" showIcon message="对方已删除好友或取消关注，无法发送。可改用电话联系。" />
  return <div className="action-block"><h3>发送消息</h3>
    <Segmented value={kind} onChange={value => { setKind(value); setContent(''); setTemplateCode(undefined); setError(null) }} options={[{ value: 'TEXT', label: '文字' }, ...(official ? [{ value: 'TEMPLATE', label: '模板消息' }] : []), { value: 'APPROVED_ADVICE', label: '已审核正文', disabled: !contact.patient_id }]} />
    <p className="muted mt">{official ? (within48(contact) ? '公众号文字走客服消息，患者最近 48 小时内有互动才能发。' : '患者 48 小时内没有互动，公众号不能发文字；可以发模板消息，或电话联系。')
      : '企业微信会创建一条群发任务，由成员 ' + (contact.staff_user_id || '（未记录）') + ' 在企业微信里确认后才发出。'}</p>
    {error && <Alert type="error" showIcon message={error} className="mb" />}
    {kind === 'APPROVED_ADVICE' ? <LoadState state={tasks}>{() => approved.length ? <>
      <Select aria-label="已审核的任务" value={taskId} onChange={setTaskId} placeholder="选择医生已审核的随访任务" style={{ width: '100%' }} options={approved.map(task => ({ value: task.id, label: '#' + task.id + ' ' + task.title }))} />
      {advice && <div className="approved-block"><h3>医生审核通过的正文（不可修改）</h3><p className="pre-wrap">{advice.approved_text}</p></div>}
    </> : <Alert type="info" showIcon message="该患者当前没有医生已审核的随访意见" description="随访意见提交责任医生审核通过后，才能在这里原文发送。" />}</LoadState> : <>
      <LoadState state={templates}>{data => <Select aria-label="模板" allowClear value={templateCode} placeholder={kind === 'TEMPLATE' ? '选择公众号模板消息（必选）' : '可选：带入微信话术模板'} style={{ width: '100%' }} className="mb"
        options={data.items.filter(t => t.scene !== 'WELCOME').map(t => ({ value: t.code, label: t.title }))} onChange={code => { setTemplateCode(code); const t = data.items.find(x => x.code === code); if (t) setContent(t.content) }} />}</LoadState>
      <Input.TextArea aria-label="消息内容" rows={kind === 'TEMPLATE' ? 5 : 4} value={content} onChange={event => setContent(event.target.value)} maxLength={kind === 'TEMPLATE' ? 2000 : 1300} showCount disabled={textBlocked}
        placeholder={kind === 'TEMPLATE' ? '每行一个字段，写成「字段=内容」，把 {占位} 换成实际内容' : '只发送服务提醒和事务性答复；涉及病情和用药的内容请走随访意见审核'} />
    </>}
    <Space className="mt"><Button type="primary" loading={busy} disabled={!ready || textBlocked} onClick={send}>{contact.channel === 'WE_COM' ? '创建群发任务' : '发送'}</Button><span className="muted">发送成功只表示微信接口已受理，不代表患者已读，也不能代替联系结果登记。</span></Space>
  </div>
}

export function ConversationDrawer({ contact, readOnly, onClose, onChanged }) {
  const { message } = App.useApp()
  const [page, setPage] = useState(0)
  const [busy, setBusy] = useState(false)
  const state = useLoad(() => contact ? api('/wechat/messages/query', { contact_id: contact.id, page, size: 30 }) : Promise.resolve(null), [contact?.id, page])
  const chat = useRef(null)
  // Newest messages sit at the bottom, like in WeChat itself.
  useEffect(() => { if (chat.current) chat.current.scrollTop = chat.current.scrollHeight }, [state.data])
  const changed = () => { setPage(0); state.reload(); onChanged?.() }
  async function act(path, body, done) {
    if (busy) return
    setBusy(true)
    try { const result = await api(path, body); done(result); changed() } catch (e) { message.error(e.message) } finally { setBusy(false) }
  }
  return <Drawer title={contact ? contactName(contact) + ' · ' + names[contact.channel] : ''} open={Boolean(contact)} width={640} onClose={onClose} destroyOnClose extra={<Button icon={<ReloadOutlined />} onClick={state.reload}>刷新</Button>}>
    {contact && <><Space wrap className="mb"><Tag>{names[contact.channel]}</Tag>{contact.mock && <Tag color="gold">模拟数据</Tag>}<Tag color={contact.relation === 'ACTIVE' ? 'green' : 'default'}>{contact.relation === 'ACTIVE' ? '关系有效' : '已失联'}</Tag>
      {contact.patient_id ? <Link to={'/patients/' + contact.patient_id} onClick={onClose}>患者 {contact.patient_name} #{contact.patient_id}</Link> : <Tag color="gold">待绑定患者</Tag>}
      {!readOnly && contact.pending_count > 0 && <Button size="small" disabled={busy} onClick={() => act('/wechat/contacts/handle', { id: contact.id }, () => message.success('已标记处理'))}>标记已处理（{contact.pending_count}）</Button>}</Space>
      {contact.channel === 'WE_COM' && <Alert className="mb" type="info" showIcon message="企业微信未开通会话存档，这里只有加好友、删好友事件和系统发起的消息；成员在企业微信里的聊天正文系统看不到。" />}
      <LoadState state={state}>{data => data && <><div className="chat" ref={chat}>{[...data.items].reverse().map(m => m.kind === 'EVENT' ? <div className="chat-event" key={m.id}>{m.content} · {dateText(m.sent_at)}</div>
        : <div className={'chat-row ' + (m.direction === 'OUTBOUND' ? 'out' : 'in')} key={m.id}><div className="chat-bubble"><div className="chat-meta">{kinds[m.kind]}{m.template_code && ' · ' + m.template_code}{m.task_id && <> · <Link to={'/followups?task=' + m.task_id} onClick={onClose}>任务 #{m.task_id}</Link></>}{m.mock && ' · 模拟'}</div>
          <p className="pre-wrap">{m.content}</p><div className="chat-foot"><Status value={m.status} /><span>{dateText(m.sent_at)}</span>
            {!readOnly && m.status === 'PENDING_CONFIRM' && <Button type="link" size="small" disabled={busy} onClick={() => act('/wechat/messages/refresh', { id: m.id }, result => message.info(result.status === 'PENDING_CONFIRM' ? '成员尚未确认发送' : '结果已更新：' + names[result.status]))}>刷新发送结果</Button>}
            {!readOnly && m.direction === 'INBOUND' && m.kind === 'TEXT' && contact.patient_id && <Button type="link" size="small" disabled={busy} onClick={() => act('/wechat/messages/consult', { id: m.id }, task => message.success('已转为咨询任务 #' + task.id + '，请在「随访与咨询」里起草并提交医生审核'))}>转咨询任务</Button>}</div>
          {m.error && <div className="danger-text">{m.error}</div>}</div></div>)}
        {data.items.length === 0 && <p className="muted">还没有消息记录。</p>}</div>
        {data.total_size > 30 && <Space className="mt"><Button size="small" disabled={page === 0} onClick={() => setPage(page - 1)}>较新</Button><Button size="small" disabled={(page + 1) * 30 >= data.total_size} onClick={() => setPage(page + 1)}>更早</Button><span className="muted">共 {data.total_size} 条</span></Space>}</>}</LoadState>
      {!readOnly && <SendBox key={contact.id + '-' + contact.last_inbound_at} contact={contact} onSent={changed} />}</>}
  </Drawer>
}

function BindDialog({ contact, onClose, onSaved }) {
  const [keyword, setKeyword] = useState('')
  const patients = useLoad(() => contact ? api('/patients/query', { page: 0, size: 50, keyword }) : Promise.resolve({ items: [] }), [contact?.id, keyword])
  return <FormDialog title={'绑定患者 · ' + (contact ? contactName(contact) : '')} open={Boolean(contact)} onClose={onClose} okText="确认绑定" onSubmit={async values => { await api('/wechat/contacts/bind', { id: contact.id, version: contact.version, patient_id: values.patient_id }); onSaved() }}>
    <Alert className="mb" type="warning" showIcon message="先核实身份再绑定" description="请通过电话或当面确认这位微信联系人就是该患者本人或其授权联系人。系统不会按手机号、昵称自动匹配。" />
    <LoadState state={patients}>{data => <Form.Item name="patient_id" label="患者（可搜索姓名）" rules={required}><Select showSearch filterOption={false} onSearch={setKeyword} options={data.items.map(row => ({ value: row.id, label: row.name + ' #' + row.id + ' / ' + row.department }))} /></Form.Item>}</LoadState>
  </FormDialog>
}

/** Follow, message or unfollow on a simulated channel, so the flow can be shown without WeChat. */
function MockDialog({ provider, open, onClose, onSaved }) {
  const wecom = provider === 'WE_COM'
  const page = channelPages[provider]
  return <FormDialog title={'模拟一次' + page.title + '事件'} open={open} initialValues={{ event: wecom ? 'FOLLOW' : 'TEXT', external_id: page.mockId }} onClose={onClose} okText="模拟" onSubmit={async values => { await api('/wechat/mock/inbound', { ...values, provider }); onSaved() }}>
    <Alert className="mb" type="info" showIcon message="仅模拟通道可用。事件按真实回调同样的逻辑入库，记录带「模拟」标记，不连接微信。" />
    <div className="form-grid"><Form.Item name="event" label="事件" rules={required}><Select options={page.events} /></Form.Item>
      <Form.Item name="external_id" label="外部 ID（虚构）" rules={[...required, { pattern: /^[A-Za-z0-9_-]{4,64}$/, message: '4–64 位字母、数字、下划线或短横线' }]}><Input maxLength={64} /></Form.Item>
      {wecom && <Form.Item name="staff_user_id" label="企业微信成员账号（加好友时）"><Input maxLength={64} placeholder="例如 demo.operator.a" /></Form.Item>}</div>
    {!wecom && <Form.Item name="text" label="来信内容"><Input.TextArea rows={2} maxLength={2000} placeholder="例如：请问复诊要带什么资料" /></Form.Item>}
  </FormDialog>
}

/** The 企业微信 or 公众号 menu page: that channel's contacts, binding, conversations and sending. */
export default function WechatChannel({ provider }) {
  const account = useOutletContext()
  const { message, modal } = App.useApp()
  const manager = account.role_code === 'MANAGER'
  const official = provider === 'WECHAT_OFFICIAL'
  const channelPage = channelPages[provider]
  const [page, setPage] = useState(0)
  const [scope, setScope] = useState(manager ? 'ALL' : 'BOUND')
  const [filters, setFilters] = useState({})
  const [open, setOpen] = useState(null)
  const [bind, setBind] = useState(null)
  const [mock, setMock] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const query = { page, size: 10, ...filters, channel: provider, bound: scope === 'ALL' ? undefined : scope === 'BOUND' }
  const state = useLoad(() => api('/wechat/contacts/query', query), [JSON.stringify(query)])
  const integrations = useLoad(() => api('/integrations'))
  const item = (integrations.data || []).find(row => row.provider === provider)
  const filter = (key, value) => { setFilters(previous => ({ ...previous, [key]: value === '' || value === false ? undefined : value })); setPage(0) }
  const current = open && (state.data?.items.find(row => row.id === open.id) || open)
  async function sync() {
    if (syncing) return
    setSyncing(true)
    try { const result = await api('/wechat/contacts/sync', { provider }); message.success(channelPage.title + '同步完成：新增 ' + result.created + '，更新 ' + result.updated + (result.truncated ? '；超过 1000 条，其余未同步' : '')); state.reload() }
    catch (e) { message.error(e.message) } finally { setSyncing(false) }
  }
  const unbind = row => { let reason = ''; modal.confirm({ title: '解除「' + contactName(row) + '」与患者的绑定？', content: <Input.TextArea aria-label="解绑原因" rows={2} maxLength={300} placeholder="解绑原因（必填），例如：绑定错人" onChange={event => { reason = event.target.value }} />, okText: '解绑', cancelText: '取消',
    onOk: async () => { if (!reason.trim()) { message.warning('请填写解绑原因'); throw new Error('reason') } try { await api('/wechat/contacts/unbind', { id: row.id, version: row.version, reason }); state.reload() } catch (e) { message.error(e.message); throw e } } }) }
  return <><PageTitle title={channelPage.title} subtitle={channelPage.subtitle}
    extra={manager && <Space wrap><Button icon={<SyncOutlined />} loading={syncing} onClick={sync}>同步{channelPage.title}</Button>{item?.status === 'MOCK' && <Button onClick={() => setMock(true)}>{official ? '模拟来信' : '模拟好友事件'}</Button>}</Space>} />
    <LoadState state={integrations}>{() => item && <Alert className="mb" showIcon type={item.status === 'CONNECTED' && item.enabled ? 'success' : 'info'} message={<span>{channelPage.title} <ChannelTag item={item} /></span>}
      description={item.status === 'MOCK' ? '模拟通道只用于演示：发送、同步和活码都返回模拟结果，不连接微信，也不代表已接通。' : item.status === 'NOT_CONFIGURED' ? '尚未配置' + channelPage.title + '。运营主管可在「运营设置 → 外部接入」填写凭证并测试连接。' : '通道状态以「测试连接」和每次发送的真实返回为准。'} />}</LoadState>
    <Card><div className="toolbar"><Segmented value={scope} onChange={value => { setScope(value); setPage(0) }} options={[...(manager ? [{ value: 'ALL', label: '全部' }] : []), { value: 'BOUND', label: manager ? '已绑定' : '我的患者' }, { value: 'UNBOUND', label: '待绑定' }]} />
      <Select aria-label="关系" placeholder="全部关系" allowClear style={{ width: 130 }} options={[{ value: 'ACTIVE', label: '关系有效' }, { value: 'REMOVED', label: '已失联' }]} onChange={value => filter('relation', value)} />
      <Input.Search placeholder="搜索昵称" allowClear style={{ width: 180 }} onSearch={value => filter('keyword', value)} />
      {official && <Space><Switch aria-label="仅看待处理" onChange={value => filter('pending', value)} />仅看待处理</Space>}<Button icon={<ReloadOutlined />} onClick={state.reload}>刷新</Button></div>
      <DataTable state={state} page={page} setPage={setPage} columns={[
        { title: channelPage.who, render: (_, row) => <><Badge count={row.pending_count} size="small" offset={[8, 0]}><strong>{contactName(row)}</strong></Badge><div className="muted">{row.mock && <Tag color="gold">模拟</Tag>}{row.relation !== 'ACTIVE' && <Tag>{official ? '已取消关注' : '已删除好友'}</Tag>}</div></> },
        { title: '患者', render: (_, row) => row.patient_id ? <Link to={'/patients/' + row.patient_id}>{row.patient_name} #{row.patient_id}</Link> : <Tag color="gold">待绑定</Tag> },
        { title: '来源', render: (_, row) => <>{row.intake_channel_id ? '渠道 #' + row.intake_channel_id : '—'}<div className="muted">{row.staff_user_id ? '成员 ' + row.staff_user_id : ''}{row.followed_at ? ' ' + dateText(row.followed_at) : ''}</div></> },
        { title: '最近消息', render: (_, row) => <><div className="chat-preview">{row.last_message_preview || '—'}</div><div className="muted">{dateText(row.last_message_at)}</div></> },
        { title: '操作', render: (_, row) => <Space><Button type="link" onClick={() => setOpen(row)}>会话</Button>{row.patient_id ? <Button type="link" danger onClick={() => unbind(row)}>解绑</Button> : <Button type="link" onClick={() => setBind(row)}>绑定患者</Button>}</Space> },
      ]} /></Card>
    <ConversationDrawer contact={current} onClose={() => setOpen(null)} onChanged={state.reload} />
    <BindDialog contact={bind} onClose={() => setBind(null)} onSaved={state.reload} />
    <MockDialog provider={provider} open={mock} onClose={() => setMock(false)} onSaved={state.reload} />
  </>
}

/** The 企业微信 or 公众号 tab of a patient record. Doctors read; operations staff can open the conversation and send. */
export function PatientWechat({ patientId, provider, readOnly }) {
  const [open, setOpen] = useState(null)
  const channelPage = channelPages[provider]
  const state = useLoad(() => api('/wechat/contacts/query', { page: 0, size: 20, patient_id: patientId, channel: provider }), [patientId, provider])
  const current = open && (state.data?.items.find(row => row.id === open.id) || open)
  return <><LoadState state={state}>{data => data.items.length ? <div className="wechat-contacts">{data.items.map(row => <div className="context-block" key={row.id}><Space wrap><strong>{contactName(row)}</strong>{row.mock && <Tag color="gold">模拟</Tag>}<Tag color={row.relation === 'ACTIVE' ? 'green' : 'default'}>{row.relation === 'ACTIVE' ? '关系有效' : '已失联'}</Tag>{row.pending_count > 0 && <Tag color="orange">待处理 {row.pending_count}</Tag>}</Space>
      <p className="muted">绑定于 {dateText(row.bound_at)} · 最近消息 {dateText(row.last_message_at)}</p><p className="chat-preview">{row.last_message_preview || '暂无消息'}</p><Button onClick={() => setOpen(row)}>{readOnly ? '查看会话' : '查看会话 / 发消息'}</Button></div>)}</div>
    : <Alert type="info" showIcon message={'这位患者还没有绑定' + channelPage.title} description={readOnly ? '运营团队核实身份并绑定后，这里显示' + channelPage.title + '的沟通记录。' : <>患者{channelPage.join}后，在 <Link to={channelPage.path}>{channelPage.title}</Link> 的「待绑定」里核实身份并绑定到本档案。</>} />}</LoadState>
    <ConversationDrawer contact={current} readOnly={readOnly} onClose={() => setOpen(null)} onChanged={state.reload} /></>
}

/** In the task drawer: send the doctor-approved text to the patient's bound WeChat contacts, word for word. */
export function WechatAdvice({ task }) {
  const { message, modal } = App.useApp()
  const [busy, setBusy] = useState(false)
  const state = useLoad(() => api('/wechat/contacts/query', { page: 0, size: 20, patient_id: task.patient_id, relation: 'ACTIVE' }), [task.patient_id])
  const send = contact => modal.confirm({ title: '通过' + names[contact.channel] + '发送已审核正文？', width: 560, okText: contact.channel === 'WE_COM' ? '创建群发任务' : '发送', cancelText: '取消',
    content: <><p className="pre-wrap">{task.approved_text}</p><p className="muted">发给 {contactName(contact)}。正文取自医生审核结果，不能修改。发送后仍需按实际沟通登记联系结果。</p></>,
    onOk: async () => { if (busy) return; setBusy(true); try { resultMessage(message, await api('/wechat/messages/send', { contact_id: contact.id, kind: 'APPROVED_ADVICE', task_id: task.id, request_key: crypto.randomUUID() })) } catch (e) { message.error(e.message) } finally { setBusy(false) } } })
  if (!state.data?.items.length) return null
  return <Space wrap className="mt">{state.data.items.map(contact => <Button key={contact.id} disabled={busy} onClick={() => send(contact)}>微信发送已审核正文 · {names[contact.channel]}{contact.mock ? '（模拟）' : ''}</Button>)}</Space>
}
