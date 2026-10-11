'use strict';
// Fictional in-memory preview of the persistent /interventions APIs. No external delivery.
const icOldPage=afterCarePage,icOldNav=careHubNav;
const icOptions=obj=>Object.entries(obj).map(([value,x])=>({value,label:typeof x==='string'?x:x.title}));
const icNow=()=>new Date().toISOString();
function icSeed(){
 if(demo.interventionWorks)return;
 demo.interventionWorks=[];
 Object.keys(centers).forEach((center,ci)=>Object.keys(phases).forEach((phase,pi)=>{
  centers[center].categories[phase].forEach((category,i)=>{
   const p=demo.patients[(ci+pi+i)%3],clinical=/报告咨询|报告解读|诊疗反馈|用药反馈|康复反馈|异常复查|门诊随访|出院随访|转诊随访|随访咨询/.test(category),status=clinical?'REVIEW':i===0?'TODO':'ACTIVE';
   const w={id:23001+demo.interventionWorks.length,patient_id:p.id,center,phase,category,title:category+' · '+p.name,content:'【虚构服务事项】'+category+'：核对患者需求与相关资料，记录本次沟通结果；涉及医学判断的事项交责任医生审核。',clinical,record_id:demo.records.find(r=>r.patient===p.id)?.id,due_at:new Date(Date.now()+(i===0?-25:50+i*60)*60000).toISOString(),status,version:0,approved_content:'',reviewer_id:null,result:'',first_response_at:status==='TODO'?null:icNow(),created_at:new Date(Date.now()-80*60000).toISOString(),logs:[]};
   w.logs.push({id:1,action:'CREATE',actor_id:1,note:'虚构服务工作单，等待责任团队办理。',at:w.created_at});demo.interventionWorks.push(w);
  });
 }));
}
function icRows(){icSeed();return demo.interventionWorks.filter(w=>mine(patient(w.patient_id)))}
function icCenter(){return centers[current.query.get('center')]?current.query.get('center'):'OUTPATIENT'}
function icPhase(){return phases[current.query.get('phase')]?current.query.get('phase'):'PRE'}
function icUrl(changes={},preserve=true){const q=preserve?new URLSearchParams(current.query):new URLSearchParams();q.delete('tab');q.delete('case');q.set('center',changes.center||icCenter());q.set('phase',changes.phase||icPhase());Object.entries(changes).forEach(([k,v])=>v==null||v===''?q.delete(k):q.set(k,String(v)));return '/after-care?'+q}
function icBadge(w){return '<span class="ic-status '+esc(w.status.toLowerCase())+'">'+esc(workStatuses[w.status])+'</span>'}
function icOverdue(w){return !['RESOLVED','CLOSED'].includes(w.status)&&Date.parse(w.due_at)<Date.now()}
function icTime(t){return t?new Date(t).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}):'—'}
function icFiltered(){return icRows().filter(w=>w.center===icCenter()&&w.phase===icPhase()&&(!current.query.get('status')||w.status===current.query.get('status'))&&(!current.query.get('q')||(w.title+patient(w.patient_id).name+w.category).includes(current.query.get('q')))&&(!current.query.get('overdue')||icOverdue(w))&&(!current.query.get('patient')||w.patient_id===Number(current.query.get('patient'))))}
function icLog(w,action,note,before){w.logs.push({id:w.logs.length+1,action,note,actor_id:account.id,at:icNow(),before,after:JSON.stringify({...w,logs:undefined})});audit(workActions[action]+' #'+w.id+'：'+note,w.patient_id)}
function icRole(){return account.role==='DOCTOR'}
function icGet(id){return icRows().find(w=>w.id===Number(id))}
function icBtn(label,action,id,primary=false){return button(label,'ic-'+action,id,primary?'primary':'')}
function icActions(w){return availableActions({...w,doctor_id:patient(w.patient_id).doctor},icRole())}
function icLocalTime(s){const d=new Date(s||Date.now()+3600000);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16)}
function icEditor(w,category){
 const c=w?.center||icCenter(),phase=w?.phase||icPhase(),p=w?.patient_id||patients()[0]?.id;
 modal(w?'修改服务工作单':'新建服务工作单','ic-save',w?.id||'',(w?field('patient_id','患者','hidden',w.patient_id)+'<div class="ic-form-note">'+esc(patient(w.patient_id).name)+' · 患者固定，跨中心转接可修改服务中心。</div>':field('patient_id','患者','select',p,patients().map(x=>({value:x.id,label:x.name}))))+field('version','','hidden',w?.version??0)+field('center','服务中心','select',c,icOptions(centers))+field('phase','服务阶段','select',phase,icOptions(phases))+field('category','服务事项','text',w?.category||category||centers[c].categories[phase][0])+field('title','工作单标题','text',w?.title||category||'')+field('due_at','截止时间','datetime-local',icLocalTime(w?.due_at))+field('clinical','医学审核','select',w?.clinical?'true':'false',[{value:'false',label:'普通服务事项'},{value:'true',label:'临床内容 · 需责任医生审核'}])+field('record_id','关联原报告','select',w?.record_id||'',[{value:'',label:'未关联（普通服务可选）'},...demo.records.filter(r=>mine(patient(r.patient))).map(r=>({value:r.id,label:patient(r.patient).name+' / '+r.title}))],false)+field('content','服务内容 / 待审核正文','textarea',w?.content||'')+field('reason','新建或修改原因','textarea',''), '责任团队继承患者档案；修改将回到处理中，原医学审核失效。');
}
function icExecute(action,id,values){
 if(!account||!['MANAGER','OPERATOR','NURSE','DOCTOR'].includes(account.role))return toast('当前角色无权办理。');
 if(action==='new-category'){if(icRole())return toast('医生请办理审核与临床反馈。');return icEditor(null,id)}
 if(action==='new'){if(icRole())return toast('医生请办理审核与临床反馈。');return icEditor()}
 const w=id?icGet(id):null;
 if(id&&!w)return toast('工作单不存在或不在权限内。');
 if(action==='edit'){if(icRole()||['RESOLVED','CLOSED'].includes(w.status))return toast('请先重新打开工作单。');return icEditor(w)}
 if(action==='save'){
  if(icRole())return toast('当前角色不能编辑服务工作单。');
  const v=values,p=patient(v.patient_id);if(!p||!mine(p)||(w&&w.patient_id!==p.id))return toast('患者不在当前权限内。');
  if(!centers[v.center]||!phases[v.phase]||![v.title,v.category,v.content,v.reason].every(x=>x?.trim())||!Number.isFinite(Date.parse(v.due_at)))return toast('请完整填写工作单、原因及有效截止时间。');
  if(w&&(Number(v.version)!==w.version||['RESOLVED','CLOSED'].includes(w.status)))return toast('记录已更新，请重新打开。');
  const clinical=v.clinical==='true',report=demo.records.find(x=>x.id===Number(v.record_id));
  if(w?.clinical&&!clinical)return toast('临床工作单不能改为普通服务。');
  if((clinical||v.record_id)&&(!report||report.patient!==p.id))return toast('请选择该患者本人的原报告。');
  const before=w?JSON.stringify({...w,logs:undefined}):null,target=w||{id:Math.max(23000,...demo.interventionWorks.map(x=>x.id))+1,version:-1,created_at:icNow(),logs:[]};
  Object.assign(target,{patient_id:p.id,center:v.center,phase:v.phase,category:v.category.trim(),title:v.title.trim(),content:v.content.trim(),clinical,record_id:report?.id||null,due_at:new Date(v.due_at).toISOString(),status:w?'ACTIVE':'TODO',approved_content:'',reviewer_id:null,acknowledged_by:null,version:target.version+1});
  if(w)target.first_response_at??=icNow();else demo.interventionWorks.push(target);icLog(target,w?'EDIT':'CREATE',v.reason,before);$('#dialog').close();go(icUrl({center:target.center,phase:target.phase,work:target.id,status:null,q:null,overdue:null},false));render();return toast('工作单已保存；可在操作记录查看修改前后。');
 }
 if(!w)return;
 const code=action.toUpperCase();if(!icActions(w).includes(code))return toast('当前角色或工作状态不支持此操作。');
 if(!values){return modal(workActions[code],'ic-'+action,w.id,field('version','','hidden',w.version)+(['ARRIVAL'].includes(code)?field('occurred_at','实际到院时间','datetime-local',icLocalTime(icNow())):'')+(code==='RATE'?field('score','患者评分','select','5',[{value:5,label:'5 分 · 非常满意'},{value:4,label:'4 分 · 满意'},{value:3,label:'3 分 · 一般'},{value:2,label:'2 分 · 不满意'},{value:1,label:'1 分 · 非常不满意'}]):'')+field('note',code==='COMPLETE'?'办理结果与患者反馈':code==='CLOSE'?'患者反馈核验依据':code==='ARRIVAL'?'实际到院凭据':code==='REJECT'?'退回原因与修改要求':'办理依据 / 协作记录','textarea',''),'所有记录追加留痕；这里登记人工办理结果，不发送微信消息。')}
 if(Number(values.version)!==w.version)return toast('记录已更新，请重新打开。');if(!values.note?.trim())return toast('请填写办理依据。');
 const p=patient(w.patient_id),before=JSON.stringify({...w,logs:undefined});
 if(code==='APPROVE'){
  const r=demo.records.find(x=>x.id===w.record_id);if(account.id!==p.doctor||!r||r.status!=='READ'||r.viewer!==account.id)return toast('请先由当前责任医生在原报告页面确认已阅。');w.status='READY';w.approved_content=w.content;w.reviewer_id=account.id;
 }else if(code==='COMPLETE'){
  if(w.clinical&&(w.status!=='READY'||w.reviewer_id!==p.doctor||w.approved_content!==w.content))return toast('当前正文需责任医生本人重新审核。');
  if(w.clinical&&!p.service_consent)return toast('请先在患者档案核验服务授权。');w.status='RESOLVED';w.result=values.note.trim();
 }else if(code==='START'){w.status='ACTIVE';w.first_response_at??=icNow()}
 else if(code==='SUBMIT'){w.status='REVIEW';w.approved_content='';w.reviewer_id=null;w.acknowledged_by=null;w.first_response_at??=icNow()}
 else if(code==='REJECT'||code==='REOPEN'){w.status='ACTIVE';w.approved_content='';w.reviewer_id=null;w.acknowledged_by=null}
 else if(code==='ACKNOWLEDGE')w.acknowledged_by=account.id;
 else if(code==='CLOSE'){if(w.clinical&&w.acknowledged_by!==p.doctor)return toast('请先由当前责任医生查收结果。');w.status='CLOSED';}
 else if(code==='ARRIVAL'){if(!Number.isFinite(Date.parse(values.occurred_at))||Date.parse(values.occurred_at)>Date.now())return toast('实际到院时间必须有效且不能晚于现在。');w.arrived_at=new Date(values.occurred_at).toISOString();w.arrival_evidence=values.note.trim()}
 else if(code==='RATE'){if(![1,2,3,4,5].includes(Number(values.score)))return toast('评分须为1至5分。');w.score=Number(values.score);w.feedback=values.note.trim()}
 w.version++;icLog(w,code,values.note,before);$('#dialog').close();render();toast('已'+workActions[code]+'，操作记录已更新。');
}
function icDetail(w){
 const p=patient(w.patient_id),r=demo.records.find(x=>x.id===w.record_id),actions=icActions(w);
 return '<aside class="ic-detail"><div class="ic-detail-head"><span>工作单 / #'+w.id+'</span>'+link('关闭 ×',icUrl({work:null}),'ic-text-link')+'</div><h2>'+esc(w.title)+'</h2><div class="ic-chips">'+icBadge(w)+'<span>'+esc(phases[w.phase].title)+'</span><span>'+(w.clinical?'临床内容':'普通服务')+'</span></div><div class="ic-person"><div class="ic-avatar">'+esc(p.name.slice(-1))+'</div><div><strong>'+esc(p.name)+'</strong><small>'+esc(p.department)+' · '+esc(p.age)+' 岁</small></div>'+link('患者档案 ↗','/after-care?tab=summary&patient='+p.id)+'</div><dl class="ic-meta"><dt>服务负责人</dt><dd>'+esc(person(p.owner)?.name)+'</dd><dt>责任医生</dt><dd>'+esc(person(p.doctor)?.name)+'</dd><dt>截止时间</dt><dd class="'+(icOverdue(w)?'ic-red':'')+'">'+icTime(w.due_at)+(icOverdue(w)?' · 已超时':'')+'</dd><dt>服务事项</dt><dd>'+esc(w.category)+'</dd></dl><section class="ic-content"><h3>服务内容'+(!icRole()&&!['CLOSED','RESOLVED'].includes(w.status)?icBtn('修改','edit',w.id):'')+'</h3><p>'+esc(w.content)+'</p></section>'+(r?'<details class="ic-report"><summary>原始报告 · '+esc(r.title)+'</summary><p>'+esc(r.text)+'</p>'+link('打开原报告并确认已阅','/doctor/reports/'+r.id)+'<small>仅当前责任医生本人可审核临床内容。</small></details>':'')+(w.result?'<section class="ic-content"><h3>办理结果</h3><p>'+esc(w.result)+'</p></section>':'')+(w.arrived_at?'<div class="ic-receipt">✓ 到院已核验 · '+icTime(w.arrived_at)+'<p>'+esc(w.arrival_evidence)+'</p></div>':'')+(w.score?'<div class="ic-receipt">患者评价 '+w.score+' / 5<p>'+esc(w.feedback)+'</p></div>':'')+'<div class="ic-work-actions">'+actions.map((a,i)=>icBtn(workActions[a],a.toLowerCase(),w.id,i===0)).join('')+'</div><h3 class="ic-history-title">操作记录 <small>'+w.logs.length+' 条 · 仅追加</small></h3><ol class="ic-history">'+[...w.logs].reverse().map(l=>'<li><div><strong>'+esc(workActions[l.action])+'</strong><time>'+icTime(l.at)+'</time></div><p>'+esc(l.note)+'</p><small>'+esc(person(l.actor_id)?.name||'系统')+'</small>'+(l.before?'<details><summary>查看修改前后</summary><pre>'+esc(JSON.stringify({修改前:JSON.parse(l.before),修改后:JSON.parse(l.after)},null,2))+'</pre></details>':'')+'</li>').join('')+'</ol></aside>';
}
function icMetrics(rows){return [['待处理',rows.filter(w=>w.status==='TODO').length,'TODO'],['处理中',rows.filter(w=>w.status==='ACTIVE').length,'ACTIVE'],['待医生审核',rows.filter(w=>w.status==='REVIEW').length,'REVIEW'],['待核验',rows.filter(w=>w.status==='RESOLVED').length,'RESOLVED'],['超时未完成',rows.filter(icOverdue).length,'overdue'],['已闭环',rows.filter(w=>w.status==='CLOSED').length,'CLOSED']].map(([label,n,s])=>'<a href="#'+esc(icUrl({status:s==='overdue'?null:s,overdue:s==='overdue'?'1':null,work:null}))+'" class="ic-metric '+(s==='overdue'?'urgent':'')+'"><span>'+label+'</span><strong>'+n+'<small>单</small></strong></a>').join('')}
function icDashboard(rows){
 const logs=rows.flatMap(w=>w.logs.map(l=>({...l,work:w}))).sort((a,b)=>b.at.localeCompare(a.at)).slice(0,6),responded=rows.filter(w=>w.first_response_at),minutes=responded.length?Math.round(responded.reduce((n,w)=>n+(Date.parse(w.first_response_at)-Date.parse(w.created_at))/60000,0)/responded.length):null;
 return '<div class="ic-dashboard"><section><div class="ic-section-title"><h3>服务响应</h3><span>当前阶段 · 工作单口径</span></div><div class="ic-response"><div><b>'+rows.filter(w=>!w.first_response_at).length+'</b><span>待首次处理</span></div><div><b>'+rows.filter(icOverdue).length+'</b><span>超时未完成</span></div><div><b>'+(minutes??'—')+'<small>分</small></b><span>平均首次处理</span></div></div><p>从受理建单到开始处理计算，支持人工记录接待。</p></section><section><div class="ic-section-title"><h3>到院与服务质量</h3><span>人工核验</span></div><div class="ic-response"><div><b>'+rows.filter(w=>w.arrived_at).length+'</b><span>核验到院</span></div><div><b>'+rows.filter(w=>w.score>=4).length+'</b><span>满意评价 / ≥4分</span></div><div><b>'+rows.filter(w=>w.category==='投诉协办'&&w.status!=='CLOSED').length+'</b><span>待闭环投诉</span></div></div><p>工作单关联实际到院凭据；评价不代填、不自动生成。</p></section><section class="ic-activity"><div class="ic-section-title"><h3>咨询 / 协作动态</h3><span>最近 '+logs.length+' 条</span></div>'+logs.map(l=>'<a href="#'+esc(icUrl({work:l.work.id}))+'"><i></i><div><strong>'+esc(patient(l.work.patient_id).name)+' · '+esc(workActions[l.action])+'</strong><small>'+esc(l.note)+'</small></div><time>'+icTime(l.at)+'</time></a>').join('')+'</section></div>';
}
function icPage(){
 if(!account||account.role==='PLATFORM_ADMIN'||!servicePatientValid())return forbidden();
 const c=icCenter(),phase=icPhase(),config=centers[c],all=icRows().filter(w=>w.center===c&&w.phase===phase&&(!current.query.get('patient')||w.patient_id===Number(current.query.get('patient')))),rows=icFiltered(),work=Number(current.query.get('work')),selected=work?rows.find(w=>w.id===work)||all.find(w=>w.id===work):null;
 const tabs='<nav class="ic-phases" aria-label="服务阶段">'+Object.entries(phases).map(([key,v])=>'<a href="#'+esc(icUrl({phase:key,status:null,overdue:null,work:null,q:null}))+'" class="'+(phase===key?'active':'')+'"><span>'+v.title+'</span><small>'+v.subtitle+'</small><b>'+icRows().filter(w=>w.center===c&&w.phase===key).length+'</b></a>').join('')+'</nav>';
 const toolbar='<form data-form="ic-filter" class="ic-filter"><label class="ic-search"><span>⌕</span><input name="q" aria-label="搜索服务工作单" placeholder="搜索患者、工作单或服务事项" value="'+esc(current.query.get('q')||'')+'"></label><select name="status" aria-label="工作单状态"><option value="">全部状态</option>'+Object.entries(workStatuses).map(([k,l])=>'<option value="'+k+'" '+(current.query.get('status')===k?'selected':'')+'>'+l+'</option>').join('')+'</select><button type="submit">查询</button>'+link('重置',icUrl({q:null,status:null,overdue:null,work:null}),'btn')+'</form>';
 const queue='<section class="ic-queue"><div class="ic-section-title"><h2>'+phases[phase].title+'服务队列 <small>'+rows.length+' 单</small></h2><span>按截止时间优先处理</span></div>'+toolbar+(current.query.get('overdue')?'<div class="ic-filter-hint">正在查看：超时未完成</div>':'')+'<div class="ic-table-wrap"><table class="ic-table"><thead><tr><th>患者 / 服务事项</th><th>责任团队</th><th>截止时间</th><th>状态</th><th>操作</th></tr></thead><tbody>'+[...rows].sort((a,b)=>a.due_at.localeCompare(b.due_at)).map(w=>{const p=patient(w.patient_id);return '<tr class="'+(selected?.id===w.id?'selected':'')+'"><td><strong>'+esc(p.name)+'</strong><small>'+esc(w.category)+' · #'+w.id+'</small>'+(w.clinical?'<em>需医学审核</em>':'')+'</td><td>'+esc(person(p.owner)?.name)+'<small>'+esc(person(p.doctor)?.name)+'</small></td><td class="'+(icOverdue(w)?'ic-red':'')+'">'+icTime(w.due_at)+'<small>'+(icOverdue(w)?'超时待跟进':'按计划办理')+'</small></td><td>'+icBadge(w)+'</td><td>'+link('打开办理 →',icUrl({work:w.id}),'ic-open')+'</td></tr>'}).join('')+'</tbody></table>'+(rows.length?'':'<div class="ic-empty">当前没有符合条件的工作单。<p>可调整筛选，或新建本阶段服务工作单。</p></div>')+'</div><footer class="ic-queue-foot">负责人随患者分派同步 · 修改、审核和结果均有记录</footer></section>';
 return '<div class="ic-shell"><div class="ic-breadcrumb">患者服务 / 诊后健康服务中心 / '+config.title+'</div><header class="ic-heading"><div><span class="ic-eyebrow">PATIENT SERVICE · '+config.code+'</span><h1>'+config.title+'</h1></div><div class="ic-heading-actions">'+link('患者档案','/after-care?tab=patients','btn')+(!icRole()?icBtn('＋ 新建工作单','new','',true):link('我的医学待办','/after-care?tab=reviews','btn primary'))+'</div></header>'+tabs+'<div class="ic-metrics">'+icMetrics(all)+'</div>'+(c==='CONSULTATION'?icDashboard(all):'<div class="ic-service-types"><span>本阶段可办事项</span>'+config.categories[phase].map(x=>icRole()?'<span class="ic-service-chip">'+x+'</span>':icBtn(x+' ＋','new-category',x)).join('')+'<span class="ic-service-tip">'+(icRole()?'责任医生 · 审核与临床反馈':'运营 / 护士 · 接待与执行')+'</span></div>')+'<div class="ic-workspace '+(selected?'has-detail':'')+'">'+queue+(selected?icDetail(selected):'')+'</div><div class="ic-footer"><span><i></i> 虚构交互演示 · 当前页面内存保存，刷新恢复样例</span><span>医院 / 企微接口未接通 · 不发送消息</span></div><div class="ic-legacy">'+link('原个案计划与随访','/after-care?tab=overview')+link('房颤连续管理','/after-care?tab=continuity&patient=1001')+link('预约与到院台账','/after-care?tab=appointments')+link('转诊台账','/after-care?tab=referrals')+'</div></div>';
}
afterCarePage=function(){if(current.query.has('tab')||current.query.has('case')||current.query.has('scene'))return icOldPage().replaceAll('诊后健康服务中心</h1>','诊后健康服务中心</h1>');return icPage()};
careHubNav=function(){if(serviceNavParent(current.path)!=='/after-care')return icOldNav().replaceAll('诊后健康服务中心<','诊后健康服务中心<');return menu().map(([path,label])=>link(path==='/after-care'?'诊后健康服务中心':label,path,path==='/after-care'?'active':'')+(path==='/after-care'?'<nav class="ic-subnav" aria-label="诊后健康服务中心目录">'+Object.entries(centers).map(([key,c])=>'<a href="#/after-care?center='+key+'&phase=PRE" class="'+(key===icCenter()?'selected':'')+'"><span>'+c.title+'</span></a>').join('')+'</nav>':'')).join('')};
document.addEventListener('click',e=>{const b=e.target.closest('[data-action^="ic-"]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();icExecute(b.dataset.action.slice(3),b.dataset.id)},true);
document.addEventListener('submit',e=>{const f=e.target.closest('[data-form^="ic-"]');if(!f)return;e.preventDefault();e.stopImmediatePropagation();const v=Object.fromEntries(new FormData(f));if(f.dataset.form==='ic-filter')return go(icUrl({q:v.q,status:v.status,overdue:null,work:null}));icExecute(f.dataset.form.slice(3),f.dataset.id,v)},true);
if(document.body.dataset.demoEntry==='intervention-center'){account=person(1);if(!location.hash||location.hash==='#/login')location.hash='#/after-care?center=OUTPATIENT&phase=PRE'}
render();
