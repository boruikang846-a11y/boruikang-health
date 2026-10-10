'use strict';
// Fictional in-memory continuity workflow prototype; no external requests.
function ccPlans(){return demo.continuousCare??=[]}
function ccDoctor(p){return account?.role==='DOCTOR'&&account.id===p.doctor}
function ccApproved(plan,p){return plan.approval==='APPROVED'&&plan.reviewer===p.doctor}
function ccPatientPreview(plan,p){return p.service_consent&&plan.status==='ACTIVE'&&ccApproved(plan,p)?'<p>'+esc(plan.instructions)+'</p><b>下次复盘：'+esc(plan.date)+'</b>'+(plan.message?'<p>医生阶段反馈：'+esc(plan.message)+'</p>':''):'<p>当前没有可展示的已审核长期安排。</p>'}
function ccPage(){
 const requested=current.query.get('patient'),p=requested?patient(requested):patients()[0];
 if(!p||!mine(p))return page('房颤连续管理','患者不可见','');
 const rows=ccPlans().filter(x=>x.patient===p.id);
 return page('诊后主动干预 · 房颤连续管理','虚构数据功能演示；跨次就医持续记录，临床内容由责任医生审核。',link('返回诊后工作区','/after-care','btn')+card(p.name+' 的服务摘要','<p>负责人：'+esc(person(p.owner)?.name)+' · 责任医生：'+esc(person(p.doctor)?.name)+'</p>'+link('查看原报告、任务与预约','/patients/'+p.id,'btn')+' '+(p.service_consent&&!rows.some(x=>x.status!=='CLOSED')?button('建立房颤长期计划','cc-save',p.id):''))+rows.map(plan=>card('房颤长期计划 · 第 '+plan.revision+' 版','<p>'+tag({ACTIVE:'管理中',PAUSED:'已暂停',CLOSED:'已结束'}[plan.status])+' '+tag(ccApproved(plan,p)?'审核通过':plan.approval==='APPROVED'?'责任医生须按当前授权重新审核':plan.approval==='REJECTED'?'已退回修改':'待责任医生审核')+'</p><h3>基线与目标</h3><p>'+esc(plan.baseline)+'</p><p>'+esc(plan.goals)+'</p><p>复盘日期：'+esc(plan.date)+'</p><h3>拟向患者展示的安排</h3><p>'+esc(plan.instructions)+'</p><div class="toolbar">'+(plan.status!=='CLOSED'&&p.service_consent?button('调整计划','cc-save',p.id)+(ccDoctor(p)&&!ccApproved(plan,p)?button('本人审核通过','cc-approve',p.id):'')+button('关联就医个案','cc-link',p.id)+(ccDoctor(p)&&ccApproved(plan,p)&&plan.status==='ACTIVE'?button('阶段复盘','cc-review',p.id):'')+button(plan.status==='ACTIVE'?'暂停管理':'恢复管理','cc-state',p.id)+(ccDoctor(p)?button('结束本周期','cc-close',p.id):''):'')+'</div><p>关联个案：'+plan.cases.map(id=>link('#AC'+id,'/after-care?case='+id)).join('、')+'</p>'+card('患者可见安排预览',ccPatientPreview(plan,p))+'<details><summary>版本与复盘记录（'+plan.history.length+'）</summary>'+plan.history.map(x=>'<p>'+esc({'cc-save':'保存新版本','cc-approve':'责任医生审核通过','cc-review':'责任医生阶段复盘','cc-reject':'责任医生退回修改','cc-link':'关联就医个案','cc-state':'变更管理状态','cc-close':'责任医生结束周期'}[x.kind]||x.kind)+' · v'+x.revision+' · '+esc(x.evidence)+'</p>').join('')+'</details>')).join(''));
}
function ccAction(action,id,v){
 const p=patient(id);if(!p||!mine(p)||!p.service_consent||['PAUSED','CLOSED'].includes(p.lifecycle))return toast('请核对患者范围、授权及在管状态。');
 let plan=ccPlans().filter(x=>x.patient===p.id&&x.status!=='CLOSED').at(-1);
 if(['cc-approve','cc-review','cc-close'].includes(action)&&!ccDoctor(p))return toast('须由当前责任医生本人办理。');
 if(action!=='cc-save'&&!plan)return toast('请先建立长期计划。');
 if(action==='cc-save'){
  if(!v)return modal('房颤长期计划',action,p.id,field('baseline','个人基线与资料来源','textarea',plan?.baseline||'')+field('goals','管理目标与复查安排','textarea',plan?.goals||'')+field('instructions','审核后患者可见安排','textarea',plan?.instructions||'')+field('date','下次复盘日期','date',plan?.date||'')+field('evidence','建立或调整依据','textarea'),'保存后须责任医生审核；演示不会向患者发送消息。');
  if(!['baseline','goals','instructions','date','evidence'].every(k=>v[k]?.trim()))return toast('请填写完整计划与依据。');
  if(!plan){plan={patient:p.id,status:'ACTIVE',revision:0,cases:[],history:[]};ccPlans().push(plan)}
  if(plan.revision)plan.history.push({kind:'历史版本快照',revision:plan.revision,evidence:plan.goals,snapshot:structuredClone({...plan,history:[]})});
  Object.assign(plan,{baseline:v.baseline,goals:v.goals,instructions:v.instructions,date:v.date,approval:'PENDING',revision:plan.revision+1,message:null});
 }else{
  if(!v)return modal(action==='cc-link'?'关联同一患者的就医个案':action==='cc-review'?'责任医生阶段复盘':'办理长期计划',action,p.id,(action==='cc-link'?field('case','就医个案','select','',acCases().filter(c=>c.patient===p.id&&!plan.cases.includes(c.id)).map(c=>({value:c.id,label:'#AC'+c.id+' '+acPaths[c.kind].label}))):'')+(action==='cc-review'?field('message','提供给患者的结果与下一步','textarea')+field('date','下次复盘日期','date',plan.date):'')+field('evidence','依据与结果','textarea'));
  if(!v.evidence?.trim())return toast('请填写办理依据。');
  if(action==='cc-approve'){plan.approval='APPROVED';plan.reviewer=account.id}
  else if(action==='cc-link'){const c=acCases().find(c=>c.id===Number(v.case)&&c.patient===p.id);if(!c)return toast('就医个案必须属于本患者。');if(!plan.cases.includes(c.id))plan.cases.push(c.id)}
  else if(action==='cc-review'){if(!ccApproved(plan,p)||plan.status!=='ACTIVE'||!v.message?.trim()||!v.date)return toast('请核实审核状态并填写患者反馈与下次日期。');plan.message=v.message;plan.date=v.date}
  else if(action==='cc-state')plan.status=plan.status==='ACTIVE'?'PAUSED':'ACTIVE';
  else if(action==='cc-close')plan.status='CLOSED';
  else return;
 }
 plan.history.push({kind:action,revision:plan.revision,evidence:v.evidence,actor:account.id});audit('房颤连续管理：'+v.evidence,p.id);$('#dialog').close();render();
}
const ccPreviousAfterCare=afterCarePage;
afterCarePage=function(){return current.query.get('tab')==='continuity'?ccPage():ccPreviousAfterCare()};
document.addEventListener('click',e=>{const b=e.target.closest('[data-action^="cc-"]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();ccAction(b.dataset.action,b.dataset.id)},true);
document.addEventListener('submit',e=>{const f=e.target.closest('[data-form^="cc-"]');if(!f)return;e.preventDefault();e.stopImmediatePropagation();ccAction(f.dataset.form,f.dataset.id,Object.fromEntries(new FormData(f)))},true);
render();
