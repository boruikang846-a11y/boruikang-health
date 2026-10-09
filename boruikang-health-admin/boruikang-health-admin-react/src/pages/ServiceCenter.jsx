import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Button, Card, Form, Input, InputNumber, Select, Space, Tag, Typography, Modal } from 'antd'
import { api, useLoad } from '../api'
import { DataTable, FormDialog, LoadState, PageTitle, required, dateText } from '../ui'
const states = { ISSUED: '待患者登记', REGISTERED: '待身份核实', VERIFIED: '已核实入组', REVOKED: '链接已撤销' }
export default function ServiceCenter() {
 const [page,setPage]=useState(0),[filter,setFilter]=useState(),[dialog,setDialog]=useState(null),[issued,setIssued]=useState(null)
 const state=useLoad(()=>api('/service_center/query',{page,size:10,status:filter}),[page,filter])
 const contacts=useLoad(()=>api('/wechat/contacts/query',{channel:'WE_COM',page:0,size:100}))
 const patients=useLoad(()=>api('/patients/query',{page:0,size:100}))
 return <><PageTitle title="博瑞康企微受邀服务" subtitle="签发服务入口、核实身份与授权，承接患者反馈和后续服务。" extra={<Space><Button onClick={state.reload}>刷新</Button><Button type="primary" onClick={()=>setDialog({type:'issue'})}>签发 / 续签患者入口</Button></Space>} />
 <Alert className="mb" type="info" showIcon message="博瑞康企业微信 · 江阴人民医院心血管科试点" description="通过当前账号所属医院办理服务。真实企微、医院接口及 AI 状态以接入配置为准；试点名称不代表已完成接入。" />
 <div className="integration-grid mb">{[['诊前','咨询登记、预约协助、就医准备'],['诊中','实际到院、院内协助、报告核对'],['诊后','医生审核计划、随访反馈、复诊结案']].map(([title,body])=><Card key={title} title={title}><p>{body}</p><Link to="/journeys">办理患者旅程 →</Link></Card>)}</div>
 <Card className="mb" title="AI + 人工服务"><p>从关联病历起草随访意见，由责任医生审核，运营或护士执行并记录反馈。患者提交的问题进入人工服务队列。</p><Space wrap><Link to="/followups">AI 随访起草与执行</Link><Link to="/after-care">咨询与异常受理</Link><Link to="/wecom">企微联系人与沟通</Link><Link to="/settings">接入状态</Link></Space></Card>
 <Card title="患者登记与身份核实"><div className="toolbar"><Select allowClear placeholder="全部状态" style={{width:180}} value={filter} options={Object.entries(states).map(([value,label])=>({value,label}))} onChange={v=>{setFilter(v);setPage(0)}} /></div>
 <DataTable state={state} page={page} setPage={setPage} columns={[
 {title:'联系人 / 患者登记',render:(_,row)=><><b>{row.nickname}</b><div>{row.patient_name || '尚未登记'} {row.phone}</div></>},
 {title:'状态',render:(_,row)=><Tag color={row.status==='VERIFIED'?'green':row.status==='REGISTERED'?'gold':'default'}>{states[row.status]}</Tag>},
 {title:'身份 / 接入阶段',render:(_,row)=><>{row.relation==='FAMILY'?'家属代办':row.relation==='SELF'?'本人':'—'}<div>{row.entry_phase==='AFTER_CARE'?'诊后接入':row.entry_phase?'全程服务':'—'}</div></>},
 {title:'有效期',render:(_,row)=>dateText(row.expires_at)},
 {title:'操作',render:(_,row)=><Space wrap>{row.status==='REGISTERED'&&<Button size="small" onClick={()=>setDialog({type:'verify',row})}>核实绑定</Button>}{row.patient_id&&<Link to={'/after-care?step=patients&patient='+row.patient_id}>患者服务摘要</Link>}{row.status!=='REVOKED'&&<Button size="small" onClick={()=>setDialog({type:'revoke',row})}>撤销入口</Button>}</Space>}
 ]} /></Card>
 {dialog&&<FormDialog open key={dialog.type+(dialog.row?.id||'')} title={{issue:'签发患者服务链接',verify:'核实身份与服务授权',revoke:'撤销患者访问入口'}[dialog.type]} onClose={()=>setDialog(null)} onSubmit={async values=>{
  if(dialog.type==='issue'){setIssued(await api('/service_center/issue',{contact_id:values.manual_contact_id || values.contact_id}))}
  else if(dialog.type==='verify')await api('/service_center/verify',{...values,id:dialog.row.id,version:dialog.row.version})
  else await api('/service_center/revoke',{...values,id:dialog.row.id,version:dialog.row.version})
  state.reload()
 }}>
 {dialog.type==='issue'?<><LoadState state={contacts}>{data=><Form.Item label="企微联系人（最近 100 位，支持续签）" name="contact_id"><Select showSearch optionFilterProp="label" options={data.items.filter(c=>c.relation==='ACTIVE').map(c=>({value:c.id,label:c.nickname+' / #'+c.id}))} /></Form.Item>}</LoadState><Form.Item label="已绑定联系人可直接填写编号" name="manual_contact_id"><InputNumber min={1} precision={0} /></Form.Item><Alert type="info" message="链接有效 7 天，仅通过企微私发给该联系人。重新签发将撤销旧入口，需重新登记核实。" /></>:dialog.type==='verify'?<><Alert className="mb" type="warning" message="核实本人/家属身份、代办权限及患者档案授权；不要仅凭手机号合并患者。" /><LoadState state={patients}>{data=><Form.Item label="已建档且已授权、已分派的患者" name="patient_id" rules={required}><Select showSearch optionFilterProp="label" options={data.items.map(p=>({value:p.id,label:p.name+' / #'+p.id}))} /></Form.Item>}</LoadState><Form.Item label="身份、代办权限与服务授权核验依据" name="evidence" rules={required}><Input.TextArea rows={4} maxLength={1000} /></Form.Item></>:<><Form.Item label="撤销原因" name="reason" rules={required}><Input.TextArea maxLength={1000} /></Form.Item><Alert type="info" message="此操作撤销 H5 入口；患者退出旅程或撤回服务授权，请在患者旅程中另行办理。" /></>}
 </FormDialog>}
 <Modal open={!!issued} title="患者 H5 入口已签发" onCancel={()=>setIssued(null)} footer={<Button onClick={()=>setIssued(null)}>已记录链接</Button>}><p>下方链接使用已配置的患者端地址。通过企微私发给已核实的联系人，系统不自动发送。</p>{issued?.mock&&<Tag color="gold">模拟企微联系人</Tag>}<Typography.Paragraph copyable>{issued?.path}</Typography.Paragraph><p>有效期：{dateText(issued?.expires_at)}。链接仅在签发时展示，请勿分享到群聊。</p></Modal>
 </>
}
