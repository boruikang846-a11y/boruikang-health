'use strict';
const sheetRounds=['首次沟通','跟进沟通'];
const sheetGrades={CRITICAL:'危急',WARNING:'预警',NORMAL:'普通',UNASSESSED:'待核实'};
function sheetNormalizeRounds(x){
 const original=x.communications||[];
 if(original.length>sheetRounds.length)x.archivedCommunications??=original.slice(sheetRounds.length);
 if(x.communicationDetails?.length>sheetRounds.length)x.archivedCommunicationDetails??=x.communicationDetails.slice(sheetRounds.length);
 x.communications=sheetRounds.map((_,i)=>original[i]||'未记录');
 if(x.communicationDetails)x.communicationDetails=x.communicationDetails.slice(0,sheetRounds.length);
 return x;
}
function sheetState(){const state=demo.screeningSheet??={records:structuredClone(screeningSheetData.records).map(sheetSeedDetails),logs:[]};state.records.forEach(sheetNormalizeRounds);return state}
function sheetGrade(x){return Object.hasOwn(sheetGrades,x.ecgGrade)?x.ecgGrade:'UNASSESSED'}
function sheetRows(){return sheetState().records.filter(x=>screeningVisible(x))}
function sheetRisk(x){const grade=sheetGrade(x);return '<span class="sheet-risk '+grade.toLowerCase()+'">'+sheetGrades[grade]+'</span>'}
function screeningSheetMetrics(){const rs=sheetRows();return '<div class="quality-metrics">'+[['回访邀约对象',rs.length],['高危 / 危急',rs.filter(x=>x.risk==='高危').length+' / '+rs.filter(x=>x.risk==='危急').length],['已到诊 / 有效到诊',rs.filter(x=>x.arrival==='已到诊').length+' / '+rs.filter(x=>x.effective).length],['下次随访已填写',rs.filter(x=>x.nextRecorded).length]].map(([l,n])=>'<div><small>'+l+'</small><strong>'+n+'</strong><span>当前权限范围 · 原表历史记录</span></div>').join('')+'</div>'}
function screeningSheetLedger(){
 const requested=current.query.get('risk')||'',risk=Object.values(sheetGrades).includes(requested)?requested:'',arrival=current.query.get('arrival')||'';
 const rows=sheetRows().filter(x=>(!risk||sheetGrades[sheetGrade(x)]===risk)&&(!arrival||x.arrival===arrival));
 const pages=Math.ceil(rows.length/12)||1,pageNo=Math.max(1,Math.min(pages,Number(current.query.get('page'))||1));
 const route=page=>'/screening?tab=invitations&risk='+encodeURIComponent(risk)+'&arrival='+encodeURIComponent(arrival)+'&page='+page;
 return '<div class="source-context"><h2>全周期管理 · 回访邀约跟踪表</h2><p>两轮沟通，持续跟进预约、到诊与随访计划。风险沿用本次报告分级，未完成核实的对象显示待核实。</p><div class="sheet-risk-legend" aria-label="风险等级">'+['CRITICAL','WARNING','NORMAL'].map(ecgGrade=>sheetRisk({ecgGrade})).join('')+'<small>历史台账为脱敏演示，沟通详情为虚构样例。</small></div></div>'+
 '<form data-form="sheet-filter" class="sheet-filters">'+field('risk','风险','select',risk,[{value:'',label:'全部'},...Object.values(sheetGrades)],false)+field('arrival','到诊状态','select',arrival,[{value:'',label:'全部'},'已到诊','未到诊'],false)+'<button class="primary" type="submit">筛选台账</button>'+link('重置','/screening?tab=invitations','btn')+'</form>'+
 card('回访邀约清单 · '+rows.length+' 条',table(['演示对象 / 来源','性别 / 年龄','报告结论','电话','风险','两轮沟通','预约 / 到诊','有效到诊 / 原因','下次随访 / 超期','操作'],rows.slice((pageNo-1)*12,pageNo*12).map(x=>[
 '<strong>'+esc(x.name)+'</strong><br><small>'+esc(x.source)+'</small>',esc(x.gender)+' / '+(x.age==null?'未填写':esc(x.age)+' 岁'),'<div class="sheet-report-conclusion">'+esc(x.reportConclusion)+'</div>',
 '<span class="sheet-demo-phone">'+esc(x.phone)+'</span><br><small class="muted">'+(x.localImport?'本地导入':'虚构号码')+'</small>',sheetRisk(x),
 sheetDetailButton(x,'communication',sheetRounds.map((_,i)=>'<div class="sheet-round">第'+(i+1)+'轮 · '+(x.communications[i]==='未记录'?'未记录':'已记录')+'</div>').join('')),
 sheetDetailButton(x,'arrival',esc(x.appointmentDate||'预约日期未填')+'<br>'+tag(x.arrival)+'<br><small>'+esc(x.arrivalDate||'到诊日期未填')+'</small>'),
 sheetDetailButton(x,'effective',tag('有效到诊：'+(x.effective?'是':'否'))+'<br><small>'+esc(x.absenceReason||x.effectiveBasis||'原因未填写')+'</small>'),
 sheetDetailButton(x,'followup',esc(x.nextDemo||'计划日期未填')+'<br>'+tag(sheetPlanStatus(x))),link('回访与跟进','/screening/'+x.id,'btn')
 ])))+(rows.length?'':'<div class="note">暂无符合条件的邀约记录，请调整筛选条件。</div>')+
 '<div class="row between"><span>第 '+pageNo+' 页 / '+pages+' 页 · 每页 12 条</span><div class="row">'+(pageNo>1?link('上一页',route(pageNo-1),'btn'):'')+(pageNo*12<rows.length?link('下一页',route(pageNo+1),'btn'):'')+'</div></div>'+
 card('沟通与跟进','<p>第 1 轮首次沟通，第 2 轮跟进沟通；每轮保留时间、结果、事实记录、负责人及下次计划。未接通须填写下次联系时间，到诊后的安排在随访计划中继续记录。</p>');
}
function screeningSheetDetail(id){const x=sheetRows().find(x=>x.id===id);if(!x)return forbidden();const clinical=account.role==='DOCTOR',notes=x.notes||[];return page(x.name+' · 回访邀约档案','源表业务场景映射；无真实患者身份与医疗正文。','<div class="toolbar">'+link('返回邀约台账','/screening?tab=invitations','btn')+(canOperate()?button('修改患者资料','sheet-edit',id)+button('登记沟通','sheet-contact',id,'primary')+'<button type="button" data-action="sheet-detail" data-id="'+id+'" data-section="followup">更新随访计划</button>':'')+(clinical?button('登记医生复核意见','sheet-doctor',id,'primary')+(typeof scGrade==='function'&&account.id===x.doctor?button('确认风险分级','sc-grade',id):''):'')+'</div>'+sheetSummary(x)+card('两轮沟通记录','<div class="sheet-round-grid">'+sheetRounds.map((l,i)=>'<section><span class="eyebrow">第 '+(i+1)+' 轮</span><h3>'+l+'</h3><p>'+esc(x.communications[i])+(x.communicationDetails?.[i]?'<br><small>'+esc(x.communicationDetails[i].at)+' · '+esc(x.communicationDetails[i].by)+'</small>':'')+'</p><small>原表正文未复制；新演示记录另行留痕。</small></section>').join('')+'</div>')+card('预约、到诊与持续管理',table(['字段','历史填写情况'],[['预约日期',esc(x.appointmentDate||'未填')],['预约科室 / 医生',esc(x.appointmentDepartment||'未填写')],['到诊日期',esc(x.arrivalDate||'未填')],['到诊状态',x.arrival],['有效到诊',x.effective?'是':'否'],['未到诊原因',esc(x.absenceReason||'无 / 未填写')],['下次随访日期',x.nextDemo?esc(x.nextDemo)+'（新增演示）':x.nextRecorded?'历史日期已填':'未填'],['当前计划状态',sheetPlanStatus(x)],['历史台账超期状态',x.deadline],['随访计划',esc(x.followupPlan||'未填写')],['有效到诊依据',esc(x.effectiveBasis||'未填写')]]))+card('新增演示跟进记录','<ul class="timeline">'+notes.map(n=>'<li><small>'+esc(n.at)+' · '+esc(n.by)+'</small><br>'+esc(n.text)+'</li>').join('')+'</ul>'))}
function screeningSheetReconcile(){if(!manager()&&account.role!=='DOCTOR')return card('源表核对','<p>完整源表汇总仅供主管与医生查看，个人队列不使用全表分母。</p>');const r=screeningSheetData.records,n=r.length,appointment=r.filter(x=>x.appointmentRecorded).length,arrived=r.filter(x=>x.arrival==='已到诊').length;const pct=v=>typeof v==='number'?(v*100).toFixed(2)+'%':String(v);const rows=[['有效触达率','首次沟通非空 / 64',r.filter(x=>x.communications[0]!=='未记录').length/n,'填写非空不证明身份核实或有效沟通'],['高风险及时处理率','高危与危急首次沟通非空 / 高危与危急',r.filter(x=>['高危','危急'].includes(x.risk)&&x.communications[0]!=='未记录').length/r.filter(x=>['高危','危急'].includes(x.risk)).length,'原表没有统一时限证据，不能证明及时处理'],['预约率','预约日期非空 / 64',appointment/n,'明细预约日期非空 14 条；原汇总值对应 55 条'],['预约履约率','已到诊 / 已预约日期非空',null,'52 条已到诊、14 条预约日期非空，分母不一致，暂不计算'],['有效到诊率','有效到诊=是 / 64',r.filter(x=>x.effective).length/n,'历史台账分类，尚无本系统验收凭证'],['入组率','P7-管理中 / 64',r.filter(x=>x.status==='P7-管理中').length/n,'P7 不替代医生本人确认入组'],['随访完成率','下次随访日期非空 / 64',r.filter(x=>x.nextRecorded).length/n,'下次计划非空不是已完成随访'],['复诊/复查完成率','P8 人数 / 有效到诊人数',r.filter(x=>x.status==='P8-待复诊/复查').length/r.filter(x=>x.effective).length,'P8 是待复诊状态，不等于复查完成'],['失访率','P9-暂缓/拒绝 / 64',r.filter(x=>x.status==='P9-暂缓/拒绝').length/n,'暂缓或拒绝不自动等于失访']];return card('原表汇总与明细核对',table(['指标','源表缓存值','明细重算口径','明细结果','口径差异 / 处理'],rows.map(([metric,definition,value,warning])=>{const source=screeningSheetData.summary.find(x=>x.metric===metric);return [metric,pct(source?.cached),definition,value===null?'暂停计算':pct(value),esc(warning)]})))+card('数据质量待办','<p>原表记录 64 条：高危 18、危急 4、中危 16、低危 26；已到诊 52、未到诊 12；下次随访日期已填 52 条。源表到诊日期仅 13 条有值。</p><p>补齐预约与到诊日期及凭证后再计算履约率；保留原缓存值作为核对证据。超期状态仅展示原表历史值，不能按当前日期解释为仍正常。</p>')}
function sheetAction(kind,id,v){const x=sheetRows().find(x=>x.id===Number(id));if(!x)return toast('无权访问该对象。');if(kind==='sheet-doctor'){if(account.role!=='DOCTOR'||account.id!==x.doctor)return toast('仅责任医生本人可复核。')}else if(!canOperate())return toast('仅执行角色可更新运营记录。');if(kind==='sheet-edit'){if(!v){modal('修改患者资料',kind,id,field('name','姓名','text',x.name)+field('gender','性别','select',x.gender,['男','女','未知'])+field('age','年龄','number',x.age)+field('phone','电话','text',x.phone)+field('reportConclusion','心电图诊断结果','textarea',x.reportConclusion)+field('note','修改原因','textarea'),'保存到当前页面内存，刷新清除。');return}if(!v.name||!/^\d+$/.test(v.age)||Number(v.age)>130||!['男','女','未知'].includes(v.gender)||(v.phone&&!/^[+0-9 -]{6,24}$/.test(v.phone))||!v.reportConclusion||!v.note)return toast('请检查姓名、性别、年龄、电话、结论和修改原因。');const before=structuredClone(x);Object.assign(x,{name:v.name,gender:v.gender,age:Number(v.age),phone:v.phone,reportConclusion:v.reportConclusion,source:v.source??x.source,contactNote:v.contactNote??x.contactNote,risk:'待复核',centerRisk:undefined,centerRiskEvidence:'',centerRiskReviewedBy:null,centerRiskReviewedAt:null,doctorNote:'',ecgGrade:null,ecgScope:null,ecgEvidence:'',ecgReviewedBy:null,ecgReviewedAt:null});sheetState().logs.push({at:new Date().toLocaleString('zh-CN'),by:account.name,id:x.id,section:'summary',reason:v.note,before,after:structuredClone(x)});x.notes??=[];x.notes.unshift({at:new Date().toLocaleString('zh-CN'),by:account.name,text:'修改资料：'+v.note});if($('#dialog').open)$('#dialog').close();render();return toast('已保存摘要，待医生复核。')}if(!['sheet-contact','sheet-doctor'].includes(kind))return toast('该操作已停用，请在随访详情中更新计划。');
 if(!v){
  const pending=x.communications.findIndex(c=>c==='未记录'),round=String(pending<0?2:pending+1);
  const fields=kind==='sheet-contact'?field('round','沟通轮次','select',round,sheetRounds.map((label,i)=>({value:String(i+1),label:'第 '+(i+1)+' 轮 · '+label})))+field('result','沟通结果','select','SUCCESS',[{value:'SUCCESS',label:'已核实身份并完成沟通'},{value:'FAILED',label:'未接通 / 身份未核实'}])+field('note','虚构沟通记录','textarea')+field('next','下次联系时间（未接通必填）','datetime-local','',[],false):field('note','医生复核意见（虚构，不代表医疗诊断）','textarea');
  modal('回访邀约 · 新增演示记录',kind,id,fields,'仅保存虚构演示记录，不联系真实患者或发送消息。');return;
 }
 if(!v.note?.trim())return toast('请填写记录。');
 if(kind==='sheet-contact'){
  if(!['1','2'].includes(v.round)||!['SUCCESS','FAILED'].includes(v.result))return toast('仅支持第 1、2 轮沟通，请检查沟通结果。');
  if(v.result==='FAILED'&&!v.next)return toast('未接通须留下下次联系时间。');
  if(v.next&&(!sheetDateInput(v.next)||Number.isNaN(Date.parse(v.next))))return toast('下次联系时间格式无效。');
  const before=structuredClone(x),index=Number(v.round)-1;
  x.communications[index]='新增演示：'+v.note;x.communicationDetails??=[];
  x.communicationDetails[index]={at:new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16),result:v.result==='SUCCESS'?'已核实身份并完成沟通':'未接通 / 身份未核实',text:v.note,by:account.name,next:v.next||'未安排'};
  if(v.next){x.nextRecorded=true;x.nextDemo=v.next}
  sheetState().logs.push({at:new Date().toLocaleString('zh-CN'),by:account.name,id:x.id,section:'communication',reason:'登记第 '+v.round+' 轮沟通',before,after:structuredClone(x)});
 }else x.doctorNote=v.note;
 x.notes??=[];x.notes.unshift({at:new Date().toLocaleString('zh-CN'),by:account.name,text:v.note+(v.next?'；下次计划 '+v.next:'')});
 $('#dialog').close();render();toast('已保存新增演示记录；原表保持不变。');
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-action^="sheet-"]');if(b){if(b.dataset.action==='sheet-detail')sheetShowDetails(b.dataset.id,b.dataset.section);else if(b.dataset.action==='sheet-detail-edit')sheetEditDetails(b.dataset.id,b.dataset.section);else sheetAction(b.dataset.action,b.dataset.id)}});
document.addEventListener('submit',e=>{const f=e.target.closest('[data-form^="sheet-"]');if(!f)return;e.preventDefault();const v=Object.fromEntries(new FormData(f));Object.keys(v).forEach(k=>v[k]=String(v[k]).trim());if(f.dataset.form==='sheet-filter'){go('/screening?tab=invitations&risk='+encodeURIComponent(v.risk)+'&arrival='+encodeURIComponent(v.arrival));return}if(f.dataset.form==='sheet-detail-save'){sheetSaveDetails(f.dataset.id,v);return}sheetAction(f.dataset.form,f.dataset.id,v)});

// Details are fictional examples; source summary and historical completeness remain intact.
function sheetSeedDetails(x){
 sheetNormalizeRounds(x);
 const n=x.id-6101,day=String(n%20+1).padStart(2,'0');
 x.communicationDetails=x.communications.map((c,i)=>c==='未记录'?null:{at:'2026-09-'+String(Math.min(28,n%20+1+i*3)).padStart(2,'0')+' 10:00',result:i===0?'已核实身份并完成沟通':'已确认就诊意向',text:['介绍筛查回访流程，对方同意了解门诊预约方式。','确认可到院时间，说明预约地点及需要携带的资料。'][i],by:'演示执行负责人',next:i<sheetRounds.length-1?'2026-09-'+String(Math.min(28,n%20+4+i*3)).padStart(2,'0')+' 10:00':'按随访计划联系'});
 x.appointmentDate=x.appointmentRecorded?'2026-09-'+day+' 09:00':'';
 x.appointmentDepartment=x.appointmentRecorded?'心内科 · 演示门诊':'';
 x.arrivalDate=x.arrivalDateRecorded?'2026-09-'+day+' 09:15':'';
 x.absenceReason=x.reasonRecorded?['个人时间冲突，暂缓到院','选择外院就诊，等待反馈','交通安排未落实'][n%3]:'';
 x.effectiveBasis=x.effective?'演示登记：已完成门诊接诊并确认本次就诊记录。':x.arrival==='已到诊'?'已到院，接诊记录待核实，暂未计为有效到诊。':'尚未到院，未计为有效到诊。';
 x.nextDemo=x.nextRecorded?(x.deadline==='正常'?'2026-10-'+String(10+n%20).padStart(2,'0'):'2026-09-'+day)+'T10:00':'';
 x.followupPlan=x.nextRecorded?'电话核实近期就诊安排，确认后续复诊或复查计划。':'尚未安排，待负责人补充联系计划。';
 x.demoDetails=true;return x;
}
function sheetDetailButton(x,section,content){return '<button type="button" class="sheet-detail-button" data-action="sheet-detail" data-id="'+x.id+'" data-section="'+section+'" aria-label="'+esc(x.name)+' · 查看'+({communication:'两轮沟通',arrival:'预约与到诊',effective:'有效到诊与原因',followup:'下次随访与超期'})[section]+'详情">'+content+'<small class="sheet-detail-hint">查看详情 ›</small></button>'}
function sheetShowDetails(id,section){
 const x=sheetRows().find(x=>x.id===Number(id));if(!x)return toast('无权访问该对象。');
 const titles={communication:'两轮沟通',arrival:'预约 / 到诊',effective:'有效到诊 / 原因',followup:'下次随访 / 超期'};if(!titles[section])return;
 if(canOperate())return sheetEditDetails(id,section);
 const rows=section==='arrival'?[['预约日期',x.appointmentDate||'未填写'],['预约科室',x.appointmentDepartment||'未填写'],['到诊状态',x.arrival],['到诊日期',x.arrivalDate||'未填写']]:section==='effective'?[['有效到诊',x.effective?'是':'否'],['判定依据',x.effectiveBasis||'待核实'],['未到诊原因',x.absenceReason||'无 / 未填写']]:[['下次随访时间',x.nextDemo||'未填写'],['随访计划',x.followupPlan||'待补充'],['负责人',person(x.owner)?.name||'待分配'],['计划状态',x.nextDemo?(x.nextDemo.slice(0,10)<new Date().toLocaleDateString('sv-SE')?'已超期':'未超期'):'未填写'],['历史台账超期状态',x.deadline]];
 const body=section==='communication'?'<div class="sheet-round-grid">'+sheetRounds.map((label,i)=>{const c=x.communicationDetails?.[i];return '<section><h3>第 '+(i+1)+' 轮 · '+label+'</h3>'+(c?'<dl>'+[['时间',c.at],['结果',c.result],['记录',c.text],['负责人',c.by],['下次计划',c.next]].map(([k,v])=>'<dt>'+esc(k)+'</dt><dd>'+esc(v)+'</dd>').join('')+'</dl>':'<p>'+esc(x.communications[i]||'未记录')+'</p>')+'</section>'}).join('')+'</div>':table(['字段','详情'],rows.map(([k,v])=>[esc(k),esc(v)]));
 $('#dialog-content').innerHTML='<h2>'+esc(x.name+' · '+titles[section])+'</h2><p class="note">虚构演示详情；日期、沟通正文与到诊依据不来自真实患者。</p>'+body+'<div class="form-actions">'+button('关闭','close')+'</div>';$('#dialog').showModal();
}

function sheetPlanStatus(x){return x.nextDemo?(x.nextDemo.slice(0,10)<new Date().toLocaleDateString('sv-SE')?'已超期':'未超期'):'未填写'}
function sheetDateInput(value){const v=String(value||'').replace(' ','T');return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)?v:''}
function sheetEditDetails(id,section){
 const x=sheetRows().find(x=>x.id===Number(id));if(!x)return toast('无权访问该对象。');if(!canOperate())return toast('仅执行角色可修改运营详情。');
 const titles={communication:'两轮沟通',arrival:'预约 / 到诊',effective:'有效到诊 / 原因',followup:'下次随访 / 超期'};if(!titles[section])return;
 let fields=field('section','','hidden',section);
 if(section==='communication')fields+=sheetRounds.map((label,i)=>{const c=x.communicationDetails?.[i]||{},prefix='round'+i;return '<fieldset class="sheet-edit-round"><legend>第 '+(i+1)+' 轮 · '+label+'</legend>'+field(prefix+'At','沟通时间','datetime-local',sheetDateInput(c.at),[],false)+field(prefix+'Result','沟通结果','select',c.result||'未记录',['未记录','已核实身份并完成沟通','未接通 / 身份未核实','已确认就诊意向','已反馈跟进安排'])+field(prefix+'Text','沟通记录','textarea',c.text||'',[],false)+field(prefix+'By','负责人','text',c.by||account.name,[],false)+field(prefix+'Next','下次联系时间','datetime-local',sheetDateInput(c.next),[],false)+field(prefix+'NextPlan','下次计划说明','text',c.nextPlan||(sheetDateInput(c.next)?'':c.next)||'',[],false)+'</fieldset>'}).join('');
 else if(section==='arrival')fields+=field('appointmentDate','预约日期','datetime-local',sheetDateInput(x.appointmentDate),[],false)+field('appointmentDepartment','预约科室 / 医生','text',x.appointmentDepartment||'',[],false)+field('arrival','到诊状态','select',x.arrival,['未到诊','已到诊'])+field('arrivalDate','到诊日期','datetime-local',sheetDateInput(x.arrivalDate),[],false);
 else if(section==='effective')fields+=field('effective','有效到诊','select',x.effective?'yes':'no',[{value:'yes',label:'是'},{value:'no',label:'否'}])+field('effectiveBasis','有效到诊判定依据','textarea',x.effectiveBasis||'')+field('absenceReason','未到诊原因','textarea',x.absenceReason||'',[],false);
 else fields+=field('nextDemo','下次随访时间','datetime-local',sheetDateInput(x.nextDemo),[],false)+field('followupPlan','随访计划','textarea',x.followupPlan||'',[],false)+'<p>负责人：'+esc(person(x.owner)?.name||'待分配')+'；当前计划：'+esc(sheetPlanStatus(x))+'；历史台账状态：'+esc(x.deadline)+'。超期状态按计划日期自动计算。</p>';
 const body='<div class="'+(section==='communication'?'sheet-direct-rounds':'form-grid')+'">'+fields+'</div>'+field('changeReason','修改原因','textarea');
 $('#dialog-content').innerHTML='<h2>'+esc(x.name+' · '+titles[section])+'</h2><p class="note">虚构演示详情；日期、沟通正文与到诊依据不来自真实患者。可直接修改下方内容，点击保存后生效。</p><form data-form="sheet-detail-save" data-id="'+x.id+'">'+body+'<p class="muted">保存到当前页面内存；取消不保存，刷新恢复初始化。</p><div class="form-actions">'+button('取消','close')+'<button type="submit" class="primary">保存修改</button></div></form>';$('#dialog').showModal();
}
function sheetSaveDetails(id,v){
 const x=sheetRows().find(x=>x.id===Number(id));if(!x)return toast('无权访问该对象。');if(!canOperate())return toast('仅执行角色可修改运营详情。');
 if(!v.changeReason?.trim())return toast('请填写修改原因。');
 const validDate=d=>!d||(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(d)&&!Number.isNaN(Date.parse(d)));
 let patch={};
 if(v.section==='communication'){
  if(Object.keys(v).some(key=>{const match=key.match(/^round(\d+)/);return match&&Number(match[1])>=sheetRounds.length}))return toast('仅支持两轮沟通，请重新打开详情。');
  const details=[];for(let i=0;i<sheetRounds.length;i++){const prefix='round'+i,result=v[prefix+'Result'],at=v[prefix+'At']||'',text=v[prefix+'Text']||'',by=v[prefix+'By']||'',next=v[prefix+'Next']||'';
   if(!['未记录','已核实身份并完成沟通','未接通 / 身份未核实','已确认就诊意向','已反馈跟进安排'].includes(result)||!validDate(at)||!validDate(next))return toast('请检查沟通结果与日期。');
   if(result!=='未记录'&&(!at||!text.trim()||!by.trim()))return toast('已记录的沟通须填写时间、记录和负责人。');
   if(result==='未接通 / 身份未核实'&&!next)return toast('未接通须填写下次联系时间。');
   if(result==='未记录'&&(at||text||next||v[prefix+'NextPlan']))return toast('填写沟通内容后请选择对应沟通结果。');
   details.push(result==='未记录'?null:{at,result,text,by,next:next||v[prefix+'NextPlan']||'未安排',nextPlan:v[prefix+'NextPlan']||''});
  }patch={communicationDetails:details,communications:details.map(c=>c?'新增演示：'+c.text:'未记录')};
 }else if(v.section==='arrival'){
  if(!['已到诊','未到诊'].includes(v.arrival)||!validDate(v.appointmentDate)||!validDate(v.arrivalDate))return toast('请检查到诊状态和日期。');
  if(v.arrival==='已到诊'&&!v.arrivalDate)return toast('已到诊须填写到诊日期。');
  if(v.arrival==='未到诊'&&v.arrivalDate)return toast('未到诊不能填写到诊日期。');
  patch={appointmentDate:v.appointmentDate||'',appointmentDepartment:v.appointmentDepartment||'',appointmentRecorded:!!v.appointmentDate,arrival:v.arrival,arrivalDate:v.arrivalDate||'',arrivalDateRecorded:!!v.arrivalDate};
  if(v.arrival==='未到诊'){patch.effective=false;patch.effectiveBasis='尚未到院，未计为有效到诊。';}
  else{patch.absenceReason='';patch.reasonRecorded=false;}
 }else if(v.section==='effective'){
  if(!['yes','no'].includes(v.effective)||!v.effectiveBasis?.trim())return toast('请选择有效到诊并填写判定依据。');
  if(v.effective==='yes'&&(x.arrival!=='已到诊'||!x.arrivalDate))return toast('有效到诊须先登记已到诊和到诊日期。');
  if(x.arrival==='未到诊'&&!v.absenceReason?.trim())return toast('未到诊须填写原因。');
  if(x.arrival==='已到诊'&&v.absenceReason?.trim())return toast('已到诊不应填写未到诊原因。');
  patch={effective:v.effective==='yes',effectiveBasis:v.effectiveBasis,absenceReason:v.absenceReason||'',reasonRecorded:!!v.absenceReason};
 }else if(v.section==='followup'){
  if(!validDate(v.nextDemo))return toast('随访日期格式无效。');
  if(!!v.nextDemo!==!!v.followupPlan?.trim())return toast('随访时间与计划须同时填写或同时清空。');
  patch={nextDemo:v.nextDemo||'',nextRecorded:!!v.nextDemo,followupPlan:v.followupPlan||''};
 }else return toast('详情类型无效。');
 const before=structuredClone(x);Object.assign(x,patch);sheetState().logs.push({at:new Date().toLocaleString('zh-CN'),by:account.name,id:x.id,section:v.section,reason:v.changeReason,before,after:structuredClone(x)});
 x.notes??=[];x.notes.unshift({at:new Date().toLocaleString('zh-CN'),by:account.name,text:'修改详情：'+v.changeReason});
 $('#dialog').close();render();sheetShowDetails(id,v.section);toast('已保存详情，列表与档案同步更新。');
}

function sheetSummary(x){
 const readonly='<div class="row">'+sheetRisk(x)+tag(x.arrival)+'</div><p>来源：'+esc(x.source)+' · 责任医生：'+esc(person(x.doctor)?.name)+' · 执行负责人：'+esc(person(x.owner)?.name)+'</p><p>性别 / 年龄：'+esc(x.gender)+' / '+(x.age==null?'未填写':esc(x.age)+' 岁')+'</p><p>电话：<span class="sheet-demo-phone">'+esc(x.phone)+'</span>'+(x.localImport?'（本地导入）':'（虚构号码，不可用于联系）')+'</p><p>原联系方式备注：'+esc(x.contactNote||'—')+'</p><p>报告结论：'+esc(x.reportConclusion)+'</p><p>详情弹窗内的日期与正文均为虚构演示，原表实际日期未复制。</p><p>医生复核：'+esc(x.doctorNote||'未在本系统复核；不能从历史台账推断审核通过')+'</p>';
 if(!canOperate())return card('台账摘要',readonly);
 const fields=field('name','姓名','text',x.name)+field('gender','性别','select',x.gender,['男','女','未知'])+field('age','年龄','number',x.age)+field('phone','电话','text',x.phone,[],false)+field('source','来源','text',x.source)+field('contactNote','原联系方式备注','textarea',x.contactNote||'',[],false)+field('reportConclusion','心电图诊断结果','textarea',x.reportConclusion)+field('note','修改原因','textarea');
 return card('台账摘要','<div class="row">'+sheetRisk(x)+tag(x.arrival)+'</div><p>责任医生：'+esc(person(x.doctor)?.name)+' · 执行负责人：'+esc(person(x.owner)?.name)+'</p><form data-form="sheet-edit" data-id="'+x.id+'"><div class="form-grid">'+fields+'</div><p class="muted">可直接修改摘要；保存后更新列表与档案，并置为待医生复核。数据保存在页面内存，刷新恢复初始化。</p><div class="form-actions"><button type="reset">重置</button><button type="submit" class="primary">保存摘要</button></div></form><p>医生复核：'+esc(x.doctorNote||'未在本系统复核')+'</p>');
}
