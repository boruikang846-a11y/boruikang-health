'use strict';
// Offline demonstration of the implemented workflow. No network or persistence.
const journeyPaths=implementationContract.journey.paths, journeyLabels=implementationContract.journey;
const journeyTypes={OUTPATIENT:'门诊全旅程',DISCHARGE:'住院与出院全旅程'}, caseTypes={SERVICE:'服务咨询',CLINICAL:'临床异常',COMPLAINT:'投诉'};
const journeyNow=()=>new Date().toISOString().slice(0,19), journeyId=rows=>Math.max(0,...rows.map(x=>x.id))+1;
const journeyOptions=labels=>Object.entries(labels).map(([value,label])=>({value,label}));
function journeyNodeFields(index){return '<section class="card">'+field('seq_'+index,'节点序号','number',index+1)+field('task_type_'+index,'任务类型','select','FOLLOWUP',[{value:'FOLLOWUP',label:'随访'},{value:'REVISIT',label:'复诊协助'}])+field('stage_'+index,'阶段标识','select','CUSTOM',['CUSTOM','D3','D7','D30','M3','M6','Y1','ENROLLMENT'])+field('offset_days_'+index,'距原报告发生日期的天数','number',0)+field('priority_'+index,'优先级','select','P2',['P0','P1','P2','P3'])+field('title_'+index,'任务标题','text','本次事件随访')+field('checklist_'+index,'待医生审核的执行内容','textarea','【虚构】核对原医嘱与患者反馈')+'</section>'}
function journeyPageForPatient(p){return card('本患者就诊旅程',link('查看本患者旅程与计划','/journeys?patient='+p.id,'btn')+table(['事件','状态','进入'],journeyVisible().filter(j=>j.patient===p.id).map(j=>[esc(j.event_key),esc(journeyLabels.statuses[j.status]),link('办理旅程','/journeys/'+j.id,'btn')])))}
function journeyState(){return demo.journeys??=[]}
function journeyStep(j){return journeyPaths[j.kind][j.stage]?.code||'DONE'}
function journeyVisible(){return journeyState().filter(j=>mine(patient(j.patient)))}
function journeyAuthorized(p){return !!p?.service_consent}
function journeyLog(j,action,evidence,ref=''){j.logs.push({action,step:journeyStep(j),by:account.id,at:journeyNow(),evidence,ref});audit(action+'：'+evidence,j.patient)}
function journeyDialog(title,kind,j,fields,help=''){
  modal(title,kind,j.id,field('version','记录版本','hidden',j.version)+field('request_id','操作编号','hidden','demo-'+Date.now()+'-'+Math.random().toString(16).slice(2))+fields,help||'虚构演示记录只保存在浏览器内存，刷新恢复初始状态。');
}
function journeyPage(){
  if(!canOperate()&&account?.role!=='DOCTOR')return forbidden();
  const id=Number(current.path.split('/')[2]||current.query.get('id'));
  if(id){const j=journeyVisible().find(x=>x.id===id);return j?journeyDetail(j):forbidden()}
  const q=current.query,rows=journeyVisible().filter(j=>(!q.get('kind')||j.kind===q.get('kind'))&&(!q.get('status')||j.status===q.get('status'))&&(!q.get('patient')||j.patient===Number(q.get('patient'))));
  return page('患者全旅程服务',(canOperate()?'<div class="toolbar">'+button('建立就诊旅程','journey-create','','primary')+'</div>':'')+
    card('患者服务旅程','<form data-form="journey-filter"><div class="toolbar">'+field('kind','路径','select',q.get('kind')||'',[{value:'',label:'全部路径'},...journeyOptions(journeyTypes)],false)+field('status','状态','select',q.get('status')||'',[{value:'',label:'全部状态'},...journeyOptions(journeyLabels.statuses)],false)+'<button>筛选</button></div></form>'+table(['患者 / 事件','路径 / 当前阶段','状态','主责团队','进入'],rows.map(j=>[patientCell(j.patient)+'<br>'+esc(j.event_key),esc(journeyTypes[j.kind])+'<br>'+esc(journeyPaths[j.kind][j.stage]?.title||'旅程结束'),esc(journeyLabels.statuses[j.status]),esc(person(patient(j.patient).owner)?.name)+' / '+esc(person(patient(j.patient).doctor)?.name),link('办理与核验','/journeys/'+j.id,'btn')]))));
}
function journeyDetail(j){
  const p=patient(j.patient),steps=journeyPaths[j.kind],code=journeyStep(j),plan=journeyPlan(j),doctor=account.role==='DOCTOR'&&account.id===p.doctor;
  let actions='';
  if(j.status==='INTAKE'&&canOperate()&&account.id===p.owner)actions+=button('本人确认交接','journey-handoff',j.id,'primary');
  if(j.status==='ACTIVE'){
    if(code==='PLAN'){if(canOperate())actions+=button('提交个案计划草稿','journey-plan-draft',j.id);if(doctor&&plan?.status==='DRAFT')actions+=button('本人审核个案计划','journey-plan-review',j.id,'primary')}
    else if(code==='CLINICAL'?doctor:canOperate())actions+=button('记录节点结果','journey-step',j.id,'primary');
    if(canOperate()&&['FOLLOWUP','CLOSE'].includes(code))actions+=button('替换个案计划','journey-plan-draft',j.id);
    if(doctor&&['FOLLOWUP','CLOSE'].includes(code))actions+=button('确认无需本轮复诊','journey-no-revisit',j.id);
    if(canOperate())actions+=button('暂停','journey-status',j.id+':PAUSE')+button('重新交接','journey-status',j.id+':HANDOFF');
  }
  if(j.status==='PAUSED'&&canOperate())actions+=button('核验后恢复','journey-status',j.id+':RESUME');
  if(['INTAKE','ACTIVE','PAUSED'].includes(j.status)&&canOperate())actions+=button('退出本次旅程','journey-status',j.id+':EXIT')+button('撤回本用途授权','journey-status',j.id+':WITHDRAW');
  let body=card('本次就诊事件','<p>'+patientCell(p.id)+' · '+esc(j.event_key)+' · '+esc(j.event_at)+' · '+esc(j.source_system)+'</p><p>'+esc(journeyLabels.statuses[j.status])+' · 版本 '+j.version+' · '+(j.entry_phase==='AFTER_CARE'?'诊后直接接入':'完整路径')+'</p>'+table(['阶段','责任','状态'],steps.map((s,i)=>[esc(s.title),s.responsibility==='DOCTOR'?'责任医生本人':s.responsibility==='OWNER'?'当前负责人本人':'运营 / 护士',j.skipped.includes(s.code)?'前段不适用，已记录依据':i<j.stage?'已完成并留痕':i===j.stage?'当前待办':'等待前序节点']))+'<div class="toolbar">'+actions+'</div>');
  body+=card('本次报告与计划',j.record_snapshot?'<div class="report">'+esc(j.record_snapshot.text)+'</div>'+table(['版本','状态','正文 / 审核意见'],j.plans.map(x=>['v'+x.revision,esc(journeyLabels.planStatuses[x.status]),esc(x.text)+'<br>'+esc(x.note||'')])):'<p>等待责任医生核对本次原报告。历史报告不能复用为另一事件依据。</p>');
  body+=card('当前计划任务',table(['任务','状态','日期','医生查收','进入'],(plan?.tasks||[]).map(id=>demo.tasks.find(x=>x.id===id)).filter(Boolean).map(t=>[esc(t.title),tag(t.status),esc(t.due),t.received?'已查收':'待执行 / 查收',link('任务详情','/followups/'+t.id,'btn')])));
  body+=card('咨询、异常与投诉',(canOperate()&&j.status!=='CLOSED'?button('登记待解决问题','journey-case-open',j.id):'')+table(['问题 / 截止','类型','状态 / 结果','操作'],j.cases.map(c=>{
    const action={OPEN:'ACCEPT',ACCEPTED:'RESOLVE',RESOLVED:'CLOSE'}[c.status],permitted=action==='CLOSE'?canOperate():c.kind==='CLINICAL'?doctor:canOperate();
    return [esc(c.summary)+'<br>'+esc(c.due_at)+(c.status!=='CLOSED'&&c.due_at<journeyNow()?' · 超时':''),esc(caseTypes[c.kind]),esc(journeyLabels.caseStatuses[c.status])+'<br>'+esc(c.resolution||c.receipt||''),action&&permitted&&j.status!=='CLOSED'?button({ACCEPT:'接单',RESOLVE:'记录实质处理结果',CLOSE:'核验患者已获反馈'}[action],'journey-case-action',j.id+':'+c.id+':'+action):'只读'];
  })));
  body+=card('不可覆盖的办理历史',table(['时间','动作','执行人','依据 / 关联'],j.logs.map(l=>[esc(l.at),esc(l.action),esc(person(l.by)?.name),esc(l.evidence)+'<br>'+esc(l.ref)])));
  return page(journeyTypes[j.kind]+' #'+j.id,link('返回旅程清单','/journeys','btn')+body);
}
function journeyPlan(j){return j.plans.find(x=>x.id===j.current_plan_id)}
function journeyFollowupsDone(j,p){const plan=journeyPlan(j),ts=(plan?.tasks||[]).map(id=>demo.tasks.find(t=>t.id===id)).filter(t=>t?.type==='FOLLOWUP');return plan?.status==='APPROVED'&&plan.reviewer===p.doctor&&ts.length&&ts.every(t=>t.status==='COMPLETED'&&t.received&&t.reviewer===p.doctor&&t.receiver===p.doctor)}
function journeyCancel(j){for(const id of journeyPlan(j)?.tasks||[]){const t=demo.tasks.find(x=>x.id===id);if(t&&!['COMPLETED','CANCELLED'].includes(t.status)){t.status='CANCELLED';t.version++}}}
function journeyRecord(j,id,p){const r=demo.records.find(x=>x.id===Number(id)&&x.patient===p.id&&x.type===(j.kind==='DISCHARGE'?'出院':'门诊'));return r&&r.status==='READ'&&r.viewer===p.doctor&&r.occurred_at>=j.event_at&&!journeyState().some(o=>o.id!==j.id&&(o.record_id===r.id||o.plans.some(plan=>plan.record_id===r.id)))?r:null}
function journeyTaskAllowed(t){const j=journeyState().find(x=>x.id===t.journey_id);return !j||(j.status==='ACTIVE'&&journeyAuthorized(patient(j.patient))&&patient(j.patient).owner===j.owner&&t.plan_id===j.current_plan_id&&journeyPlan(j)?.status==='APPROVED')}
function journeyAction(kind,id,v){
  if(!account||(!canOperate()&&account.role!=='DOCTOR'))return toast('无权访问服务旅程。');
  if(kind==='journey-consent'){
    const p=patient(id);if(!canOperate()||!mine(p))return toast('由患者负责人登记授权。');
    if(!v)return modal('登记本用途服务授权',kind,p.id,field('evidence','明确服务用途、授权时间和凭据','textarea'),'仅演示工作人员核验后的人工授权登记，不提供患者自助入组。');
    if(!v.evidence?.trim())return toast('请记录授权凭据。');p.service_consent=true;p.consent_evidence=v.evidence;audit('登记服务授权：'+v.evidence,p.id);$('#dialog').close();render();return;
  }
  if(kind==='journey-node-add'){const count=$('[name="node_count"]');if(Number(count.value)>=60)return toast('最多 60 个节点。');$('#journey-nodes').insertAdjacentHTML('beforeend',journeyNodeFields(Number(count.value)));count.value=Number(count.value)+1;return}
  if(kind==='journey-filter'){go('/journeys?'+new URLSearchParams(v));return}
  if(kind==='journey-create'){
    if(!canOperate())return toast('由运营或护士建立旅程。');
    if(!v)return modal('建立一次就诊服务旅程',kind,0,patientChoice()+field('kind','服务路径','select','OUTPATIENT',journeyOptions(journeyTypes))+field('entry_phase','接入阶段','select','FULL',[{value:'FULL',label:'完整门诊 / 住院路径'},{value:'AFTER_CARE',label:'已门诊结束 / 已出院，诊后接入'}])+field('source_system','事件来源','select','MANUAL',['MANUAL','HOSPITAL_MOCK'])+field('event_key','本次院内事件编号')+field('event_at','事件起始时间','datetime-local',journeyNow().slice(0,16))+field('identity_evidence','身份核验依据','textarea')+field('handoff_evidence','待交接事项与接入依据','textarea'),'患者须已有服务授权、责任医生和负责人。建立后由当前负责人本人接收。');
    const p=patient(v.patient);
    if(!mine(p)||!journeyAuthorized(p)||['PAUSED','CLOSED'].includes(p.lifecycle)||!person(p.owner)?.active||!person(p.doctor)?.active)return toast('请先在患者档案登记有效服务授权与责任分工。');
    if(!journeyPaths[v.kind]||!['FULL','AFTER_CARE'].includes(v.entry_phase)||!['MANUAL','HOSPITAL_MOCK'].includes(v.source_system)||!v.event_key?.trim()||!v.identity_evidence?.trim()||!v.handoff_evidence?.trim()||!Number.isFinite(Date.parse(v.event_at))||Date.parse(v.event_at)>Date.now())return toast('请核对事件、起始时间和交接依据。');
    if(journeyState().some(j=>j.source_system===v.source_system&&j.event_key===v.event_key.trim()))return toast('该来源事件已存在，不能重复创建旅程。');
    const j={id:journeyId(journeyState()),patient:p.id,kind:v.kind,entry_phase:v.entry_phase,source_system:v.source_system,event_key:v.event_key.trim(),event_at:v.event_at,status:'INTAKE',stage:0,version:0,owner:p.owner,doctor:p.doctor,skipped:[],logs:[],plans:[],cases:[],commands:{}};
    journeyState().push(j);journeyLog(j,'CREATED',v.identity_evidence+'；'+v.handoff_evidence);$('#dialog').close();go('/journeys/'+j.id);render();return;
  }
  const [jid,cid,act]=String(id).split(':'),j=journeyState().find(x=>x.id===Number(jid)),p=patient(j?.patient);
  if(!j||!mine(p))return toast('无权访问该旅程。');
  const code=journeyStep(j),doctor=account.role==='DOCTOR'&&account.id===p.doctor;
  if(!v){
    if(kind==='journey-handoff')return journeyDialog('本人确认交接',kind,j,field('evidence','接收依据与待办确认','textarea'));
    if(kind==='journey-status')return journeyDialog({PAUSE:'暂停旅程',RESUME:'恢复旅程',HANDOFF:'重新交接',EXIT:'退出本次旅程',WITHDRAW:'撤回本用途服务授权'}[cid],kind,j,field('action','动作','hidden',cid)+field('evidence','事实与依据','textarea'),'退出只停止本次旅程；撤回授权停止该患者全部未结束旅程，安全事项仍可处置。');
    if(kind==='journey-no-revisit')return journeyDialog('医生确认无需本轮复诊',kind,j,field('reason','医学确认依据','textarea')+field('evidence','核验凭据','textarea'));
    if(kind==='journey-plan-draft')return journeyDialog('提交本次事件个案计划',kind,j,field('plan_text','本次计划正文','textarea')+field('node_count','节点数','hidden',1)+'<div id="journey-nodes">'+journeyNodeFields(0)+'</div>'+button('添加计划节点','journey-node-add')+field('evidence','起草依据','textarea'),'按本次报告日期计算节点；审核通过生成任务。替换停止旧计划未完成任务，历史保留。');
    if(kind==='journey-plan-review')return journeyDialog('责任医生本人审核计划',kind,j,field('approved','审核结果','select','true',[{value:'true',label:'通过并生成任务'},{value:'false',label:'退回，不生成任务'}])+field('review_note','本人审核意见','textarea'));
    if(kind==='journey-case-open')return journeyDialog('登记待解决问题',kind,j,field('kind','问题类型','select','SERVICE',journeyOptions(caseTypes))+field('summary','摘要','textarea')+field('due_at','处理截止','datetime-local',journeyNow().slice(0,16))+field('evidence','来源依据','textarea'));
    if(kind==='journey-case-action')return journeyDialog('记录处理与反馈',kind,j,field('case_id','工单编号','hidden',cid)+field('action','动作','hidden',act)+field('evidence','实质结果或反馈核验依据','textarea'));
    if(kind==='journey-step')return journeyDialog(journeyPaths[j.kind][j.stage]?.title,kind,j,field('occurred_at','实际发生时间','datetime-local',journeyNow().slice(0,16))+field('evidence','结果与核验依据','textarea')+(code==='CLINICAL'?field('record_id','本次原报告','select','',demo.records.filter(r=>r.patient===p.id).map(r=>({value:r.id,label:'#'+r.id+' '+r.title}))):'')+(['ARRIVAL','CLOSE'].includes(code)?field('appointment_id','独立已到院预约编号','number','',[],code==='ARRIVAL'):'')+(code==='CLOSE'?field('outcome','本轮结果','select','VERIFIED',[{value:'VERIFIED',label:'独立复诊到院且诊疗结果已核验'},{value:'NONE',label:'医生确认无需本轮复诊'}])+field('satisfaction_status','满意度邀请结果','select','NOT_INVITED',[{value:'RATED',label:'已评分'},{value:'DECLINED',label:'拒绝评分'},{value:'NO_RESPONSE',label:'已邀请未回应'},{value:'NOT_INVITED',label:'尚未邀请'}])+field('satisfaction_score','实际评分（仅已评分填 1 至 5）','number','',[],false)+field('feedback','体验反馈与后续需求','textarea','',[],false):''),'随访需完成当前计划全部随访并由医生查收。退出使用独立按钮。');
    return;
  }
  const requestKey=v.request_id,fingerprint=JSON.stringify([kind,account.id,v]),prior=requestKey&&journeyState().map(x=>x.commands[requestKey]).find(Boolean);
  if(prior)return toast(prior===fingerprint?'重复请求已处理，未追加历史。':'同一操作编号的操作者或内容已变化。');
  if(Number(v.version)!==j.version||j.status==='CLOSED'||(j.status==='EXITED'&&!['journey-case-action','journey-case-open'].includes(kind)))return toast('记录版本或状态已变化，请刷新后处理。');
  if(!['journey-status','journey-case-open','journey-case-action','journey-handoff'].includes(kind)&&(j.status!=='ACTIVE'||!journeyAuthorized(p)||j.owner!==p.owner||['PAUSED','CLOSED'].includes(p.lifecycle)))return toast('服务暂停、授权失效或负责人变化，请核对交接。');
  let evidence=v.evidence||v.review_note||v.reason,ref='',nextStage=j.stage,nextStatus=j.status;
  if(!evidence?.trim()||evidence.length>2000)return toast('请填写有效依据（最多 2000 字）。');
  if(kind==='journey-handoff'){
    if(!canOperate()||account.id!==p.owner||j.status!=='INTAKE'||!journeyAuthorized(p))return toast('仅当前负责人本人可接收交接。');
    j.owner=p.owner;j.doctor=p.doctor;nextStatus='ACTIVE';if(j.stage===0){nextStage=j.entry_phase==='AFTER_CARE'?journeyPaths[j.kind].findIndex(s=>s.code==='CLINICAL'):1;j.skipped=j.entry_phase==='AFTER_CARE'?journeyPaths[j.kind].slice(1,nextStage).map(s=>s.code):[]}
  }else if(kind==='journey-status'){
    if(!canOperate())return toast('由运营或护士登记服务状态。');
    if(v.action==='PAUSE'&&j.status==='ACTIVE')nextStatus='PAUSED';
    else if(v.action==='RESUME'&&j.status==='PAUSED'&&journeyAuthorized(p)&&j.owner===p.owner&&!['PAUSED','CLOSED'].includes(p.lifecycle))nextStatus='ACTIVE';
    else if(v.action==='HANDOFF'&&['ACTIVE','PAUSED'].includes(j.status)){nextStatus='INTAKE';j.owner=p.owner}
    else if(v.action==='EXIT'&&['INTAKE','ACTIVE','PAUSED'].includes(j.status)){nextStatus='EXITED';journeyCancel(j)}
    else if(v.action==='WITHDRAW'){p.service_consent=false;for(const other of journeyState().filter(x=>x.patient===p.id&&['INTAKE','ACTIVE','PAUSED'].includes(x.status))){journeyCancel(other);if(other!==j){other.status='EXITED';other.version++;journeyLog(other,'AUTHORIZATION_WITHDRAWN',evidence)}}nextStatus='EXITED'}
    else return toast('不能执行此状态变更，请核对授权与交接。');
  }else if(kind==='journey-plan-draft'){
    if(!canOperate()||!['PLAN','FOLLOWUP','CLOSE'].includes(code)||!journeyRecord(j,j.record_id,p))return toast('医生核对本次报告后由团队起草计划。');
    let nodes;try{nodes=JSON.parse(v.nodes)}catch{return toast('计划节点格式无效。')}
    if(!v.plan_text?.trim()||!Array.isArray(nodes)||!nodes.length||nodes.length>60||!nodes.some(n=>n.task_type==='FOLLOWUP')||new Set(nodes.map(n=>n.seq)).size!==nodes.length||nodes.some(n=>!Number.isInteger(n.seq)||n.seq<1||n.seq>60||!Number.isInteger(n.offset_days)||n.offset_days<0||n.offset_days>1095||!['FOLLOWUP','REVISIT'].includes(n.task_type)||!['P0','P1','P2','P3'].includes(n.priority)||!['ENROLLMENT','D3','D7','D30','M3','M6','Y1','CUSTOM'].includes(n.stage)||!n.checklist?.trim()||!n.title?.trim()))return toast('核对计划节点序号、日期偏移、类型和内容，至少包含一个随访。');
    journeyCancel(j);if(journeyPlan(j))journeyPlan(j).status='SUPERSEDED';const plan={id:journeyId(j.plans),revision:j.plans.length+1,status:'DRAFT',record_id:j.record_id,snapshot:structuredClone(j.record_snapshot),text:v.plan_text,nodes:nodes.sort((a,b)=>a.seq-b.seq),tasks:[]};j.plans.push(plan);j.current_plan_id=plan.id;j.no_revisit=null;nextStage=journeyPaths[j.kind].findIndex(s=>s.code==='PLAN');ref='计划 v'+plan.revision;
  }else if(kind==='journey-plan-review'){
    const plan=journeyPlan(j);if(!doctor||code!=='PLAN'||plan?.status!=='DRAFT'||!journeyRecord(j,plan.record_id,p)||!['true','false'].includes(String(v.approved)))return toast('当前责任医生本人审核待审计划。');
    plan.status=String(v.approved)==='true'?'APPROVED':'REJECTED';plan.reviewer=p.doctor;plan.note=v.review_note;
    if(plan.status==='APPROVED'){for(const n of plan.nodes){const baseline=new Date(plan.snapshot.occurred_at);baseline.setDate(baseline.getDate()+n.offset_days);const t={id:journeyId(demo.tasks),patient:p.id,record:j.record_id,title:n.title,type:n.task_type,status:n.task_type==='FOLLOWUP'?'APPROVED':'PENDING',due:baseline.toISOString().slice(0,16),approved:n.checklist,draft:n.checklist,reviewer:p.doctor,journey_id:j.id,plan_id:plan.id,version:0};demo.tasks.push(t);plan.tasks.push(t.id)}nextStage=journeyPaths[j.kind].findIndex(s=>s.code==='FOLLOWUP')}
    ref='计划 v'+plan.revision;
  }else if(kind==='journey-no-revisit'){
    if(!doctor||!['FOLLOWUP','CLOSE'].includes(code)||!v.reason?.trim())return toast('当前责任医生在计划批准后说明无需复诊依据。');j.no_revisit={by:p.doctor,reason:v.reason};
  }else if(kind==='journey-case-open'){
    if(!canOperate()||!caseTypes[v.kind]||!v.summary?.trim()||!Number.isFinite(Date.parse(v.due_at))||Date.parse(v.due_at)>Date.now()+366*86400000)return toast('核对问题、类型与截止时间。');j.cases.push({id:journeyId(j.cases),kind:v.kind,status:'OPEN',summary:v.summary,due_at:v.due_at});
  }else if(kind==='journey-case-action'){
    const c=j.cases.find(x=>x.id===Number(v.case_id)),expected={ACCEPT:'OPEN',RESOLVE:'ACCEPTED',CLOSE:'RESOLVED'}[v.action];if(!c||c.status!==expected||(v.action==='CLOSE'?!canOperate():c.kind==='CLINICAL'?!doctor:!canOperate()))return toast('对应负责人按接单、处理、反馈核验顺序办理。');c.status={ACCEPT:'ACCEPTED',RESOLVE:'RESOLVED',CLOSE:'CLOSED'}[v.action];if(v.action==='RESOLVE')c.resolution=evidence;if(v.action==='CLOSE')c.receipt=evidence;
  }else if(kind==='journey-step'){
    if(code==='CLINICAL'?!doctor:(!canOperate()||['HANDOFF','PLAN','DONE'].includes(code)))return toast('须节点责任人员通过专用入口办理。');
    if(!Number.isFinite(Date.parse(v.occurred_at))||v.occurred_at<j.event_at||Date.parse(v.occurred_at)>Date.now())return toast('核对实际发生时间。');
    if(code==='DISCHARGE_HANDOFF'&&account.id!==p.owner)return toast('出院交接须当前负责人本人完成。');
    if(code==='CLINICAL'){const r=journeyRecord(j,v.record_id,p);if(!r)return toast('当前责任医生须查阅本次报告，不能复用另一旅程证据。');j.record_id=r.id;j.record_snapshot=structuredClone(r);ref='报告 #'+r.id}
    if(code==='FOLLOWUP'&&!journeyFollowupsDone(j,p))return toast('当前计划全部随访须完成且由当前责任医生查收。');
    if(['ARRIVAL','CLOSE'].includes(code)){
      if(code==='CLOSE'){
        if(!journeyFollowupsDone(j,p)||j.cases.some(c=>c.status!=='CLOSED')||demo.alerts.some(a=>a.patient===p.id&&a.status!=='CLOSED')||demo.tasks.some(t=>t.patient===p.id&&['ALERT','CONSULTATION'].includes(t.type)&&!['COMPLETED','CANCELLED'].includes(t.status)))return toast('仍有未完成随访、待医生查收或未结问题。');
        if(!['VERIFIED','NONE'].includes(v.outcome))return toast('退出单独登记，不能计为正常结案。');
        if(v.outcome==='NONE'&&j.no_revisit?.by!==p.doctor)return toast('无需复诊须当前责任医生确认。');
        if(!['RATED','DECLINED','NO_RESPONSE','NOT_INVITED'].includes(v.satisfaction_status)||(v.satisfaction_status==='RATED'?(!Number.isInteger(Number(v.satisfaction_score))||Number(v.satisfaction_score)<1||Number(v.satisfaction_score)>5):!!v.satisfaction_score))return toast('仅已评分可填写 1 至 5 分。');
      }
      if(code==='ARRIVAL'||v.outcome==='VERIFIED'){
        const a=demo.appointments.find(x=>x.id===Number(v.appointment_id)&&x.patient===p.id);
        if(!a||!a.arrived_at||!['ARRIVED','COMPLETED'].includes(a.status)||journeyState().some(o=>o.logs.some(l=>l.ref==='预约 #'+a.id)))return toast('须独立且未复用的实际到院预约。');
        if(code==='ARRIVAL'?(a.appointment_type!=='OUTPATIENT'||a.arrived_at<j.event_at):(a.appointment_type!=='REVISIT'||a.status!=='COMPLETED'||!a.outcome||a.arrived_at<=j.record_snapshot.occurred_at||a.id===j.arrival_id))return toast('核对预约类型、到院时间和复诊诊疗结果。');if(code==='ARRIVAL')j.arrival_id=a.id;ref='预约 #'+a.id;
      }
      if(code==='CLOSE'){const pending=(journeyPlan(j)?.tasks||[]).map(id=>demo.tasks.find(t=>t.id===id)).filter(t=>t?.type==='REVISIT'&&!['COMPLETED','CANCELLED'].includes(t.status));if(pending.length&&v.outcome!=='NONE')return toast('本次计划仍有未完成复诊任务。');if(v.outcome==='NONE')journeyCancel(j);j.satisfaction={status:v.satisfaction_status,score:v.satisfaction_status==='RATED'?Number(v.satisfaction_score):null,feedback:v.feedback||''};nextStatus='CLOSED'}
    }
    nextStage++;
  }else return;
  journeyLog(j,kind+(v.action?':'+v.action:''),evidence.trim(),ref);j.stage=nextStage;j.status=nextStatus;j.version++;if(requestKey)j.commands[requestKey]=fingerprint;$('#dialog').close();render();return true;
}

// Matches the implemented summary and cross-journey case queue.
function afterCarePage(){
  if(!canOperate()&&account?.role!=='DOCTOR')return forbidden();
  const rows=journeyVisible(),q=current.query,all=rows.flatMap(j=>j.cases.map(c=>({...c,journey:j}))),cases=all.filter(c=>(!q.get('status')||c.status===q.get('status'))&&(!q.get('kind')||c.kind===q.get('kind'))&&(!q.get('overdue')||(c.status!=='CLOSED'&&c.due_at<journeyNow())));
  const counts=[['进行中的服务旅程',rows.filter(j=>j.status==='ACTIVE').length],['待负责人交接',rows.filter(j=>j.status==='INTAKE').length],['待处理个案计划草稿',rows.flatMap(j=>j.plans).filter(p=>p.status==='DRAFT').length],['未结咨询 / 异常 / 投诉',all.filter(c=>c.status!=='CLOSED').length],['超过截止的未结问题',all.filter(c=>c.status!=='CLOSED'&&c.due_at<journeyNow()).length]],doctor=account.role==='DOCTOR';
  return page('诊后健康服务中心','<div class="patient-metrics">'+counts.map(([label,n])=>'<div><span>'+esc(label)+'</span><strong>'+n+'</strong></div>').join('')+'</div>'+card('办理入口','<div class="toolbar">'+link('就诊旅程与个案计划','/journeys','btn')+link('患者档案与文件上传','/patients','btn')+link(doctor?'查收随访结果':'执行与重试随访',doctor?'/doctor/results':'/followups','btn')+link(doctor?'查看原报告':'复诊办理',doctor?'/doctor/reports':'/revisits','btn')+link('既有异常任务',doctor?'/doctor/alerts':'/alerts','btn')+link('宣教与服务内容','/knowledge','btn')+'</div>')+card('跨旅程待办队列','<form data-form="journey-case-filter"><div class="toolbar">'+field('status','问题状态','select',q.get('status')||'',[{value:'',label:'全部问题状态'},...journeyOptions(journeyLabels.caseStatuses)],false)+field('kind','问题类型','select',q.get('kind')||'',[{value:'',label:'全部问题类型'},...journeyOptions(caseTypes)],false)+field('overdue','超时','select',q.get('overdue')||'',[{value:'',label:'全部截止时间'},{value:'true',label:'仅超时未结'}],false)+'<button>筛选</button></div></form>'+table(['患者 / 旅程','问题','类型','状态','截止','操作'],cases.map(c=>[patientCell(c.journey.patient)+' / #'+c.journey.id,esc(c.summary),esc(caseTypes[c.kind]),esc(journeyLabels.caseStatuses[c.status]),esc(c.due_at)+(c.status!=='CLOSED'&&c.due_at<journeyNow()?' · 超时':''),link('进入旅程处置','/journeys/'+c.journey.id,'btn')])) )+'<p>已通知不等于关闭。临床异常由责任医生接单并给出结果，运营和护士核验患者得到反馈。</p>');
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-action^="journey-"]');if(b)journeyAction(b.dataset.action,b.dataset.id)});
document.addEventListener('submit',e=>{const f=e.target.closest('[data-form^="journey-"]');if(!f)return;e.preventDefault();const v=Object.fromEntries(new FormData(f));if(f.dataset.form==='journey-case-filter'){go('/after-care?'+new URLSearchParams(v));return}if(f.dataset.form==='journey-plan-draft'){const nodes=[];for(let i=0;i<Number(v.node_count);i++)nodes.push(Object.fromEntries(['seq','stage','offset_days','task_type','title','priority','checklist'].map(k=>[k,['seq','offset_days'].includes(k)?Number(v[k+'_'+i]):v[k+'_'+i]])));v.nodes=JSON.stringify(nodes)}journeyAction(f.dataset.form,f.dataset.id,v)});
