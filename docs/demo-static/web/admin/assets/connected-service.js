'use strict';
// 2.2 navigation and fictional state shared with the existing patient, case and plan ledgers.
function csState(){return demo.connectedService??={entries:[],serial:0,seeded:false}}
function csPatient(){const id=current.query.get('patient');return id?patient(id):patients()[0]}
function csEntry(p){return csState().entries.filter(e=>e.patient===p.id).at(-1)}
function csValid(e){return !!e&&!e.revoked&&Date.parse(e.expires)>Date.now()}
function csGranted(p,e=csEntry(p)){return csValid(e)&&e.status==='VERIFIED'&&p.service_consent&&e.grant===p.serviceGrant}
function csStatus(e){return !e?'未签发':e.revoked?'已撤销':!csValid(e)?'已过期':({ISSUED:'待患者登记',REGISTERED:'待人工核实',VERIFIED:'已核实，可查看'})[e.status]}
function csActiveCase(p){return acCases().filter(c=>c.patient===p.id&&!c.closed&&acExtras(c).status==='ACTIVE').at(-1)}
function csIssues(p){return acCases().filter(c=>c.patient===p.id).flatMap(c=>c.issues.map((issue,index)=>({c,issue,index})))}
function csOtherIssues(p){return demo.alerts.filter(x=>x.patient===p.id&&x.status!=='CLOSED').map(x=>({title:x.title,kind:x.kind,status:x.status,tab:'alerts'})).concat(consultationState().filter(x=>x.patient===p.id&&x.status!=='CLOSED').map(x=>({...x,tab:'consultations'})))}
function csIssueStatus(x){return x.closed?'已核验关闭':x.resolution?'已有处理结果，待反馈核验':x.accepted?'正在处理':'等待接单'}
function csRole(x){return x.kind==='CLINICAL'?'责任医生':'服务团队'}
function csNext(x){return x.closed?'本次反馈已完成，可继续提交新问题。':x.resolution?'请查看团队发布的回复，团队将核实您是否已获得反馈。':x.accepted?'责任人员正在处理，将向您说明结果和下一步。':'等待责任人员接单。'}
function csDate(value){if(!value)return '未记录';return String(value).endsWith('Z')?new Date(value).toLocaleString('zh-CN',{hour12:false}):String(value).slice(0,16).replace('T',' ')}
function csLink(label,tab,p,cls='btn'){return link(label,'/after-care?tab='+tab+'&patient='+p.id,cls)}
function csToolbar(p,active){return '<nav class="cs-nav" aria-label="持续服务入口">'+(canOperate()?link('01 · 企微受邀服务','/wecom?tab=service&patient='+p.id,'btn '+(active==='service'?'primary':'')):'')+csLink('02 · 患者统一视图','summary',p,'btn '+(active==='summary'?'primary':''))+csLink('03 · 房颤连续管理','continuity',p,'btn '+(active==='continuity'?'primary':''))+'</nav>'}
function csDemoTools(p){return '<details class="cs-demo-tools"><summary>切换工作角色</summary><div class="toolbar">'+button('以服务负责人体验','cs-role',p.id+':team')+button('以责任医生体验','cs-role',p.id+':doctor')+button('以主管体验','cs-role',p.id+':manager')+'</div></details>'}

function csContext(p,active){return '<section class="service-patient-context"><div><strong>当前患者：'+esc(p.name)+'</strong><small>责任医生 '+esc(person(p.doctor)?.name)+' · 服务负责人 '+esc(person(p.owner)?.name)+'</small></div><form data-form="cs-context"><input type="hidden" name="tab" value="'+esc(active)+'"><label class="sr-only" for="cs-patient">选择患者</label><select id="cs-patient" name="patient">'+patients().map(x=>'<option value="'+x.id+'"'+(x.id===p.id?' selected':'')+'>'+esc(x.name)+'</option>').join('')+'</select><button type="submit">切换患者</button></form></section>'}
function csShell(p,active){return csToolbar(p,active)+csContext(p,active)+csDemoTools(p)}
function csPhone(p){
 const e=csEntry(p);let body='';
 if(!csValid(e))body='<h3>受邀服务入口</h3><p>'+(!e?'请先由服务团队签发入口。':'当前入口已失效，请联系服务团队重新签发。')+'</p>';
 else if(e.status==='ISSUED')body='<h3>欢迎登记受邀服务</h3><p>服务提供方：博瑞康<br>服务医院：江阴人民医院心血管科</p><p>登记后由工作人员核实身份与本用途授权，核实前不展示患者健康资料。</p>'+button('填写登记与授权','cs-register',p.id,'primary');
 else if(e.status==='REGISTERED')body='<h3>登记已提交</h3><p>服务团队正在核实身份和授权，完成后即可查看安排。</p><span class="cs-pill">等待人工核实</span>';
 else if(!csGranted(p,e))body='<h3>服务授权已变化</h3><p>请联系团队重新签发、登记并核实。</p>';
 else{
  const plan=ccPlans().filter(x=>x.patient===p.id&&x.status!=='CLOSED').at(-1),c=csActiveCase(p);
  const own=csIssues(p).filter(({issue})=>issue.entryContact===e.contact);
  body='<span class="cs-pill">受邀服务 · 已核实</span><h3>'+esc(p.name)+'</h3><p>服务团队：'+esc(person(p.owner)?.name)+'<br>责任医生：'+esc(person(p.doctor)?.name)+'</p><section><h4>当前安排</h4>'+(plan?ccPatientPreview(plan,p):'<p>团队正在准备服务安排，确认后将在这里展示。</p>')+'</section><section><h4>本次服务</h4><p>'+(c?esc(acPaths[c.kind].label)+' · '+esc(typeof hjCaseLabel==='function'?hjCaseLabel(c):acPaths[c.kind].steps[c.stage]||'等待下一步安排'):'本次旅程已结束，长期管理状态单独记录。')+'</p></section><section><h4>我的反馈</h4>'+(c?button('提交服务 / 临床反馈','cs-feedback',p.id,'primary'):'<p>请联系团队安排后续服务。</p>')+(own.length?own.map(({issue:x})=>'<article class="cs-feedback"><b>'+esc(csIssueStatus(x))+'</b><p>'+esc(x.note)+'</p><small>由'+csRole(x)+'处理</small>'+(x.patientReply?'<p class="cs-reply">团队回复：'+esc(x.patientReply)+'</p>':'<p>尚未发布面向您的回复。</p>')+'<p>'+csNext(x)+'</p></article>').join(''):'<p>暂无已提交反馈。</p>')+'</section>'+button('撤回本用途服务授权','cs-withdraw',p.id);
 }
 return '<aside class="cs-phone"><div class="cs-phone-label">患者 H5 同步预览 <span>虚构演示</span></div><div class="cs-phone-screen">'+body+'</div><p class="cs-phone-foot">博瑞康受邀服务 · 当前入口 '+esc(e?'#E'+e.id:'未签发')+'<br>仅展示当前授权范围内的内容</p></aside>';
}
function csWecom(){
 const p=csPatient();if(!p||!mine(p)||!canOperate())return forbidden();
 const e=csEntry(p),history=csState().entries.filter(x=>x.patient===p.id);
 const buttons=button(e?'续签受邀入口':'签发受邀入口','cs-issue',p.id,'primary')+(e&&csValid(e)&&e.status==='REGISTERED'?button('人工核实登记与授权','cs-verify',p.id):'')+(e&&csValid(e)?button('撤销当前入口','cs-revoke',p.id):'');
 const stages=['签发入口','患者登记','人工核实','查看与反馈'];
 const n=!csValid(e)?0:e.status==='ISSUED'?1:e.status==='REGISTERED'?2:csGranted(p,e)?4:2;
 return page('企业微信 · 受邀服务',csShell(p,'service')+'<div class="cs-channel"><div><strong>博瑞康企业微信</strong><p>企微所有者与患者所属医院分别记录</p></div><span class="cs-pill pending">真实通道待联调</span></div><div class="cs-layout"><div>'+card('受邀服务办理','<ol class="cs-steps">'+stages.map((s,i)=>'<li class="'+(i<n?'done':'')+'"><span>'+String(i+1).padStart(2,'0')+'</span>'+s+'</li>').join('')+'<p>当前入口：<b>'+csStatus(e)+'</b>'+(e?' · 有效至 '+esc(csDate(e.expires)):'')+'</p><div class="toolbar">'+buttons+'</div><p>本原型签发只更新内存，不发送消息。续签后旧入口失效，患者需重新登记和人工核实。</p>'+(e?.registration?'<div class="cs-fact"><b>待核实登记</b><p>'+esc(e.registration.name)+' · '+esc(e.registration.relation==='FAMILY'?'家属代办':'本人')+'</p><p>用途：诊后服务与房颤连续管理 · 授权版本 patient-service-2.1-brk</p></div>':''))+card('入口与核实记录',table(['入口 / 联系人','状态','核实依据'],history.map(x=>['#E'+x.id+'<br>'+esc(x.contact),csStatus(x),esc(x.evidence||'尚未核实')]))+'<p>同一联系人的反馈保留；新的联系人不会看到另一位家属的反馈。</p>')+card('办理后继续',csLink('打开患者统一视图','summary',p)+' '+csLink('准备房颤长期计划','continuity',p))+'</div>'+csPhone(p)+'</div>'+link('查看联系人与消息通道基线','/wecom?tab=contacts&patient='+p.id,'btn'));
}
function csSummary(){
 const p=csPatient();if(!p||!mine(p))return forbidden();
 const plans=ccPlans().filter(x=>x.patient===p.id),active=plans.find(x=>x.status!=='CLOSED'),cases=acCases().filter(c=>c.patient===p.id),issues=csIssues(p).filter(x=>!x.issue.closed),tasks=demo.tasks.filter(t=>t.patient===p.id&&!['COMPLETED','CANCELLED'].includes(t.status)),records=demo.records.filter(r=>r.patient===p.id),appointments=demo.appointments.filter(a=>a.patient===p.id),data=cases.flatMap(c=>(c.data||[]).map(x=>({...x,caseId:c.id}))),e=csEntry(p),otherIssues=csOtherIssues(p);
 const next=!csGranted(p)?'先完成受邀登记与人工核实':!active?'准备房颤长期计划':!ccApproved(active,p)?'等待责任医生审核长期安排':issues.length+otherIssues.length?'处理患者未结问题':'按已审核计划继续随访';
 const stats=[['待办任务',tasks.length,'followups'],['未结问题',issues.length+otherIssues.length,'summary'],['就医个案',cases.length,'overview'],['长期计划版本',active?.revision||'—','continuity']];
 const feedback=csIssues(p).map(({c,issue:x,index})=>[esc(x.note)+'<br><small>'+esc(x.entryContact?'受邀患者反馈':'个案登记')+'</small>',csRole(x)+'<br>'+esc(csIssueStatus(x)),esc(x.patientReply||'尚未发布患者回复'),link('进入问题办理','/after-care?case='+c.id+'&patient='+p.id,'btn')+(!x.closed&&x.resolution&&(x.kind==='CLINICAL'?ccDoctor(p):canOperate())?button('发布患者回复','cs-reply',p.id+':'+c.id+':'+index):'')]);
 return page('诊后患者统一视图',csShell(p,'summary')+'<section class="cs-hero"><div><span>连续服务档案 · #'+p.id+'</span><h2>'+esc(p.name)+'</h2><p>'+esc(p.department)+' · '+esc(p.disease||'病种待核实')+'<br>来源 '+esc(p.source==='HOSPITAL_MOCK'?'医院 Mock 虚构数据':p.source==='MANUAL'?'人工补录':p.source)+' / '+esc(p.external||'人工补录')+'</p></div><div class="cs-hero-next"><small>下一步</small><strong>'+next+'</strong><p>服务负责人 '+esc(person(p.owner)?.name)+'<br>责任医生 '+esc(person(p.doctor)?.name)+'</p></div></section><div class="cs-stats">'+stats.map(([title,n,tab])=>'<a class="btn" href="#/after-care?tab='+tab+'&amp;patient='+p.id+'"><small>'+title+'</small><b>'+n+'</b></a>').join('')+'</div><div class="cs-layout"><div>'+card('管理目标与最近报告','<p><b>当前目标：</b>'+esc(active?.goals||'待团队准备并由责任医生确认')+'</p><p>长期管理 '+esc(active?({ACTIVE:'进行中',PAUSED:'已暂停',CLOSED:'已结束'})[active.status]:'尚未建立')+' · 受邀入口 '+csStatus(e)+' · 服务授权 '+(p.service_consent?'有效':'已撤回')+'</p>'+table(['报告 / 来源','医生意见'],records.slice(-3).map(r=>[esc(r.title)+'<br><small>'+esc(r.type)+' · '+esc(csDate(r.occurred_at))+'</small>',esc(r.opinion||'待责任医生查看并记录意见')])))+card('下一项任务与负责人',table(['任务 / 期限','状态 / 责任人','办理'],tasks.map(t=>[esc(t.title)+'<br>'+esc(csDate(t.due)),tag(t.status)+'<br>'+esc(person(t.status==='PENDING_REVIEW'?p.doctor:p.owner)?.name),link('打开任务',(account.role==='DOCTOR'?'/doctor/reviews/':'/followups/')+t.id+'?patient='+p.id,'btn')])))+card('本次与历次就医',table(['就医个案','旅程状态','长期计划关联','办理'],cases.map(c=>['#AC'+c.id+' · '+esc(acPaths[c.kind].label)+'<br><small>'+esc(c.eventKey||'就医事件待补充')+'</small>',c.closed?'本次已结案':esc(typeof hjCaseLabel==='function'?hjCaseLabel(c):acPaths[c.kind].steps[c.stage]||acStateLabels[c.status]),active?.cases.includes(c.id)?'已关联 v'+active.revision:'尚未关联',link('进入个案',typeof hjCaseLink==='function'?hjCaseLink(c):'/after-care?case='+c.id+'&patient='+p.id,'btn')])))+card('患者反馈与处理进度',feedback.length?table(['问题','处理责任 / 状态','患者可见回复','办理'],feedback):'<p>暂无问题，患者提交后将进入既有个案问题队列。</p>')+(otherIssues.length?card('原台账未结问题',table(['问题','状态','办理'],otherIssues.map(x=>[esc(x.title),tag(({IN_PROGRESS:'处理中',OPEN:'处理中',WAIT_CLINICAL:'待医生处理',RESOLVED:'待反馈核验'})[x.status]||x.status),csLink(x.tab==='alerts'?'进入异常处理':'进入咨询工单',x.tab,p)]))):'')+card('预约与结果证据',table(['预约','台账状态','证据边界'],appointments.map(a=>[esc(csDate(a.at||a.scheduled_at)),tag(a.status),esc(a.arrival_evidence||'尚无独立到院证据；预约不代表到院')]))+'<div class="cs-evidence">已发送 → 已联系 → 已预约 → 患者自述到院 → 人工核验到院 → 医院数据核验到院</div><p>依次记录证据类型；时间先后不直接作为服务促成到院的因果证据。</p>')+card('历次指标与来源',data.length?table(['记录时间 / 个案','指标内容','来源 / 核实'],data.map(d=>[esc(csDate(d.at))+'<br>#AC'+d.caseId,esc(d.kind)+' · '+esc(d.value),esc(d.source)+'<br>'+(d.verified?'责任医生已核实':'待核实')])):'<p>尚无指标记录。后续沿用个案记录，不补零，不自动计算医学风险。</p>')+'</div><div>'+csPhone(p)+card('继续办理','<div class="cs-action-list">'+csLink('原档案与报告','archive',p)+csLink('随访任务','followups',p)+csLink('个案与计划审核','plans',p)+csLink('复诊核验台账','revisits',p)+csLink('房颤长期管理','continuity',p)+'</div>')+'</div></div>');
}
function csSeed(){
 if(csState().seeded)return;
 const p=patient(1001);p.disease='房颤 · 虚构案例';p.service_consent=true;p.serviceGrant=1;
 const c=acCases().find(x=>x.id===1001);acExtras(c);c.consent=true;c.handoff=true;c.eventKey='DEMO-AF-20261001';
 const history=structuredClone(c);Object.assign(history,{id:91001,closed:true,stage:acPaths[c.kind].steps.length,eventKey:'DEMO-AF-20260901',logs:[],issues:[],data:[]});acCases().push(history);
 const e={id:++csState().serial,patient:p.id,contact:'DEMO-WECOM-1001',status:'REGISTERED',expires:new Date(Date.now()+7*86400000).toISOString(),registration:{name:p.name,relation:'SELF',consent:true}};csState().entries.push(e);
 if(!ccPlans().some(x=>x.patient===p.id&&x.status!=='CLOSED'))ccPlans().push({patient:p.id,status:'ACTIVE',revision:1,approval:'PENDING',baseline:'依据本患者虚构出院报告，待责任医生确认房颤管理基线。',goals:'连续记录两次就医与随访情况，核对原医嘱和待确认事项。具体目标由责任医生确认。',instructions:'请按已核对的原医嘱执行；服务团队将与您确认下次随访安排。',date:'2026-10-30',cases:[history.id,c.id],history:[{kind:'示例草稿',revision:1,evidence:'虚构案例预填内容，尚未审核',actor:4}]});
 csState().seeded=true;
}
function csAction(action,id,v){
 if(action==='cs-context'){if(!v||!['service','summary','continuity'].includes(v.tab)||!mine(patient(v.patient)))return toast('请选择可见患者。');go((v.tab==='service'?'/wecom?tab=service':'/after-care?tab='+v.tab)+'&patient='+Number(v.patient));render();return}
 if(action==='cs-start'){if(!account)account=person(4);if(!canOperate()&&!ccDoctor(patient(1001)))return toast('请切换医护或运营演示角色。');csSeed();go('/after-care?tab=summary&patient=1001');render();return}
 const [pid,cid,ix]=String(id).split(':'),p=patient(pid);
 if(!p||!mine(p))return toast('患者不在当前角色范围内。');
 if(action==='cs-role'){
  const target=cid==='doctor'?person(p.doctor):cid==='team'?person(p.owner):cid==='manager'?person(1):null;
  if(!target?.active)return toast('演示账号不可用。');account=target;go('/after-care?tab=summary&patient='+p.id);render();return;
 }
 let e=csEntry(p);const fail=msg=>toast(msg),save=label=>{audit('受邀服务原型：'+label,p.id);$('#dialog').close();render();toast(label+'（虚构演示）')};
 if(['cs-issue','cs-verify','cs-revoke'].includes(action)&&!canOperate())return fail('由负责患者的服务团队办理。');
 if(action==='cs-issue'){
  if(!v)return modal(e?'续签受邀入口':'签发受邀入口',action,p.id,field('contact','已人工绑定的企微联系人演示编号','text',e?.contact||'DEMO-WECOM-'+p.id)+field('evidence','签发依据 / 联系人绑定核实记录','textarea'),'仅生成本地演示入口，不调用企微。续签须重新登记、核实。');
  if(!v.contact?.trim()||!v.evidence?.trim())return fail('请填写联系人和依据。');
  if(e)e.revoked=true;
  csState().entries.push({id:++csState().serial,patient:p.id,contact:v.contact.trim(),status:'ISSUED',expires:new Date(Date.now()+7*86400000).toISOString(),issuedEvidence:v.evidence});save('已签发新入口');return;
 }
 if(!csValid(e))return fail('当前受邀入口已失效，请重新签发。');
 if(action==='cs-register'){
  if(e.status!=='ISSUED')return fail('请勿重复登记。');
  if(!v)return modal('患者登记与本用途授权',action,p.id,field('name','登记人姓名（使用虚构姓名）','text')+field('relation','登记身份','select','SELF',[{value:'SELF',label:'患者本人'},{value:'FAMILY',label:'家属代办'}])+field('consent','诊后服务与房颤连续管理授权','select','',[{value:'',label:'请选择'},{value:'YES',label:'已阅读并同意本用途服务授权'}]),'博瑞康为江阴人民医院心血管科患者提供受邀服务；登记交工作人员人工核实，不自动合并患者。');
  if(!v.name?.trim()||!['SELF','FAMILY'].includes(v.relation)||v.consent!=='YES')return fail('请填写登记身份并确认授权。');
  e.registration={name:v.name.trim(),relation:v.relation,consent:true};e.status='REGISTERED';save('登记已提交，等待人工核实');return;
 }
 if(action==='cs-verify'){
  if(e.status!=='REGISTERED')return fail('请先完成患者登记。');
  if(!v)return modal('人工核实身份、绑定与授权',action,p.id,field('evidence','核实依据（代办须核实关系及授权范围）','textarea'),'确认登记人与当前患者的关系，保持企微主体、医院、联系人及患者绑定一致。');
  if(!v.evidence?.trim())return fail('请填写人工核实依据。');
  p.serviceGrant=(p.serviceGrant||0)+1;p.service_consent=true;e.grant=p.serviceGrant;e.status='VERIFIED';e.evidence=v.evidence;save('身份与授权已核实，长期安排须按当前授权审核');return;
 }
 if(action==='cs-revoke'||action==='cs-withdraw'){
  if(action==='cs-withdraw'&&!csGranted(p,e))return fail('当前无可撤回的有效患者授权。');
  if(!v)return modal(action==='cs-withdraw'?'撤回本用途服务授权':'撤销当前受邀入口',action,p.id,field('evidence','办理原因','textarea'));
  if(!v.evidence?.trim())return fail('请填写办理原因。');
  e.revoked=true;if(action==='cs-withdraw'){p.service_consent=false;p.serviceGrant=(p.serviceGrant||0)+1;for(const c of acCases().filter(x=>x.patient===p.id&&!x.closed)){c.status='WITHDRAWN';c.statusReason=v.evidence}}
  e.revocationReason=v.evidence;save(action==='cs-withdraw'?'已撤回服务授权':'当前入口已撤销');return;
 }
 if(action==='cs-feedback'){
  if(!csGranted(p,e))return fail('请先完成身份与授权核实。');const c=csActiveCase(p);if(!c)return fail('请联系团队安排新的服务旅程。');
  if(!v)return modal('提交患者反馈',action,p.id,field('kind','反馈类别','select','SERVICE',[{value:'SERVICE',label:'服务协调问题'},{value:'CLINICAL',label:'临床问题，交责任医生'}])+field('note','具体问题与需要帮助的事项','textarea'),'提交后可查看处理角色、进度与已发布回复。');
  if(!v.note?.trim()||!['SERVICE','CLINICAL'].includes(v.kind))return fail('请核对问题类别和内容。');
  c.issues.push({kind:v.kind,note:v.note.trim(),accepted:false,closed:false,entryContact:e.contact,entryId:e.id});acLog(c,'受邀患者提交反馈',v.note);save('反馈已进入本次个案问题队列');return;
 }
 if(action==='cs-reply'){
  const c=acCases().find(x=>x.id===Number(cid)&&x.patient===p.id),x=c?.issues[Number(ix)];
  if(!x?.resolution||x.closed||!csGranted(p,e)||(x.kind==='CLINICAL'?!ccDoctor(p):!canOperate()))return fail('请核实授权、处理结果与回复责任人。');
  if(!v)return modal('发布患者可见回复',action,id,field('reply','患者可见的处理结果与下一步','textarea',x.patientReply||''),'内部处理记录不会自动公开。发布回复后仍需核验患者是否获得反馈。');
  if(!v.reply?.trim())return fail('请填写患者可见回复。');x.patientReply=v.reply.trim();acLog(c,'发布患者可见回复',v.reply);save('患者回复已发布，仍需反馈核验');
 }
}

// Reuse the existing handlers for clinical review and case resolution; bind approvals to current consent.
const csOriginalApproved=ccApproved,csOriginalAction=ccAction;
ccApproved=function(plan,p){return csOriginalApproved(plan,p)&&(plan.grant??0)===(p.serviceGrant??0)};
ccAction=function(action,id,v){
 const p=patient(id),plan=ccPlans().filter(x=>x.patient===Number(id)&&x.status!=='CLOSED').at(-1);
 if(action==='cc-reject'){
  if(!p||!mine(p)||!ccDoctor(p)||!p.service_consent||!plan||['PAUSED','CLOSED'].includes(p.lifecycle))return toast('仅当前责任医生可退回有效计划。');
  if(!v)return modal('退回房颤长期计划',action,id,field('evidence','退回原因与修改要求','textarea'));
  if(!v.evidence?.trim())return toast('请填写退回依据。');plan.approval='REJECTED';plan.message=null;plan.history.push({kind:action,revision:plan.revision,evidence:v.evidence,actor:account.id});audit('退回房颤计划：'+v.evidence,p.id);$('#dialog').close();render();return;
 }
 if(v&&['cc-save','cc-review'].includes(action)&&(!/^\d{4}-\d{2}-\d{2}$/.test(v.date||'')||!Number.isFinite(Date.parse(v.date))||new Date(v.date).toISOString().slice(0,10)!==v.date))return toast('请填写有效复盘日期。');
 const before=plan?.history.length;csOriginalAction(action,id,v);
 if(action==='cc-approve'&&plan?.history.length>before&&plan.approval==='APPROVED'){plan.grant=p.serviceGrant??0;plan.message=null;render()}
};
const csOriginalCare=afterCarePage,csOriginalWecom=wechatChannelPage,csOriginalLogin=login;
afterCarePage=function(){
 if(current.query.get('tab')==='summary')return csSummary();
 const html=csOriginalCare();
 if(current.query.get('tab')==='continuity'){
  const p=csPatient();if(!p||!mine(p))return html;
  const plan=ccPlans().filter(x=>x.patient===p.id&&x.status!=='CLOSED').at(-1);
  return serviceInsert(html,csShell(p,'continuity'))+(ccDoctor(p)&&plan&&p.service_consent?card('医生审核反馈',button('退回并说明修改要求','cc-reject',p.id)):'');
 }
 const p=current.query.get('patient')?csPatient():null;if(p&&mine(p))return serviceInsert(html,csToolbar(p,current.query.get('tab')));
 return serviceInsert(html,card('2.2 · 企微与患者持续服务',button('载入房颤虚构案例','cs-start','','primary')+'<p>统一查看受邀服务、患者档案与跨次就医的长期安排。</p>'));
};
wechatChannelPage=function(path){return path==='/wecom'&&current.query.get('tab')!=='contacts'?csWecom():serviceInsert(csOriginalWecom(path),link('返回受邀服务','/wecom?tab=service','btn'))};
login=function(){return '<section class="cs-welcome"><div><small>虚构数据演示</small><h2>从一次服务，到持续连接。</h2><p>博瑞康企微受邀服务 · 诊后患者统一视图 · 房颤连续管理</p></div>'+button('体验房颤虚构案例','cs-start','','primary')+'</section>'+csOriginalLogin()};
servicePostStages[0][2].unshift('summary');servicePostStages[2][2].push('continuity');serviceTabLabels.summary='患者统一视图';serviceTabLabels.continuity='房颤连续管理';
document.addEventListener('click',e=>{const b=e.target.closest('[data-action^="cs-"]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();csAction(b.dataset.action,b.dataset.id)},true);
document.addEventListener('submit',e=>{const f=e.target.closest('[data-form^="cs-"]');if(!f)return;e.preventDefault();e.stopImmediatePropagation();csAction(f.dataset.form,f.dataset.id,Object.fromEntries(new FormData(f)))},true);
if(document.body.dataset.demoEntry==='continuity'){account=person(4);csSeed();location.hash='#/after-care?tab=summary&patient=1001'}
render();
