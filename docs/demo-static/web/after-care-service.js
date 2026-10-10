
// Proposed 2.1 service prototype. Fictional local state; no external AI or messages.
const acPaths={
OUTPATIENT:{label:'门诊诊后服务',steps:['门诊结束与病历医嘱核对','扫码入组与服务交接','AI智能体生成诊后个案随访计划表','诊后个案计划审核','随访执行与医生反馈','复诊结果与服务结案'],roles:['doctor','team','ai','doctor','team','team'],record:'门诊'},
DISCHARGE:{label:'住院与出院服务',steps:['扫码入组接入与服务交接','住院服务及问题协调','出院小结与医嘱核对','AI智能体生成诊后个案随访计划表','出院准备及管家交接','出院个案计划审核','居家随访与医生反馈','复诊结果与服务结案'],roles:['team','team','doctor','ai','team','doctor','team','team'],record:'出院'},
CHECKUP:{label:'体检检后服务',steps:['体检结束与体检报告医嘱核对','扫码入组与服务交接','AI智能体生成检后个案随访计划表','检后个案计划审核','随访执行与医生反馈','复诊结果与服务结案'],roles:['doctor','team','ai','doctor','team','team'],record:'体检'}
};
function acCases(){return demo.afterCareCases??=demo.patients.map((p,i)=>({id:p.id,patient:p.id,kind:p.patient_type==='DISCHARGED'||p.patient_type==='INPATIENT'?'DISCHARGE':demo.records.some(r=>r.patient===p.id&&r.type==='体检')?'CHECKUP':'OUTPATIENT',stage:0,selected:0,logs:[],plan:null,planHistory:[],visits:[],feedback:[],issues:[],baseline:null,consent:false,handoff:false,closed:false,revision:0}))}
function acVisible(){return acCases().filter(c=>mine(patient(c.patient)))}
function acAllowed(c,role){return role==='doctor'?account?.role==='DOCTOR'&&account.id===patient(c.patient).doctor:canOperate()&&mine(patient(c.patient))}
function acLog(c,title,evidence){c.logs.push({title,evidence,by:account.id,at:new Date().toLocaleString('zh-CN')});audit(title+'：'+evidence,c.patient)}
function acFlow(kind,c){return '<div class="ac-flow '+(kind==='DISCHARGE'?'eight':'')+'">'+acPaths[kind].steps.map((title,i)=>'<div class="ac-step '+(c?(i<c.stage?'done':i===c.stage?'current':''):'')+'"><span class="ac-number">'+(c&&i<c.stage?'✓':String(i+1).padStart(2,'0'))+'</span><b>'+esc(title)+'</b><small>'+({doctor:'责任医生',team:'管家 / 运营 / 护士',ai:'AI 草稿 · 人工触发'}[acPaths[kind].roles[i]])+(c?' · '+(i<c.stage?'已完成':i===c.stage?'当前环节':'待前序完成'):'')+'</small></div>').join('')+'</div>'}
function acPlanTable(c,editable=false){if(!c.plan)return '<div class="ac-empty">核对服务依据并完成入组后，点击生成个案计划表。</div>';return table(['节点','时间 / 频次','执行内容','跟踪数据与目标','责任 / 反馈'],c.plan.rows.map((r,i)=>r.map((v,k)=>editable&&k>0&&k<4?'<input aria-label="'+esc(['节点','时间','执行内容','数据与目标'][k])+' '+(i+1)+'" name="p'+i+'_'+k+'" required value="'+esc(v)+'">':esc(v))))}
function acDetail(c){const p=patient(c.patient),path=acPaths[c.kind],role=path.roles[c.stage],title=path.steps[c.stage]||'本次服务已结案',planIndex=path.roles.indexOf('ai'),reviewIndex=path.steps.findIndex(s=>s.includes('计划审核')),followIndex=path.steps.findIndex(s=>s.includes('医生反馈'));let actions='';
if(!c.closed){if(c.stage===planIndex)actions=acAllowed(c,'team')?button(c.plan?'重新生成计划草稿':'生成个案随访计划表','ac-generate',c.id,'primary'):'<p>由管家或运营人员点击生成。</p>';else if(c.stage===reviewIndex)actions=acAllowed(c,'doctor')?button('审核与修改计划','ac-review',c.id,'primary'):'<p>等待 '+esc(person(p.doctor)?.name)+' 本人审核。</p>';else if(c.stage===followIndex){actions=(acAllowed(c,'team')?button('记录随访执行','ac-visit',c.id,'primary')+button('提交复诊结果与结案核验','ac-finish-follow',c.id):'')+(acAllowed(c,'doctor')?button('查收随访与反馈','ac-feedback',c.id,'primary'):'')}else actions=acAllowed(c,role)?button(c.stage===path.steps.length-1?'核验并结案':'办理当前环节','ac-step',c.id,'primary'):'<p>由'+(role==='doctor'?'责任医生本人':'服务团队')+'完成本环节。</p>'}
return link('← 返回患者服务清单','/after-care?scene='+c.kind,'btn')+'<div class="ac-hero"><div><div class="ac-eyebrow">患者个案</div><h2>'+esc(p.name)+' · '+esc(path.label)+'</h2><p>本次个案 #AC'+c.id+' · '+esc(p.department)+' · '+esc(c.eventKey)+' · 虚构演示资料</p></div><div><span>'+ (c.closed?'服务完成':'当前进度')+'</span><strong>'+Math.min(c.stage,path.steps.length)+' / '+path.steps.length+'</strong></div></div>'+acFlow(c.kind,c)+'<div class="ac-columns"><div>'+card(title,'<div class="ac-summary"><div><span>服务负责人</span><b>'+esc(person(p.owner)?.name)+'</b></div><div><span>责任医生</span><b>'+esc(person(p.doctor)?.name)+'</b></div><div><span>个案状态</span><b>'+ (c.closed?'已结案':c.plan?.status==='REJECTED'?'计划退回修改':'服务进行中')+'</b></div></div><div class="toolbar">'+actions+'</div><p>每个环节记录实际结果与依据，完成后进入下一环节。</p>')+card((c.kind==='CHECKUP'?'检后':'诊后')+'个案随访计划表', '<div class="row between"><span class="ac-badge">'+(c.plan?esc(c.plan.status==='APPROVED'?'医生已审核':c.plan.status==='REJECTED'?'退回修改':'AI模拟草稿 · 待医生审核')+' · v'+c.revision:'尚未生成')+'</span><span class="muted">依据报告 → 个体目标 → 执行 → 反馈 → 调整</span></div><div class="ac-plan">'+acPlanTable(c)+'</div>'+(c.plan?'<p>生成依据：'+esc(c.baseline?.title)+' · 报告日期 '+esc(c.baseline?.date)+'<br>审核意见：'+esc(c.plan.review||'等待责任医生确认执行内容、频次与目标。')+'</p>':'' )+(c.planHistory.length?'<details><summary>历史计划版本（'+c.planHistory.length+'）</summary>'+table(['版本','个体目标','审核意见'],c.planHistory.map((h,i)=>['v'+(i+1),esc(h.goal),esc(h.review||'未经审核')]))+'</details>':''))+card('随访执行与医生反馈',c.visits.length?c.visits.map((v,i)=>'<div class="ac-record"><b>第 '+(i+1)+' 次随访 · '+esc(v.result)+' · '+esc(v.at)+'</b><p>'+esc(v.note)+'</p><span class="ac-badge">'+(c.feedback.some(f=>f.count>=i+1)?'医生已查收':'待医生查收')+'</span></div>').join('')+c.feedback.map(f=>'<div class="ac-record"><b>医生反馈 · '+esc(person(f.by)?.name)+'</b><p>'+esc(f.note)+'</p></div>').join(''):'<div class="ac-empty">计划经责任医生审核后，记录联系结果、患者反馈与下次动作。</div>')+'</div><div>'+card('患者连续档案','<div class="ac-assets">'+[['本次原报告',c.baseline?.title||'待核对'],['报告日期',c.baseline?.date||'待核对'],['患者服务目标',c.plan?.goal||'待记录'],['随访与反馈','已记录 '+c.visits.length+' 次随访 / '+c.feedback.length+' 次医生反馈']].map(([a,b])=>'<div><b>'+a+'</b><small>'+esc(b)+'</small></div>').join('')+'</div>'+link('查看原档案与报告','/patients/'+p.id,'btn'))+card('问题协调与异常升级',(!c.closed&&canOperate()?button('登记服务 / 临床问题','ac-issue',c.id):'')+(c.issues.length?c.issues.map((x,i)=>'<div class="ac-record"><b>'+esc(x.kind==='CLINICAL'?'临床问题':'服务问题')+' · '+(x.closed?'已核验关闭':x.resolution?'待患者反馈核验':'待处理')+'</b><p>'+esc(x.note)+'</p><small>截止：'+esc(x.due||'待补充')+'</small><p>'+esc(x.resolution||'')+'</p>'+(!x.closed&&(x.resolution?acAllowed(c,'team'):acAllowed(c,x.kind==='CLINICAL'?'doctor':'team'))?button(x.resolution?'核验患者已获反馈':x.accepted?'记录处理结果':'接单办理',x.accepted?'ac-resolve':'ac-accept',c.id+':'+i):'')+'</div>').join(''):'<p>暂无未结问题。服务问题由管家协调，临床问题由责任医生处理。</p>'))+card('服务办理留痕',c.logs.length?c.logs.map(l=>'<div class="ac-record"><b>'+esc(l.title)+'</b><small>'+esc(l.at)+' · '+esc(person(l.by)?.name)+'</small><p>'+esc(l.evidence)+'</p></div>').join(''):'<p>每次办理、计划生成、审核与反馈均保留记录。</p>')+'</div></div>'}
afterCarePage=function(){if(!canOperate()&&account?.role!=='DOCTOR')return forbidden();const scene=acPaths[current.query.get('scene')]?current.query.get('scene'):'OUTPATIENT',all=acVisible(),id=Number(current.query.get('case'));if(id){const c=all.find(x=>x.id===id);return c?page('诊后健康服务中心 · 患者个案','按患者所在场景持续服务，形成完整个案闭环。',acDetail(c)):forbidden()}
all.forEach(acExtras);const q=current.query.get('q')||'',status=current.query.get('state')||'',rows=all.filter(c=>c.kind===scene&&(!q||(patient(c.patient).name+' '+c.id).includes(q))&&(!status||(status==='closed'?c.closed:status==='review'?c.plan?.status==='DRAFT':status==='active'?!c.closed&&c.status==='ACTIVE':c.status===status)));
return page('诊后健康服务中心','门诊、住院与体检三条服务路径，为每一位患者建立连续的个案记录。','<div class="ac-hero"><div><div class="ac-eyebrow">服务概览</div><h2>诊后服务工作台</h2><p>核对依据，生成个案计划，审核后执行，记录反馈与复诊结果。</p></div><div><span>当前角色可见患者</span><strong>'+all.length+'</strong><span>每位患者一个个案工作区</span></div></div><div class="patient-metrics">'+[['待服务',all.filter(c=>!c.closed&&c.status==='ACTIVE').length],['待医生审核',all.filter(c=>c.plan?.status==='DRAFT').length],['待医生查收',all.filter(c=>c.visits.length&&!c.feedback.some(f=>f.count===c.visits.length)).length],['未结问题',all.reduce((n,c)=>n+c.issues.filter(x=>!x.closed).length,0)],['已结案',all.filter(c=>c.closed).length]].map(([l,n])=>'<div><span>'+l+'</span><strong>'+n+'</strong></div>').join('')+'</div><div class="ac-scenes">'+Object.entries(acPaths).map(([k,p])=>link(p.label+' · '+all.filter(c=>c.kind===k).length,'/after-care?scene='+k,k===scene?'active':'')).join('')+'</div>'+card(acPaths[scene].label+' · 完整服务路径',acFlow(scene)+'<p>按流程逐环节办理；AI生成草稿，责任医生审核，管家执行与跟进，复诊结果核验后结案。</p>')+card('患者个案服务清单',(canOperate()?button('建立本次服务个案','ac-create','','primary'):'')+'<form data-form="ac-filter"><input type="hidden" name="scene" value="'+scene+'"><div class="toolbar"><input aria-label="搜索个案" name="q" placeholder="搜索患者姓名或个案编号" style="max-width:300px" value="'+esc(q)+'"><select aria-label="个案状态" name="state" style="max-width:180px">'+[['','全部状态'],['active','服务中'],['review','待审核'],['closed','已结案'],['PAUSED','已暂停'],['EXITED','已退出'],['WITHDRAWN','授权已撤回']].map(([v,l])=>'<option value="'+v+'" '+(status===v?'selected':'')+'>'+l+'</option>').join('')+'</select><button>筛选</button></div></form>'+table(['患者 / 个案','当前环节','计划 / 随访','服务团队','操作'],rows.map(c=>{const p=patient(c.patient);return[esc(p.name)+'<br><small>#AC'+c.id+' · '+esc(p.department)+'</small>',c.closed?'<span class="ac-status">✓ 复诊结果与服务结案</span>':esc(acStateLabels[c.status])+' · '+esc(acPaths[c.kind].steps[c.stage]),c.plan?esc({DRAFT:'待医生审核',APPROVED:'医生已审核',REJECTED:'已退回'}[c.plan.status])+'<br>已记录 '+c.visits.length+' 次随访':'待生成个案计划',esc(person(p.owner)?.name)+'<br>'+esc(person(p.doctor)?.name),link('进入个案工作区 →','/after-care?scene='+c.kind+'&case='+c.id,'btn')]})))+'<p class="muted">虚构演示数据 · AI计划为模拟生成 · 刷新后恢复初始数据。</p>')};
function acAction(action,id,v){if(action==='ac-filter'){go('/after-care?'+new URLSearchParams(v));return}const [cid,ix]=String(id).split(':'),c=acVisible().find(x=>x.id===Number(cid));if(!c||c.closed)return toast('个案不可操作。');const path=acPaths[c.kind],stage=c.stage,title=path.steps[stage],ai=path.roles.indexOf('ai'),review=path.steps.findIndex(s=>s.includes('计划审核')),follow=path.steps.findIndex(s=>s.includes('医生反馈')),issue=c.issues[Number(ix)];
let needed=['ac-review','ac-feedback'].includes(action)?'doctor':action==='ac-resolve'&&!issue?.resolution&&issue?.kind==='CLINICAL'?'doctor':action==='ac-step'?path.roles[stage]:'team';if(!acAllowed(c,needed))return toast('须由当前环节责任人员本人办理。');
if(action==='ac-generate'){if(stage!==ai||!c.baseline||!c.consent||!c.handoff)return toast('请先完成依据核对与扫码服务交接。');if(!v)return modal('AI智能体生成个案随访计划表（本地模拟）',action,c.id,field('goal','患者个体目标与当前服务需求','textarea','核对原医嘱执行情况，记录患者疑问，协助完成本次复诊安排。'),'以已核对原报告和患者目标生成草稿；医生审核后才能执行。');if(!v.goal?.trim())return toast('请填写个体目标。');if(c.plan)c.planHistory.push(structuredClone(c.plan));c.revision++;c.plan={status:'DRAFT',goal:v.goal,rows:[['首次随访','时间待医生确认','核实原医嘱执行与患者需求：'+v.goal,'记录本次个人基线与困难','管家记录 / 医生查收'],['持续随访','频次待医生确认','跟踪症状、监测记录与依从性','与个人基线比较，变化交医生判断','管家跟进 / 医生判断'],['阶段复盘','复盘时间待医生确认','评估执行情况、患者反馈与目标进展','按医生反馈调整下一轮计划','医生审核 / 团队落实'],['复诊与结案','按原医嘱 / 医生确认','核实复诊准备、实际结果及后续需求','记录诊疗结果、问题闭环与交接','管家核验 / 医生确认']]};acLog(c,'AI生成计划草稿 v'+c.revision,v.goal+'；依据：'+c.baseline.title);c.stage++;}
else if(action==='ac-review'){if(stage!==review||c.plan?.status!=='DRAFT')return toast('当前无待审核计划。');if(!v)return modal('责任医生审核个案计划表',action,c.id,'<div style="grid-column:1/-1" class="ac-plan">'+acPlanTable(c,true)+'</div>'+field('result','审核结果','select','APPROVED',[{value:'APPROVED',label:'通过并启用计划'},{value:'REJECTED',label:'退回修改'}])+field('note','审核意见与依据','textarea'),'请确认随访时间、频次、个体目标与执行内容；审核仅由责任医生完成。');if(!v.note?.trim())return toast('请记录审核意见。');if(!['APPROVED','REJECTED'].includes(v.result))return toast('审核结果无效。');for(let i=0;i<c.plan.rows.length;i++)for(let k=1;k<4;k++){if(!v['p'+i+'_'+k]?.trim())return toast('计划表内容不能为空。');c.plan.rows[i][k]=v['p'+i+'_'+k].trim()}if(v.result==='APPROVED'&&c.plan.rows.some(r=>r[1].includes('待医生确认')))return toast('请先填写每个节点的实际时间或频次，再审核通过。');c.plan.status=v.result;c.plan.review=v.note;c.plan.reviewer=account.id;acLog(c,v.result==='APPROVED'?'医生审核通过':'医生退回计划',v.note);c.stage=v.result==='APPROVED'?stage+1:ai;}
else if(action==='ac-visit'){if(stage!==follow||c.plan?.status!=='APPROVED')return toast('须计划审核通过后执行随访。');if(!v)return modal('记录实际随访执行',action,c.id,field('result','联系结果','select','SUCCESS',[{value:'SUCCESS',label:'已接通并记录反馈'},{value:'FAILED',label:'未接通，需再次联系'}])+field('note','执行记录、患者反馈与后续动作','textarea'),'记录实际反馈，不把已联系等同于已完成；未接通继续跟进。');if(!v.note?.trim()||!['SUCCESS','FAILED'].includes(v.result))return toast('请核对联系结果与记录。');c.visits.push({result:v.result==='SUCCESS'?'已接通':'未接通',success:v.result==='SUCCESS',note:v.note,at:new Date().toLocaleString('zh-CN')});acLog(c,'随访执行',v.note);}
else if(action==='ac-feedback'){if(stage!==follow||!c.visits.length)return toast('请先记录随访。');if(!v)return modal('责任医生查收随访与反馈',action,c.id,field('note','医学反馈、后续处理与计划调整意见','textarea'),'医生查收当前全部随访记录，并记录下一步意见。');if(!v.note?.trim())return toast('请填写医生反馈。');c.feedback.push({count:c.visits.length,by:account.id,note:v.note});acLog(c,'医生查收随访并反馈',v.note);}
else if(action==='ac-finish-follow'){if(stage!==follow||!c.visits.some(x=>x.success)||!c.feedback.some(f=>f.count===c.visits.length)||c.issues.some(x=>!x.closed))return toast('须有成功随访、最新记录经医生查收且全部问题闭环。');c.stage++;acLog(c,'进入复诊结果核验','随访已执行、医生已查收、个案问题已闭环。');}
else if(action==='ac-issue'){if(!v)return modal('登记患者问题',action,c.id,field('kind','问题类别','select','SERVICE',[{value:'SERVICE',label:'服务协调问题'},{value:'CLINICAL',label:'临床问题，交责任医生'}])+field('note','问题事实与待办','textarea'),'问题处理结果与患者获得反馈分别记录。');if(!v.note?.trim()||!['SERVICE','CLINICAL'].includes(v.kind))return toast('请核对问题内容。');c.issues.push({kind:v.kind,note:v.note,closed:false});acLog(c,'登记患者问题',v.note);}
else if(action==='ac-resolve'){if(!issue||issue.closed)return toast('问题状态已变化。');if(!v)return modal(issue.resolution?'核验患者已获反馈':'记录问题处理结果',action,id,field('note',issue.resolution?'患者反馈核验依据':'实质处理结果与依据','textarea'),'通知或接单不能直接关闭问题。');if(!v.note?.trim())return toast('请填写处理依据。');if(issue.resolution){issue.closed=true;issue.receipt=v.note;acLog(c,'核验问题已闭环',v.note)}else{issue.resolution=v.note;acLog(c,'记录问题处理结果',v.note)}}
else if(action==='ac-step'){if(!title||path.roles[stage]==='ai'||stage===review||stage===follow)return toast('请使用本环节专用入口。');const clinical=path.roles[stage]==='doctor',handoff=title.includes('扫码'),close=stage===path.steps.length-1;if(!v)return modal(title,action,c.id,(clinical?field('record','关联本次原报告','select','',demo.records.filter(r=>r.patient===c.patient&&r.type===path.record).map(r=>({value:r.id,label:r.title})))+field('date','报告 / 就诊日期','date','2026-10-01'):'')+(handoff?field('consent','身份核验与授权','select','',[{value:'',label:'请选择核验结果'},{value:'YES',label:'已核实身份并取得本用途授权'}]):'')+(close?field('outcome','复诊安排','select','RETURNED',[{value:'RETURNED',label:'实际复诊结果已核验'},{value:'CONTINUE',label:'本轮结束，交接持续管理'}])+field('doctorNote','复诊诊疗结果 / 医生后续意见','textarea')+field('handoff','结案后服务交接与患者确认','textarea'):'')+field('note',clinical?'原报告与医嘱核对结果':close?'结案核验依据':'实际服务结果与交接依据','textarea'),'记录本环节实际结果，保留责任人与办理依据。');if(!v.note?.trim())return toast('请填写实际结果与依据。');if(clinical){const r=demo.records.find(r=>r.id===Number(v.record)&&r.patient===c.patient&&r.type===path.record);if(!r||!v.date||(!/^\d{4}-\d{2}-\d{2}$/.test(v.date)||!Number.isFinite(Date.parse(v.date))||Date.parse(v.date)>Date.now()))return toast('请核对原报告及日期。');c.baseline={id:r.id,title:r.title,date:v.date,text:r.text,note:v.note};}if(handoff){if(v.consent!=='YES')return toast('请先核实身份与服务授权。');c.consent=true;c.handoff=true}if(close){if(!c.feedback.some(f=>f.count===c.visits.length)||c.issues.some(x=>!x.closed)||!v.doctorNote?.trim()||!v.handoff?.trim()||!['RETURNED','CONTINUE'].includes(v.outcome))return toast('请完成医生反馈、问题闭环、复诊结果与后续交接记录。');c.closed=true;c.outcome=v; }acLog(c,title,v.note+(close?'；医生结果：'+v.doctorNote+'；后续交接：'+v.handoff:''));c.stage++;}
else return;$('#dialog').close();render();toast('已更新本患者个案与办理记录。')}
// Functional extensions for individual plans, follow-up evidence and case lifecycle.
const acBaseAction=acAction, acBaseDetail=acDetail, acBasePlanTable=acPlanTable;
const acStateLabels={ACTIVE:'服务中',PAUSED:'已暂停',EXITED:'已退出',WITHDRAWN:'授权已撤回'};
function acExtras(c){c.status??='ACTIVE';c.eventKey??='DEMO-'+c.id;c.data??=[];c.planHistory??=[];if(c.plan)c.plan.details??=c.plan.rows.map(()=>({problem:c.plan.goal,goal:c.plan.goal,measure:'待医生确认',feedback:'管家记录，医生查收',escalation:'反馈变化交责任医生判断',reviewDate:''}));return c}
function acDateTime(){const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16)}
function acRequired(v,keys){return keys.every(k=>String(v[k]??'').trim())}
function acCurrentVisits(c){return c.visits.filter(v=>v.revision===c.revision)}
function acReady(c){const visits=acCurrentVisits(c);return c.plan?.status==='APPROVED'&&c.plan.reviewer===patient(c.patient).doctor&&c.plan.rows.every((r,i)=>visits.some(v=>v.node===i&&v.success))&&c.feedback.some(f=>f.count===c.visits.length&&f.by===patient(c.patient).doctor)&&!c.issues.some(x=>!x.closed)}
acPlanTable=function(c,editable=false){acExtras(c);let html=acBasePlanTable(c,editable);if(!c.plan)return html;return html+table(['节点','个体问题 / 优先目标','评价标准','反馈方式','升级条件','复盘日期'],c.plan.rows.map((r,i)=>{const d=c.plan.details[i];return [esc(r[0]),esc(d.problem)+'<br>'+esc(d.goal),esc(d.measure),esc(d.feedback),esc(d.escalation),esc(d.reviewDate||'待医生确认')]}))};
acDetail=function(c){acExtras(c);let html=acBaseDetail(c);const path=acPaths[c.kind],follow=path.steps.findIndex(s=>s.includes('医生反馈')),active=!c.closed&&c.status==='ACTIVE';
if(c.status!=='ACTIVE')html=html.replace(/(<button[^>]*data-action="ac-(?!resolve|accept)[^"]*"[^>]*)(>)/g,'$1 disabled$2');
if(c.status!=='ACTIVE')html='<div class="ac-block">'+esc(acStateLabels[c.status])+' · '+esc(c.statusReason||'')+'</div>'+html;
let controls='';if(!c.closed&&canOperate()){
 if(c.status==='ACTIVE')controls+=button('暂停服务','ac-state',c.id+':PAUSED')+button('退出本次服务','ac-state',c.id+':EXITED')+button('登记授权撤回','ac-state',c.id+':WITHDRAWN');
 if(c.status==='PAUSED')controls+=button('恢复服务','ac-state',c.id+':ACTIVE');
 if(active&&c.stage>=follow)controls+=button('调整个案计划','ac-revise',c.id);
}
if(active&&c.stage>=follow&&acAllowed(c,'doctor'))controls+=button('确认无需本轮复诊','ac-no-revisit',c.id);
html+=controls?card('服务办理','<div class="toolbar">'+controls+'</div>'):'';
html+=card('患者监测与执行记录',(active&&canOperate()?button('新增患者记录','ac-data',c.id):'')+table(['类别 / 时间','内容 / 来源','核实状态','操作'],c.data.map((d,i)=>[esc(d.kind)+'<br>'+esc(d.at),esc(d.value)+'<br>'+esc(d.source),d.verified?'责任医生已核实':'待核实',active&&!d.verified&&acAllowed(c,'doctor')?button('核实记录','ac-verify-data',c.id+':'+i):'—'])));
if(c.plan)html+=card('本轮计划执行进度',table(['节点','计划时间','执行状态','重试安排'],c.plan.rows.map((r,i)=>{const vs=acCurrentVisits(c).filter(v=>v.node===i),last=vs.at(-1);return [esc(r[0]),esc(r[1]),vs.some(v=>v.success)?'已完成':c.plan.status==='APPROVED'?'待执行':'待审核',esc(last&&!last.success?last.retry_at||'待安排':'—')]})));
if(c.closed&&canOperate()&&pValidForNewCase(c))html+=card('后续服务',button('建立新的服务周期','ac-create')+'<p>请选择本次患者及新的就医事件，历史个案保留。</p>');
if(c.outcome)html+=card('结案结果',table(['项目','记录'],[['复诊安排',esc({RETURNED:'已复诊',NONE:'医生确认无需本轮复诊',CONTINUE:'交接下一服务周期'}[c.outcome.outcome])],['结果日期',esc(c.outcome.resultDate)],['诊疗结果 / 后续意见',esc(c.outcome.doctorNote)],['后续交接',esc(c.outcome.handoff)],['患者确认',esc(c.outcome.patientReceipt)],['满意度',esc(c.outcome.satisfaction==='RATED'?c.outcome.score+' 分':{DECLINED:'拒绝评价',NO_RESPONSE:'已邀请未回应'}[c.outcome.satisfaction])]]));
return html};
acAction=function(action,id,v){
 if(action==='ac-filter')return acBaseAction(action,id,v);
 if(action==='ac-create')return acCreateCase(v);
 const [cid,ix]=String(id).split(':'),c=acVisible().find(x=>x.id===Number(cid));if(!c)return toast('无权访问该个案。');acExtras(c);
 const path=acPaths[c.kind],ai=path.roles.indexOf('ai'),review=path.steps.findIndex(s=>s.includes('计划审核')),follow=path.steps.findIndex(s=>s.includes('医生反馈')),p=patient(c.patient),doctor=acAllowed(c,'doctor'),team=acAllowed(c,'team');
 const fail=msg=>toast(msg),save=()=>{$('#dialog').close();render();toast('已保存本次办理记录。')};
 if(c.closed)return fail('个案已结案，仅可查看记录。');
 if(action==='ac-state'){
  if(!team)return fail('由服务团队登记。');const target=ix;
  if(!['ACTIVE','PAUSED','EXITED','WITHDRAWN'].includes(target)||(['EXITED','WITHDRAWN'].includes(c.status))||(target==='ACTIVE'?c.status!=='PAUSED':c.status!=='ACTIVE'))return fail('当前服务状态不允许此操作。');
  if(!v)return modal(acStateLabels[target],action,id,field('note','原因与实际核验依据','textarea'));
  if(!v.note?.trim())return fail('请填写依据。');
  if(target==='ACTIVE'&&(!p.service_consent||['PAUSED','CLOSED'].includes(p.lifecycle)))return fail('患者授权或服务状态不可用。');
  if(target==='WITHDRAWN'){p.service_consent=false;for(const other of acCases().filter(x=>x.patient===p.id&&!x.closed)){other.status='WITHDRAWN';other.statusReason=v.note;acLog(other,'撤回服务授权',v.note)}}
  else{c.status=target;c.statusReason=v.note;acLog(c,acStateLabels[target],v.note)}save();return;
 }
 // Existing issues remain available for responsible staff to finish after withdrawal.
 if((c.status!=='ACTIVE'||!p.service_consent||['PAUSED','CLOSED'].includes(p.lifecycle))&&!['ac-resolve','ac-accept'].includes(action))return fail('服务已暂停、退出或授权失效，不能继续办理。');
 if(action==='ac-revise'){
  if(!team||c.stage<follow||c.plan?.status!=='APPROVED')return fail('已批准计划由服务团队提交调整。');
  if(!v)return modal('调整个案计划',action,id,field('note','关联患者反馈或医生意见及调整原因','textarea'));
  if(!v.note?.trim())return fail('请记录调整依据。');c.revisionReason=v.note;c.stage=ai;c.noRevisit=null;acLog(c,'发起计划调整',v.note);save();return;
 }
 if(action==='ac-generate'){
  const before=c.revision;acBaseAction(action,id,v);if(c.revision!==before){acExtras(c);c.plan.report=structuredClone(c.baseline);c.plan.createdBy=account.id;c.plan.createdAt=acDateTime();c.plan.changeReason=c.revisionReason||'';c.plan.revision=c.revision;render()}return;
 }
 if(action==='ac-review'){
  if(!doctor||c.stage!==review||c.plan?.status!=='DRAFT')return fail('仅当前责任医生审核待审计划。');
  const fields=[['problem','个体问题'],['goal','优先目标'],['measure','效果评价标准'],['feedback','反馈方式'],['escalation','异常升级条件'],['reviewDate','复盘日期']];
  if(!v)return modal('审核个案随访计划表',action,id,'<div class="ac-review-fields" style="grid-column:1/-1">'+c.plan.rows.map((r,i)=>'<section class="card"><h3>'+esc(r[0])+'</h3><div class="form-grid">'+field('p'+i+'_1','日期 / 频次','text',r[1],[],false)+field('p'+i+'_2','具体动作','textarea',r[2],[],false)+field('p'+i+'_3','跟踪数据','textarea',r[3],[],false)+fields.map(([k,l])=>field('n'+i+'_'+k,l,k==='reviewDate'?'date':'textarea',c.plan.details[i][k],[],false)).join('')+'</div></section>').join('')+'</div>'+field('result','审核结果','select','APPROVED',[{value:'APPROVED',label:'审核通过'},{value:'REJECTED',label:'退回修改'}])+field('note','审核意见与依据','textarea'));
  if(!['APPROVED','REJECTED'].includes(v.result)||!v.note?.trim())return fail('请填写审核结果及意见。');
  const approved=v.result==='APPROVED',rows=structuredClone(c.plan.rows),details=structuredClone(c.plan.details);
  if(approved){for(let i=0;i<rows.length;i++){
   const keys=[1,2,3].map(k=>'p'+i+'_'+k).concat(fields.map(([k])=>'n'+i+'_'+k));
   if(!acRequired(v,keys)||keys.some(k=>String(v[k]).includes('待医生确认'))||!Number.isFinite(Date.parse(v['n'+i+'_reviewDate'])))return fail('请补齐各节点的时间、执行要求、评价标准、升级条件及复盘日期。');
   for(const k of [1,2,3])rows[i][k]=v['p'+i+'_'+k].trim();for(const [k] of fields)details[i][k]=v['n'+i+'_'+k].trim();
  }}
  c.plan.rows=rows;c.plan.details=details;c.plan.status=v.result;c.plan.review=v.note;c.plan.reviewer=account.id;c.plan.reviewedAt=acDateTime();
  if(approved){for(const old of c.planHistory.filter(h=>h.status==='APPROVED')){old.status='SUPERSEDED';old.unfinished='旧版未完成节点已停止';}c.stage=follow}else c.stage=ai;
  acLog(c,approved?'医生审核通过':'医生退回计划',v.note);save();return;
 }
 if(action==='ac-visit'){
  if(!team||c.stage!==follow||c.plan?.status!=='APPROVED'||c.plan.reviewer!==p.doctor)return fail('请先由当前责任医生审核计划。');
  if(!v)return modal('记录随访执行',action,id,field('node','本次计划节点','select','',c.plan.rows.map((r,i)=>({value:i,label:r[0]})))+field('occurred_at','实际联系时间','datetime-local',acDateTime())+field('result','联系结果','select','SUCCESS',[{value:'SUCCESS',label:'已接通并完成本节点'},{value:'FAILED',label:'未接通 / 未完成，安排重试'}])+field('symptoms','症状与监测反馈','textarea')+field('adherence','原医嘱执行与遇到的困难','textarea')+field('note','随访结论及下一步动作','textarea')+field('retry_at','未完成时的下次联系时间','datetime-local','',[],false));
  const node=Number(v.node),at=Date.parse(v.occurred_at);
  if(!Number.isInteger(node)||!c.plan.rows[node]||!['SUCCESS','FAILED'].includes(v.result)||!acRequired(v,['note','symptoms','adherence'])||!Number.isFinite(at)||at>Date.now()||at<Date.parse(c.baseline.date))return fail('请完整填写本次随访事实及联系时间。');
  if(v.result==='FAILED'&&(!Number.isFinite(Date.parse(v.retry_at))||Date.parse(v.retry_at)<=Date.now()))return fail('未完成随访须安排未来的重试时间。');
  c.visits.push({node,revision:c.revision,result:v.result==='SUCCESS'?'已接通':'未完成',success:v.result==='SUCCESS',note:v.note+'；症状/监测：'+v.symptoms+'；医嘱执行：'+v.adherence,at:v.occurred_at,retry_at:v.retry_at||'',by:account.id});acLog(c,'随访执行 · '+c.plan.rows[node][0],v.note);save();return;
 }
 if(action==='ac-feedback'&&(!acCurrentVisits(c).length||c.plan?.status!=='APPROVED'||c.plan.reviewer!==p.doctor))return fail('请先完成本轮已审核计划的随访。');
 if(action==='ac-finish-follow'&&!acReady(c))return fail('本轮全部计划节点须完成、最新随访由当前责任医生查收且问题已闭环。');
 if(action==='ac-no-revisit'){
  if(!doctor||c.stage<follow)return fail('由责任医生在随访阶段确认。');if(!v)return modal('确认无需本轮复诊',action,id,field('note','医学依据及后续安排','textarea'));
  if(!v.note?.trim())return fail('请填写医学依据。');c.noRevisit={by:account.id,note:v.note};acLog(c,'医生确认无需复诊',v.note);save();return;
 }
 if(action==='ac-data'){
  if(!team)return fail('由服务团队登记患者记录。');if(!v)return modal('新增患者记录',action,id,field('kind','记录类别','select','监测数据',['监测数据','行为数据','主观反馈'])+field('at','采集时间','datetime-local',acDateTime())+field('value','实际记录与单位','textarea')+field('source','来源及凭据','textarea'));
  if(!acRequired(v,['value','source'])||!['监测数据','行为数据','主观反馈'].includes(v.kind)||!Number.isFinite(Date.parse(v.at))||Date.parse(v.at)>Date.now())return fail('请填写实际采集信息与来源。');c.data.push({...v,verified:false});acLog(c,'登记患者记录',v.source);save();return;
 }
 if(action==='ac-verify-data'){
  const d=c.data[Number(ix)];if(!doctor||!d||d.verified)return fail('由责任医生核实待确认记录。');if(!v)return modal('核实患者记录',action,id,field('note','核实结果及依据','textarea'));if(!v.note?.trim())return fail('请填写依据。');d.verified=true;d.verifiedBy=account.id;d.verification=v.note;acLog(c,'核实患者记录',v.note);save();return;
 }
 if(action==='ac-accept'){
  const issue=c.issues[Number(ix)];if(!issue||issue.closed||issue.accepted||!(issue.kind==='CLINICAL'?doctor:team))return fail('由问题责任人员接单。');
  if(!v)return modal('受理患者问题',action,id,field('note','接单与办理安排','textarea'));if(!v.note?.trim())return fail('请填写办理安排。');issue.accepted=true;issue.acceptedBy=account.id;acLog(c,'受理患者问题',v.note);save();return;
 }
 if(action==='ac-issue'){
  if(!team)return fail('由服务团队登记问题。');if(!v)return modal('登记患者问题',action,id,field('kind','问题类别','select','SERVICE',[{value:'SERVICE',label:'服务协调'},{value:'CLINICAL',label:'临床问题，升级责任医生'}])+field('due','处理截止时间','datetime-local',acDateTime())+field('note','问题事实及来源','textarea'));
  if(!v.note?.trim()||!['SERVICE','CLINICAL'].includes(v.kind)||!Number.isFinite(Date.parse(v.due)))return fail('请填写问题、来源和截止时间。');c.issues.push({kind:v.kind,note:v.note,due:v.due,accepted:false,closed:false});acLog(c,'登记患者问题',v.note);save();return;
 }
 if(action==='ac-resolve'&&!c.issues[Number(ix)]?.accepted)return fail('请先由责任人员受理问题。');
 if(action==='ac-step'&&c.stage<path.steps.length-1){
  const title=path.steps[c.stage],clinical=path.roles[c.stage]==='doctor',handoff=title.includes('扫码'),discharge=title.includes('出院准备');
  if((clinical&&!doctor)||(!clinical&&!team))return fail('请由当前环节责任人员办理。');
  if(clinical){
   if(!v)return modal(title,action,id,field('record','本次原报告','select','',demo.records.filter(r=>r.patient===c.patient&&r.type===path.record).map(r=>({value:r.id,label:r.title})))+field('date','报告日期','date','2026-10-01')+field('missing','缺项及待确认内容（无则填写无）','textarea')+field('note','医嘱与报告核对依据','textarea'));
   if(!v.missing?.trim())return fail('请记录缺项与待确认内容。');if(acCases().some(other=>other.id!==c.id&&other.baseline?.id===Number(v.record)))return fail('该报告已关联另一就诊事件，请补充本次报告。');
  }
  if(handoff){
   if(!v)return modal(title,action,id,field('consent','身份核验与本用途授权','select','',[{value:'',label:'请选择'},{value:'YES',label:'核验完成并取得授权'}])+field('relation','办理人关系','select','SELF',[{value:'SELF',label:'患者本人'},{value:'FAMILY',label:'家属代办'}])+field('family','家属代办授权凭据（本人可不填）','textarea','',[],false)+field('source','入组渠道及来源凭据','textarea')+field('purpose','授权服务用途','text','本次诊后随访与服务协调')+field('note','身份核验、待办及服务交接结果','textarea'));
   if(!acRequired(v,['source','purpose'])||!['SELF','FAMILY'].includes(v.relation)||(v.relation==='FAMILY'&&!v.family?.trim()))return fail('请补全入组来源、服务用途及家属授权凭据。');
  }
  if(discharge){
   if(!v)return modal(title,action,id,field('materials','出院资料及医嘱准备','textarea')+field('home','居家执行与家属协助安排','textarea')+field('revisit','复诊安排与联系渠道','textarea')+field('note','管家交接与未结事项','textarea'));
   if(!acRequired(v,['materials','home','revisit']))return fail('请补全出院资料、居家准备和复诊交接。');
  }
  const before=c.stage;acBaseAction(action,id,v);if(v&&c.stage!==before){if(clinical)c.baseline.missing=v.missing;if(handoff)c.enrollment={...v};if(discharge)c.discharge={...v};render()}return;
 }
 if(action==='ac-step'&&c.stage===path.steps.length-1){
  if(!team||!acReady(c))return fail('请先完成全部计划节点、医生查收和问题闭环。');
  if(!v)return modal('复诊结果与服务结案',action,id,field('outcome','本轮结果','select','RETURNED',[{value:'RETURNED',label:'实际复诊结果已核验'},{value:'NONE',label:'医生确认无需本轮复诊'},{value:'CONTINUE',label:'交接下一服务周期'}])+field('resultDate','复诊 / 结果核验日期','date',acDateTime().slice(0,10))+field('doctorNote','复诊诊疗结果 / 医生后续意见','textarea')+field('handoff','后续服务安排与交接对象','textarea')+field('patientReceipt','患者获得结果与交接的确认凭据','textarea')+field('satisfaction','满意度邀请结果','select','NO_RESPONSE',[{value:'RATED',label:'已评分'},{value:'DECLINED',label:'拒绝评价'},{value:'NO_RESPONSE',label:'已邀请未回应'}])+field('score','已评分时填写 1–5 分','number','',[],false)+field('note','复诊 / 结案核验凭据','textarea'));
  if(!acRequired(v,['doctorNote','handoff','patientReceipt','note'])||!['RETURNED','NONE','CONTINUE'].includes(v.outcome)||!Number.isFinite(Date.parse(v.resultDate))||Date.parse(v.resultDate)>Date.now()||v.resultDate<c.baseline.date)return fail('请补全实际结果、日期和患者交接凭据。');
  if(v.outcome==='NONE'&&c.noRevisit?.by!==p.doctor)return fail('无需复诊必须有当前责任医生的独立医学确认。');
  if(!['RATED','DECLINED','NO_RESPONSE'].includes(v.satisfaction)||(v.satisfaction==='RATED'?(!Number.isInteger(Number(v.score))||Number(v.score)<1||Number(v.score)>5):!!v.score))return fail('仅已评分时填写 1–5 分。');
  c.outcome={...v};c.closed=true;c.stage++;acLog(c,'复诊结果与服务结案',v.note+'；患者确认：'+v.patientReceipt);save();return;
 }
 return acBaseAction(action,id,v);
};


function pValidForNewCase(c){return patient(c.patient)?.service_consent}
function acCreateCase(v){
 if(!canOperate())return toast('由服务团队建立个案。');
 if(!v)return modal('建立本次服务个案','ac-create','',field('patient','患者','select','',patients().map(p=>({value:p.id,label:p.name})))+field('kind','服务路径','select','OUTPATIENT',Object.entries(acPaths).map(([value,p])=>({value,label:p.label})))+field('eventKey','本次就医事件编号')+field('note','来源及服务需求','textarea'));
 const p=patients().find(p=>p.id===Number(v.patient));
 if(!p||!p.service_consent||['PAUSED','CLOSED'].includes(p.lifecycle)||!person(p.doctor)?.active||!person(p.owner)?.active||!acPaths[v.kind]||!v.eventKey?.trim()||!v.note?.trim())return toast('请核对患者授权、责任团队及就医事件。');
 if(acCases().some(c=>c.eventKey===v.eventKey.trim()))return toast('此就医事件已有个案，请勿重复建立。');
 const c={id:Math.max(1000,...acCases().map(c=>c.id))+1,patient:p.id,kind:v.kind,eventKey:v.eventKey.trim(),stage:0,logs:[],plan:null,planHistory:[],visits:[],feedback:[],issues:[],baseline:null,consent:false,handoff:false,closed:false,revision:0,status:'ACTIVE',data:[]};
 acCases().push(c);acLog(c,'建立服务个案',v.note);$('#dialog').close();go('/after-care?scene='+c.kind+'&case='+c.id);
}
acFlow=function(kind,c){return table(['环节','服务内容','责任人','状态'],acPaths[kind].steps.map((title,i)=>[String(i+1).padStart(2,'0'),esc(title),esc({doctor:'责任医生',team:'管家 / 运营 / 护士',ai:'团队点击生成'}[acPaths[kind].roles[i]]),c?i<c.stage?'已完成':i===c.stage?'当前环节':'待办理':'—']))};
document.addEventListener('click',e=>{const b=e.target.closest('[data-action^="ac-"]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();acAction(b.dataset.action,b.dataset.id)},true);
document.addEventListener('submit',e=>{const f=e.target.closest('[data-form^="ac-"]');if(!f)return;e.preventDefault();e.stopImmediatePropagation();acAction(f.dataset.form,f.dataset.id,Object.fromEntries(new FormData(f)))},true);
render();
