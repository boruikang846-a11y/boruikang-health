'use strict';

// Navigation composition only: all mutations still use the existing role-checked handlers.
const serviceOriginalScreening=screening,serviceOriginalAfterCare=afterCarePage,serviceOriginalJourney=journeyPage,serviceOriginalAcVisible=acVisible,serviceOriginalEnrollmentRows=enrollmentRows;
const servicePreStages=[
  ['intake','筛查对象接入',['ledger','pool','network','reconcile'],'ledger'],
  ['review','医生分层复核',['queue'],'queue'],
  ['invite','主动联系与邀约',['intervention','invitations'],'intervention'],
  ['arrival','预约与到诊核实',['appointments'],'appointments'],
  ['referral','转诊与承接',['referrals'],'referrals'],
  ['handoff','入组与诊后交接',['handoff'],'handoff']
];
const servicePostStages=[
  ['archive','患者档案与依据',['patients','archive','reports'],'patients'],
  ['case','门诊 / 住院 / 体检服务',['overview'],'overview'],
  ['plan','个案计划与医生审核',['plans','reviews'],'plans'],
  ['followup','随访、咨询与反馈',['followups','consultations','results'],'followups'],
  ['issue','异常处理与转诊',['alerts','referrals'],'alerts'],
  ['revisit','邀约、复诊与结案',['invitations','appointments','revisits'],'revisits']
];
const serviceTabLabels={ledger:'回访邀约台账',pool:'待建档筛查对象',network:'筛查来源接入',reconcile:'源表指标核对',queue:'分层复核',intervention:'分层干预',invitations:'邀约记录',appointments:'预约到诊',referrals:'转诊承接',handoff:'服务入组交接',patients:'患者档案清单',archive:'当前患者档案',reports:'原报告',overview:'个案服务工作区',plans:'个案计划',reviews:'待医生审核',followups:'随访执行',consultations:'咨询工单',results:'医生结果查收',alerts:'异常处理',revisits:'复诊跟踪'};

function servicePatientUrl(path,id,flow){
  const at=path.indexOf('?'),base=at<0?path:path.slice(0,at),q=new URLSearchParams(at<0?'':path.slice(at+1));
  if(id)q.set('patient',String(id));
  if(flow==='screening'||flow==='after-care')q.set('flow',flow);
  return base+(q.toString()?'?'+q:'');
}
function serviceFlow(path=current.path){
  if(path==='/screening'||path.startsWith('/screening/'))return 'screening';
  return current.query.get('flow')==='screening'&&/^\/(invitations|appointments|referrals)(\/|$)/.test(path)?'screening':'after-care';
}
function serviceNavParent(path){
  if(/^\/(journeys?|enrollment|workbench|doctor)$/.test(path)||path.startsWith('/journeys/'))return '/journeys';
  if(/^\/screening(\/|$)/.test(path))return '/screening';
  if(/^\/(invitations|appointments|referrals)(\/|$)/.test(path))return '/'+serviceFlow(path);
  if(/^\/(patients|followups|alerts|revisits|in-care|ai-reports|risk-review|care-plans|longitudinal)(\/|$)/.test(path)||path.startsWith('/doctor/'))return '/after-care';
  if(path==='/data-ingestion')return '/hospital';
  if(['/analytics'].includes(path))return '/reports';
  return path;
}
function serviceRouteAllowed(path){
  if(!account)return false;
  if(menu().some(([entry])=>path===entry||path.startsWith(entry+'/')))return true;
  if(account.role==='PLATFORM_ADMIN')return false;
  const shared=/^\/(journeys(\/\d+)?|screening(\/\d+)?|after-care|patients(\/\d+)?|followups(\/\d+)?|alerts(\/\d+)?|invitations(\/\d+)?|appointments(\/\d+)?|referrals(\/\d+)?|revisits|enrollment|in-care|ai-reports|risk-review|care-plans|longitudinal|analytics)$/;
  if(shared.test(path))return canOperate()||account.role==='DOCTOR';
  if(/^\/doctor(?:\/(?:reports|reviews|results|alerts)(?:\/\d+)?)?$/.test(path))return account.role==='DOCTOR';
  return canOperate()&&['/workbench','/data-ingestion'].includes(path);
}
function serviceRequestedPatient(){return current.query.get('patient')||''}
function servicePatientValid(){const id=serviceRequestedPatient();return !id||(/^\d+$/.test(id)&&mine(patient(id)))}
function serviceRecordPatient(path){
  let match;
  if((match=path.match(/^\/patients\/(\d+)$/)))return Number(match[1]);
  if((match=path.match(/^\/(?:followups|doctor\/(?:reviews|results))\/(\d+)$/)))return demo.tasks.find(x=>x.id===Number(match[1]))?.patient;
  if((match=path.match(/^\/(?:alerts|doctor\/alerts)\/(\d+)$/)))return demo.alerts.find(x=>x.id===Number(match[1]))?.patient;
  if((match=path.match(/^\/doctor\/reports\/(\d+)$/)))return demo.records.find(x=>x.id===Number(match[1]))?.patient;
  if((match=path.match(/^\/(invitations|appointments|referrals|packages)\/(\d+)$/)))return demo[match[1]==='packages'?'enrollments':match[1]].find(x=>x.id===Number(match[2]))?.patient;
  if((match=path.match(/^\/journeys\/(\d+)$/)))return journeyState().find(x=>x.id===Number(match[1]))?.patient;
  return undefined;
}
function serviceHubUrl(flow,tab,id){return servicePatientUrl('/'+flow+'?tab='+tab,id,flow)}
function serviceEmbedded(path,fn,query={}){
  const saved=current;
  try{current={path,query:new URLSearchParams(saved.query)};current.query.delete('tab');Object.entries(query).forEach(([key,value])=>current.query.set(key,value));return fn()}
  finally{current=saved}
}
function serviceBody(html){return html.replace(/^<h1>[\s\S]*?<\/h1>/,'')}
function serviceInsert(html,content){return html.replace(/(<h1>[\s\S]*?<\/h1>)/,heading=>heading+content)}
function serviceStages(flow,tab,id){
  const stages=flow==='screening'?servicePreStages:servicePostStages,selected=stages.find(x=>x[2].includes(tab))||stages[0];
  const strip='<nav class="service-stages" aria-label="'+(flow==='screening'?'诊前':'诊后')+'服务环节">'+stages.map(([key,title,keys,target],i)=>'<a href="#'+esc(serviceHubUrl(flow,target,id))+'" class="'+(key===selected[0]?'active':'')+'"'+(key===selected[0]?' aria-current="step"':'')+'><span>'+String(i+1).padStart(2,'0')+'</span><strong>'+esc(title)+'</strong></a>').join('')+'</nav>';
  const children=selected[2].filter(k=>k!=='archive'||id).filter(k=>!['reviews','results'].includes(k)||account.role==='DOCTOR');
  return strip+(children.length>1?tabs(children.map(k=>[k,serviceTabLabels[k],serviceHubUrl(flow,k,id)]),tab):'');
}

function servicePatientContext(flow,tab,id){
  const p=id?patient(id):null;
  return '<section class="service-patient-context"><div><strong>'+(p?'当前患者：'+esc(p.name):'当前范围：本人权限内的全部患者')+'</strong><small>'+(p?'责任医生 '+esc(person(p.doctor)?.name)+' · 服务负责人 '+esc(person(p.owner)?.name):'选择患者后，档案、随访、预约和转诊沿用同一患者范围。')+'</small></div><form data-form="care-navigation-context"><input type="hidden" name="flow" value="'+flow+'"><input type="hidden" name="tab" value="'+esc(tab)+'"><label class="sr-only" for="service-patient">选择患者</label><select id="service-patient" name="patient"><option value="">全部可见患者</option>'+patients().map(x=>'<option value="'+x.id+'"'+(String(x.id)===String(id)?' selected':'')+'>'+esc(x.name)+'</option>').join('')+'</select><button type="submit">切换范围</button></form></section>';
}
function servicePool(){
  const rows=pool().filter(x=>account.role!=='DOCTOR'||x.patient&&mine(patient(x.patient)));
  return card('待建档筛查对象','<div class="toolbar">'+(canOperate()?button('补充筛查对象','new-pool','','primary'):'')+'</div>'+table(['对象','来源','状态','下一步'],rows.map(x=>[esc(x.name),esc(x.source),tag(x.status),x.patient?link('进入患者连续档案',serviceHubUrl('after-care','archive',x.patient),'btn'):canOperate()?button('判定并建档','enroll-pool',x.id,'primary'):'等待责任团队完善记录'])));
}
function serviceConsultations(){
  const id=serviceRequestedPatient(),rows=consultationState().filter(x=>mine(patient(x.patient))&&(!id||x.patient===Number(id)));
  return card('随访与咨询 · 服务工单','<p>运营和护士承接服务问题；临床问题交责任医生，获得处理结果后由团队核验患者反馈。</p>'+(canOperate()?button('新建咨询工单','service-create',id,'primary'):'')+table(['患者 / 问题','责任人','状态 / 结果','操作'],rows.map(x=>[patientCell(x.patient)+'<br>'+esc(x.title),esc(person(x.owner)?.name),esc({OPEN:'处理中',WAIT_CLINICAL:'待医生反馈',RESOLVED:'待反馈核验',CLOSED:'已关闭'}[x.status])+'<br>'+esc(x.result||''),x.status==='OPEN'&&canOperate()?button('记录服务结果','service-resolve',x.id):x.status==='WAIT_CLINICAL'&&account.role==='DOCTOR'&&account.id===x.owner?button('本人记录临床反馈','service-resolve',x.id):x.status==='RESOLVED'&&canOperate()?button('核验患者反馈并关闭','service-close',x.id):'—'])));
}
function servicePlanQueue(){
  const rows=acVisible();rows.forEach(acExtras);
  return card('本次个案计划与审核','<p>先核对原报告和服务交接，在门诊、住院或体检个案中生成草稿；只有该患者的责任医生本人可以审核。</p>'+table(['患者 / 场景','当前环节','计划状态','办理'],rows.map(c=>[patientCell(c.patient)+'<br>'+esc(acPaths[c.kind].label),esc(acPaths[c.kind].steps[c.stage]||'服务已结案'),esc(c.plan?{DRAFT:'待医生审核',APPROVED:'已审核',REJECTED:'已退回'}[c.plan.status]||c.plan.status:'待生成计划'),link('进入本次个案','/after-care?scene='+c.kind+'&case='+c.id+'&patient='+c.patient,'btn')])));
}
function serviceArchive(){
  const id=serviceRequestedPatient();
  return id?serviceEmbedded('/patients/'+id,()=>patientDetail(id),{tab:current.query.get('archiveTab')||'records'}):serviceEmbedded('/patients',patientList);
}
function serviceLegacyTab(tab){
  const doctor=account.role==='DOCTOR';
  if(tab==='patients')return serviceEmbedded('/patients',patientList);
  if(tab==='archive')return serviceArchive();
  if(tab==='reports')return doctor?serviceEmbedded('/doctor/reports',reportList):serviceArchive();
  if(tab==='consultations')return serviceConsultations();
  if(tab==='plans')return servicePlanQueue();
  if(tab==='reviews'||tab==='results')return doctor?serviceEmbedded('/doctor/'+tab,()=>taskList(tab)):forbidden();
  if(tab==='followups')return serviceEmbedded('/followups',taskList);
  if(tab==='alerts')return serviceEmbedded(doctor?'/doctor/alerts':'/alerts',()=>alertList(doctor));
  if(tab==='revisits')return serviceEmbedded('/revisits',()=>collection('appointments',undefined,'复诊跟踪'),{appointment_type:'REVISIT'});
  if(['invitations','appointments','referrals'].includes(tab))return '<div class="service-ledger-note">同一患者的共享台账：诊前、诊后入口沿用既有记录，进入此页不会自动改变服务阶段。</div>'+serviceBody(serviceEmbedded('/'+tab,()=>collection(tab)));
  return '';
}

// Patient scope also covers the existing three-scene case list and its mutation lookups.
acVisible=function(){const id=serviceRequestedPatient();return serviceOriginalAcVisible().filter(c=>!id||c.patient===Number(id))};
enrollmentRows=function(){const id=serviceRequestedPatient();return serviceOriginalEnrollmentRows().filter(x=>!id||x.patient===Number(id))};
screening=function(){
  if(!serviceRouteAllowed(current.path)||!servicePatientValid())return forbidden();
  const tab=current.query.get('tab')||'ledger',id=['invitations','appointments','referrals','handoff'].includes(tab)?serviceRequestedPatient():'';
  if(/^\/screening\/\d+$/.test(current.path))return serviceOriginalScreening();
  let body;
  if(tab==='pool')body=servicePool();
  else if(['invitations','appointments','referrals'].includes(tab))body=serviceLegacyTab(tab);
  else if(tab==='handoff')body=card('到诊后的服务交接','<p>先核实实际到诊，由责任医生确认管理需求；服务团队完成身份、授权、责任人和资料交接后，进入诊后个案。</p><div class="toolbar">'+link('办理身份核验与服务交接',servicePatientUrl('/enrollment',id,'screening'),'btn')+link('进入诊后患者档案',serviceHubUrl('after-care','patients',id),'btn primary')+'</div>')+serviceEmbedded('/enrollment',enrollmentPage);
  else body=serviceBody(serviceOriginalScreening()).replace(/<section class="screen-hero">[\s\S]*?<\/section>/,'').replace(/<div class="tabs">[\s\S]*?<\/div>/,'');
  return page('诊前高危患者筛查中心',serviceStages('screening',tab,id)+(['invitations','appointments','referrals'].includes(tab)?servicePatientContext('screening',tab,id):'')+body);
};
afterCarePage=function(){
  if(!serviceRouteAllowed('/after-care')||!servicePatientValid())return forbidden();
  const tab=current.query.get('tab')||'overview',id=serviceRequestedPatient(),caseId=Number(current.query.get('case'));
  if(caseId){const c=acVisible().find(x=>x.id===caseId);if(!c)return forbidden();return serviceInsert(serviceOriginalAfterCare(),serviceStages('after-care','overview',c.patient)+servicePatientContext('after-care','overview',c.patient))}
  const shell=serviceStages('after-care',tab,id)+servicePatientContext('after-care',tab,id);
  if(tab==='overview')return serviceInsert(serviceOriginalAfterCare(),shell);
  const body=serviceLegacyTab(tab);
  return page('诊后主动干预',shell+(body?serviceBody(body):card('选择服务环节',link('进入个案服务工作区',serviceHubUrl('after-care','overview',id),'btn'))));
};
journeyPage=function(){
  if(!serviceRouteAllowed(current.path)||!servicePatientValid())return forbidden();
  if(/^\/journeys\/\d+$/.test(current.path))return serviceOriginalJourney();
  const id=serviceRequestedPatient(),guide='<div class="service-overview"><section><span>01 · 诊前</span><h2>发现风险，核实到诊</h2>'+link('进入诊前筛查',serviceHubUrl('screening','ledger'),'btn')+'</section><section><span>02 · 诊后</span><h2>个案计划，持续服务</h2>'+link('进入诊后服务',serviceHubUrl('after-care','overview',id),'btn primary')+'</section><section><span>03 · 协同</span><h2>一份档案，明确分工</h2>'+link('查看患者连续档案',serviceHubUrl('after-care','patients',id),'btn')+'</section></div>';
  const pending='<div class="toolbar">'+link(account.role==='DOCTOR'?'查看本人医学审核与处置待办':'查看本人运营执行待办',account.role==='DOCTOR'?'/doctor':'/workbench','btn')+link('办理服务入组交接',servicePatientUrl('/enrollment',id),'btn')+'</div>';
  return serviceInsert(serviceOriginalJourney(),guide+pending);
};

function serviceContextLinks(html,id,flow){
  return html.replace(/href="#([^\"]+)"/g,(attribute,encoded)=>{
    const raw=encoded.replace(/&amp;/g,'&'),pos=raw.indexOf('?'),path=pos<0?raw:raw.slice(0,pos),q=new URLSearchParams(pos<0?'':raw.slice(pos+1));
    if(path==='/screening'&&q.has('level')&&!q.has('tab'))q.set('tab','queue');
    const appointment=path.match(/^\/appointments\/(\d+)$/);
    if(appointment&&demo.appointments.find(x=>x.id===Number(appointment[1]))?.appointment_type==='REVISIT')q.set('appointment_type','REVISIT');
    const recordId=serviceRecordPatient(path)||(path==='/after-care'&&q.get('case')?acCases().find(c=>c.id===Number(q.get('case')))?.patient:undefined),selected=recordId||q.get('patient')||id;
    let target=path,tab;
    if(path==='/patients')tab='patients';
    else if(/^\/patients\/\d+$/.test(path)){tab='archive';if(q.has('tab'))q.set('archiveTab',q.get('tab'))}
    else if(['/followups','/invitations','/appointments','/referrals','/revisits','/alerts'].includes(path))tab=path.slice(1);
    else if(['/doctor/reports','/doctor/reviews','/doctor/results','/doctor/alerts'].includes(path))tab=path.split('/')[2];
    if(tab==='appointments'&&flow!=='screening'&&(current.query.get('tab')==='revisits'||current.query.get('appointment_type')==='REVISIT'))tab='revisits';
    if(tab){const nextFlow=flow==='screening'&&['invitations','appointments','referrals'].includes(tab)?'screening':'after-care';target='/'+nextFlow;q.set('tab',tab);q.set('flow',nextFlow)}
    else if(serviceNavParent(path)==='/after-care'||/^\/(invitations|appointments|referrals)\//.test(path))q.set('flow',flow);
    else if(!['/after-care','/screening','/journeys','/enrollment'].includes(path)&&!path.startsWith('/journeys/'))return attribute;
    if(target==='/screening'&&!['invitations','appointments','referrals','handoff'].includes(q.get('tab')))q.delete('patient');
    else if(selected)q.set('patient',String(selected));
    return 'href="#'+esc(target+(q.toString()?'?'+q:''))+'"';
  });
}
function serviceWrapLegacyPage(html){
  if(!account||account.role==='PLATFORM_ADMIN')return html;
  const path=current.path,parent=serviceNavParent(path);
  if(!['/screening','/after-care','/journeys'].includes(parent))return html;
  if(!servicePatientValid())return forbidden();
  const actual=serviceRecordPatient(path)||(path==='/after-care'&&current.query.get('case')?acCases().find(c=>c.id===Number(current.query.get('case')))?.patient:undefined),requested=serviceRequestedPatient();
  if(actual&&(!mine(patient(actual))||requested&&Number(requested)!==actual))return forbidden();
  const id=path==='/screening'&&!['invitations','appointments','referrals','handoff'].includes(current.query.get('tab'))?'':actual||requested,flow=serviceFlow(path);
  if(path!==parent&&!['/workbench','/doctor'].includes(path)){
    const tab=/^\/patients\//.test(path)?'archive':path.startsWith('/screening/')?'ledger':path.startsWith('/journeys/')?'overview':path.startsWith('/appointments/')&&current.query.get('appointment_type')==='REVISIT'&&flow!=='screening'?'revisits':path.split('/')[1]==='doctor'?path.split('/')[2]:path.split('/')[1];
    const destination=parent==='/journeys'?servicePatientUrl('/journeys',id):serviceHubUrl(flow,tab,id);
    html='<div class="service-return">'+link('← 返回'+(parent==='/journeys'?'患者全旅程服务':flow==='screening'?'诊前筛查环节':'诊后服务环节'),destination,'btn')+(id?'<span>当前患者：'+esc(patient(id)?.name||'')+'</span>':'')+'</div>'+html;
  }
  html=html.replace(/(<form data-form="(?:ac-filter|journey-filter)"[^>]*>)/g,opening=>opening+(id?'<input type="hidden" name="patient" value="'+esc(id)+'">':'')+'<input type="hidden" name="flow" value="'+flow+'">');
  return serviceContextLinks(html,id,flow);
}

document.addEventListener('submit',event=>{
  const form=event.target.closest('[data-form="care-navigation-context"]');if(!form)return;
  event.preventDefault();event.stopImmediatePropagation();
  const values=Object.fromEntries(new FormData(form)),flow=values.flow==='screening'?'screening':'after-care';
  if(values.patient&&!mine(patient(values.patient)))return toast('所选患者不在当前角色权限内。');
  go(serviceHubUrl(flow,values.tab||'overview',values.patient));
},true);
render();
