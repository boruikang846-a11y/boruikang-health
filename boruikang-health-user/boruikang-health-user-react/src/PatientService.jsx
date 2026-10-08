import React, { useEffect, useState } from 'react'
import { Alert, Button, Card, Checkbox, Form, Input, Select, Space, Steps, Tag } from 'antd'
import './patient-service.css'
const kinds={SERVICE:'服务咨询',CLINICAL:'病情与随访反馈',COMPLAINT:'意见与投诉'}
const status={ISSUED:'待服务登记',REGISTERED:'等待团队核实',VERIFIED:'已进入服务',OPEN:'待受理',ACCEPTED:'已受理',RESOLVED:'已处理待确认',CLOSED:'已结案',ACTIVE:'服务中',INTAKE:'待交接',PAUSED:'已暂停',EXITED:'已退出'}
export default function PatientService(){
 const [token]=useState(()=>window.location.hash.slice(1) || sessionStorage.getItem('health.patient.entry') || ''),[data,setData]=useState(null),[error,setError]=useState(null),[busy,setBusy]=useState(false),[requestId,setRequestId]=useState(()=>crypto.randomUUID())
 const [form]=Form.useForm()
 useEffect(()=>{document.title='患者全程服务中心 | 博瑞康 Health';if(token)sessionStorage.setItem('health.patient.entry',token);window.history.replaceState(null,'','/service')},[])
 async function call(path,values={}){
  const res=await fetch('/boruikang/user/service_center/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...values,token}),cache:'no-store'})
  const body=await res.json();if(!res.ok||!body.success)throw new Error(body.message||'暂时无法办理，请稍后重试');return body.result
 }
 async function run(path,values){setBusy(true);setError(null);try{const result=await call(path,values);setData(result);if(path==='feedback'){setRequestId(crypto.randomUUID());form.resetFields()}}catch(e){setError(e.message)}finally{setBusy(false)}}
 useEffect(()=>{if(token)run('portal');else setError('请通过医院服务团队发送的专属链接进入。')},[token])
 return <div className="patient-service"><header><span>博瑞康 Health · 患者服务</span><h1>每一步，都有人跟进。</h1><p>诊前准备 · 诊中协助 · 诊后随访</p></header><main>
 {error&&<Alert type="error" showIcon message={error} className="service-gap" />}
 {data?.mock&&<Alert className="service-gap" type="warning" message="模拟服务环境，仅用于虚构数据演示" />}
 {!data&&token&&<Button loading={busy} onClick={()=>run('portal')}>重新获取服务状态</Button>}
 {data&&<><div className="service-heading"><Tag color="green">{status[data.status]}</Tag><span>{data.patient_name}</span></div><Steps size="small" current={data.status==='ISSUED'?0:data.status==='REGISTERED'?1:2} items={[{title:'登记'},{title:'核实'},{title:'服务'}]} />
 {data.status==='ISSUED'?<Card title="登记服务信息" className="service-gap"><Form layout="vertical" initialValues={{relation:'SELF',entry_phase:'FULL'}} onFinish={v=>run('register',v)}>
 <Form.Item label="患者姓名" name="patient_name" rules={[{required:true,whitespace:true,message:'请输入患者姓名'}]}><Input maxLength={80} autoComplete="off" /></Form.Item>
 <Form.Item label="联系人手机号" name="phone" rules={[{required:true,pattern:/^1[3-9]\d{9}$/,message:'请输入有效手机号'}]}><Input inputMode="tel" maxLength={11} /></Form.Item>
 <Form.Item label="您与患者的关系" name="relation" rules={[{required:true}]}><Select options={[{value:'SELF',label:'患者本人'},{value:'FAMILY',label:'家属代办（需核实患者授权）'}]} /></Form.Item>
 <Form.Item label="当前服务需求" name="entry_phase" rules={[{required:true}]}><Select options={[{value:'FULL',label:'就诊前或住院中，需要全程协助'},{value:'AFTER_CARE',label:'门诊结束或出院后，需要随访服务'}]} /></Form.Item>
 <div className="consent-copy"><b>服务授权说明 · patient-service-2.1</b><p>同意医院及其受托服务团队为身份核实、就医协助和随访服务使用本次填写的信息，并通过医院企业微信联系。若为家属代办，须由团队进一步核实患者授权。本页登记不替代诊疗授权。可联系团队撤回服务授权。</p><p>AI 可辅助团队整理和起草，临床建议由责任医生审核后人工提供。</p></div>
 <Form.Item name="consent" valuePropName="checked" rules={[{validator:(_,v)=>v?Promise.resolve():Promise.reject(new Error('请阅读并确认服务授权'))}]}><Checkbox>我已阅读并同意服务授权说明</Checkbox></Form.Item><Button block type="primary" htmlType="submit" loading={busy}>提交登记</Button></Form></Card>:data.status==='REGISTERED'?<Card className="service-gap" title="登记已收到"><p>服务团队正在核实身份与授权，完成后为您开放服务。请通过企微联系您的服务人员。</p><Button loading={busy} onClick={()=>run('portal')}>刷新核实状态</Button></Card>:<>
 <Card title="我的服务旅程" className="service-gap">{data.journeys.length?data.journeys.map(j=><article className="patient-journey" key={j.id}><Tag>{j.phase}</Tag><b>{j.kind==='OUTPATIENT'?'门诊服务':'住院与出院服务'}</b><p>{j.step} · {status[j.status]||j.status}</p><small>本次服务 #{j.id}</small></article>):<p>团队正在安排服务旅程，请通过企微联系服务人员。</p>}</Card>
 <Card title="联系服务团队" className="service-gap"><Form form={form} layout="vertical" onFinish={v=>run('feedback',{...v,request_id:requestId})}><Form.Item name="journey_id" label="本次服务" rules={[{required:true,message:'请选择服务旅程'}]}><Select options={data.journeys.filter(j=>j.status==='ACTIVE').map(j=>({value:j.id,label:(j.kind==='OUTPATIENT'?'门诊':'出院')+'服务 #'+j.id}))} /></Form.Item><Form.Item name="kind" label="反馈类型" rules={[{required:true}]}><Select options={Object.entries(kinds).map(([value,label])=>({value,label}))} /></Form.Item><Form.Item name="content" label="您的问题或随访反馈" rules={[{required:true,whitespace:true,message:'请输入反馈内容'}]}><Input.TextArea rows={4} maxLength={2000} showCount /></Form.Item><Button block type="primary" htmlType="submit" loading={busy}>提交给服务团队</Button></Form><p className="service-note">提交后由人工受理，页面不会自动给出诊断或治疗建议。</p></Card>
 <Card title="反馈进度" className="service-gap">{data.feedback.length?data.feedback.map(f=><article key={f.id} className="patient-journey"><Tag>{status[f.status]||f.status}</Tag><b>{kinds[f.kind]}</b><p>{f.content}</p></article>):<p>暂无已提交反馈</p>}<Button loading={busy} onClick={()=>run('portal')}>刷新服务进度</Button></Card>
 </>}
 </>}
 <p className="service-note">本页面用于服务协助，不是急救入口。如需紧急医疗帮助，请及时联系急救或到院就医。</p>
 </main><footer>医院服务团队 · 博瑞康 Health</footer></div>
}
