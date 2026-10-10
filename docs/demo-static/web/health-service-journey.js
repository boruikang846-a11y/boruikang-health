'use strict';
// 2.4 interactive prototype. Reuses acCases, reports, plans, visits, issues and audit.
// These editable journey nodes are local demo state, not the 2.3 server contract.
const hjRoles={OPERATOR:'运营人员',NURSE:'质控护士',DOCTOR:'责任医生'};
const hjKinds={OUTPATIENT:'OUTPATIENT',INPATIENT:'DISCHARGE',EXAM:'CHECKUP'};
const hjCenters={OUTPATIENT:'OUTPATIENT',DISCHARGE:'INPATIENT',CHECKUP:'EXAM'};
const hjRoleKey={OPERATOR:'operator',NURSE:'nurse',DOCTOR:'doctor'};
const hjF=(key,label,type='textarea',options)=>({key,label,type,options});
const hjNode=(key,title,phase,role,action,goal,fields)=>({key,title,phase,role,action,goal,fields});
const hjCommonIntake=()=>hjNode('intake','接入与服务建档','PRE','OPERATOR','确认接入并交接','核实服务对象、授权用途和患者本次需求，明确协作团队。',[
 hjF('channel','来源渠道 / 来源编号','text'),hjF('identity','患者身份与联系人核验依据'),hjF('relation','联系对象','select',['患者本人','经授权的家属']),hjF('consent','本用途服务授权','select',['待核实','已核实并取得授权']),hjF('purpose','服务用途与授权范围'),hjF('need','患者本次需求与优先目标')]);
const hjPaths={
 OUTPATIENT:[hjCommonIntake(),
  hjNode('appointment','预约与就诊安排','PRE','OPERATOR','确认预约安排','按患者需求协助预约，记录科室、时间和凭据。',[
   hjF('department','预约科室 / 医生','text'),hjF('scheduled','计划就诊时间','datetime-local'),hjF('booking','预约状态','select',['待确认','预约已确认']),hjF('reference','预约凭据 / 来源编号','text'),hjF('notice','地址、报到位置与患者确认')]),
  hjNode('prepare','就诊资料与需求核对','PRE','NURSE','完成就诊准备','逐项收集病史、既往资料和待医生确认的问题；未采集不能写成无。',[
   hjF('history','主诉 / 既往史及信息来源'),hjF('medication','原用药与过敏信息（不明请注明待核实）'),hjF('materials','病历、报告与就诊材料清单'),hjF('missing','待补资料及跟进安排'),hjF('questions','交责任医生确认的问题')]),
  hjNode('arrival','到院与报到核验','IN','OPERATOR','核验实际到院','区分预约、患者自述和已核验到院，保留独立证据。',[]),
  hjNode('coordinate','检查协助与结果跟进','IN','NURSE','完成院内服务交接','核对已安排检查、待办项目、结果获取与服务问题。',[
   hjF('checklist','本次检查与办理进度'),hjF('missing','未完成项目及实际协调结果'),hjF('reportProgress','报告获取情况与来源'),hjF('handover','交医生核对的资料与问题')]),
  hjNode('report','门诊报告与医嘱核对','IN','DOCTOR','确认本次医学依据','本人查看本次门诊原报告，确认后续服务可以采用的依据。',[]),
 ],
 INPATIENT:[hjCommonIntake(),
  hjNode('appointment','入院协调与资料准备','PRE','OPERATOR','确认入院安排','登记入院通知、接收病区和办理要求；床位结果以院方确认记录为准。',[
   hjF('department','接收科室 / 病区','text'),hjF('scheduled','计划入院时间','datetime-local'),hjF('booking','院方接收状态','select',['待确认','预约已确认']),hjF('reference','院方确认 / 入院通知凭据','text'),hjF('notice','入院材料、办理地点及患者确认')]),
  hjNode('prepare','入院前护理信息核对','PRE','NURSE','完成入院前核对','核对照护需求和资料缺口，向接收病区明确交接。',[
   hjF('history','既往史、近期情况及来源'),hjF('medication','原用药 / 过敏信息及待核实项'),hjF('materials','入院资料及原报告清单'),hjF('missing','照护与陪护需求 / 待补信息'),hjF('questions','需接收医生或病区确认的问题')]),
  hjNode('arrival','入院报到核验','IN','OPERATOR','核验实际入院','记录实际办理入院的时间、病区和凭据。',[]),
  hjNode('coordinate','住院服务与出院准备','IN','NURSE','完成病区服务交接','记录院内需求、资料准备和出院后照护条件，未结问题单独跟进。',[
   hjF('checklist','住院服务与护理需求办理清单'),hjF('missing','未结事项与协调结果'),hjF('reportProgress','出院小结、原医嘱及资料准备'),hjF('handover','居家照护条件与出院交接问题')]),
  hjNode('report','出院小结与医嘱确认','IN','DOCTOR','确认出院服务依据','核对出院小结、医嘱和应追踪问题，明确居家随访依据。',[]),
 ],
 EXAM:[hjCommonIntake(),
  hjNode('appointment','体检预约与项目确认','PRE','OPERATOR','确认体检预约','核对体检项目、地点、时间和预约凭据；医学适用问题交医生。',[
   hjF('department','体检机构 / 已确认项目','text'),hjF('scheduled','计划体检时间','datetime-local'),hjF('booking','预约状态','select',['待确认','预约已确认']),hjF('reference','体检预约凭据','text'),hjF('notice','体检地点与患者确认')]),
  hjNode('prepare','检前准备与注意事项核对','PRE','NURSE','完成检前核对','依据医院已有检前须知确认准备情况，记录个体特殊需求。',[
   hjF('history','既往情况 / 特殊需求及信息来源'),hjF('medication','用药、过敏与待医生确认事项'),hjF('materials','已确认项目的医院检前须知来源'),hjF('missing','未满足的准备要求与协调安排'),hjF('questions','患者复述与疑问核对')]),
  hjNode('arrival','体检到院核验','IN','OPERATOR','核验实际体检到院','核实体检报到事实，与预约状态分别保存。',[]),
  hjNode('coordinate','检查进度与漏项跟进','IN','NURSE','完成检查进度核对','逐项记录已完成、待补检及取消原因，跟踪本次报告。',[
   hjF('checklist','体检项目与完成情况清单'),hjF('missing','漏项 / 取消原因及补检安排'),hjF('reportProgress','报告齐备情况与领取安排'),hjF('handover','待总检医生确认的问题')]),
  hjNode('report','体检报告与异常项核对','IN','DOCTOR','确认检后医学依据','本人核对总检报告、异常项及复查意见，不由运营解读或诊断。',[]),
 ]
};
for(const [center,nodes] of Object.entries(hjPaths)){
 nodes.find(n=>n.key==='arrival').fields=[hjF('arrival','实际到院状态','select',['待核实','患者自述到院','已人工核验到院','未到院']),hjF('occurred','实际到院 / 核验时间','datetime-local'),hjF('evidence','院内事件编号或人工核验凭据'),hjF('next','未到院跟进 / 已到院交接安排')];
 nodes.find(n=>n.key==='report').fields=[hjF('record','关联本次原报告','record'),hjF('read','本人已查看原报告','select',['尚未核对','已查看并核对原报告']),hjF('findings','报告与原医嘱核对结论'),hjF('missing','缺项、不确定内容与待确认问题'),hjF('instructions','后续服务依据与医学注意事项')];
 nodes.push(
  hjNode('plan',center==='EXAM'?'AI 规划检后健康计划':center==='INPATIENT'?'AI 规划出院健康计划':'AI 规划门诊健康计划','IN','OPERATOR','提交责任医生审核','依据本次报告整理个体目标、联系时间与执行任务；草稿经责任医生审核后使用。',[]),
  hjNode('review','医生编辑与审核计划','IN','DOCTOR','保存审核决定','确认每项任务的时间、内容、观察目标和升级条件；可修改或退回。',[]),
  hjNode('handoff',center==='INPATIENT'?'出院宣教与照护交接':center==='EXAM'?'检后注意事项与服务交接':'医嘱宣教与院后交接',center==='INPATIENT'?'IN':'POST','NURSE','完成患者交接','向患者核对已审核的安排，记录复述、照护支持和首次联系时间。',[
   hjF('materials','已审核医嘱 / 宣教资料及版本'),hjF('teachback','患者或家属复述与理解情况'),hjF('support','居家执行困难、照护支持与应对安排'),hjF('nextContact','首次院后联系时间','datetime-local'),hjF('contact','患者确认的联系方式与交接回执')]),
  hjNode('contact','主动联系与服务接续','POST','OPERATOR','确认有效联系','登记真实联系结果，未接通保留重试安排。',[
   hjF('contactResult','联系结果','select',['未联系','已接通并确认继续服务','未接通，安排重试','患者暂不方便，另约时间']),hjF('contactAt','实际联系时间','datetime-local'),hjF('feedback','患者当前需求与沟通记录'),hjF('retry','再次联系时间（未接通时必填）','datetime-local'),hjF('next','交护士跟进的事项与下一步')]),
  hjNode('followup',center==='EXAM'?'检后跟进与复查反馈':center==='INPATIENT'?'居家随访与康复反馈':'随访执行与患者反馈','POST','NURSE','登记本次随访结果','逐项执行当前已审核计划，采集症状、监测来源、原医嘱执行困难与患者问题。',[]),
  hjNode('feedback','医生查收与后续安排','POST','DOCTOR','确认查收与医学安排','本人查收当前版本全部随访，确认复诊或继续管理安排。',[
   hjF('assessment','随访结果评估与医学反馈'),hjF('revisit','本轮复诊决定','select',['需复诊 / 复查','无需本轮复诊','继续长期管理']),hjF('medicalReason','复诊决定的医学依据与后续要求'),hjF('reviewDate','下次复盘 / 复诊日期','date')]),
  hjNode('outcome','复诊核验与持续服务交接','POST','OPERATOR','核验并结束本次旅程','核对真实结果、患者回执与下一服务负责人；本次旅程结束后长期管理继续独立记录。',[
   hjF('outcome','实际服务结果','select',['待核验','已预约，尚未到院','患者自述到院','已人工核验复诊 / 复查','医生确认无需本轮复诊','交接持续管理']),hjF('resultDate','结果发生 / 核验日期','date'),hjF('evidence','结果凭据、来源编号与核验说明'),hjF('handover','下一服务时间、内容与接收人员'),hjF('receipt','患者知悉结果与后续安排的回执'),hjF('rating','满意度记录','select',['尚未邀请','已邀请未回应','患者拒绝评价','1 分','2 分','3 分','4 分','5 分'])])
 );
}
// Final responsibility model: operations own the whole service journey; medical staff review and assure quality.
for(const [center,nodes] of Object.entries(hjPaths)){
 for(const n of nodes)if(n.role==='NURSE')n.role='OPERATOR';
 const prep=nodes.find(n=>n.key==='prepare');
 prep.title={OUTPATIENT:'就诊资料与需求采集',INPATIENT:'入院资料与照护需求采集',EXAM:'检前资料与准备信息收集'}[center];
 prep.action='完成资料收集与交接';
 prep.goal='运营收集患者提供的资料、信息来源和待确认事项；医学与护理判断交医护核对。';
 const handoff=nodes.find(n=>n.key==='handoff');
 handoff.title={OUTPATIENT:'已审核安排与院后服务交接',INPATIENT:'出院安排与持续服务交接',EXAM:'已审核检后安排与服务交接'}[center];
 handoff.goal='运营按医生已审核内容说明服务安排、核实患者接收并记录反馈；不代替医疗护理判断。';
 const contact=nodes.find(n=>n.key==='contact');contact.fields.find(f=>f.key==='next').label='需医护核对的问题与运营下一步';
 nodes.splice(nodes.findIndex(n=>n.key==='review')+1,0,hjNode('quality-pre','医疗护理与执行准备质控','IN','NURSE','保存护理质控结论','护士核对资料完整性、计划与已审核医嘱的一致性及护理相关执行风险；不合格退回运营完善。',[
  hjF('sourceCheck','原报告、资料来源及缺项核对'),hjF('consistency','计划与医生审核意见的一致性核对'),hjF('nursingRisk','护理相关风险、执行条件与需医生确认事项'),hjF('qualityDecision','质控结论','select',['待核对','质控通过','退回运营完善']),hjF('returnTo','需整改的环节（退回时使用）','select',['健康计划完善','资料采集与准备']),hjF('qualityNote','质控意见与整改要求')
 ]));
 nodes.splice(nodes.findIndex(n=>n.key==='feedback'),0,hjNode('quality-post','随访记录与服务质量复核','POST','NURSE','保存随访质控结论','护士复核运营采集的随访事实、监测来源、医嘱执行记录及异常升级情况，合格后交医生医学评价。',[
  hjF('sourceCheck','随访记录、时间、数据单位与来源核对'),hjF('consistency','已审核计划的执行完整性核对'),hjF('nursingRisk','护理问题、异常升级与漏项核对'),hjF('qualityDecision','质控结论','select',['待核对','质控通过','退回运营完善']),hjF('qualityNote','质控意见与运营整改要求')
 ]));
}
function hjIsOps(){return !!account&&['OPERATOR','MANAGER'].includes(account.role)}
function hjEnsure(c){
 acExtras(c);if(c.serviceJourney)return c.serviceJourney;
 const p=patient(c.patient),owner=person(p.owner),center=hjCenters[c.kind];
 c.serviceJourney={center,legacy:!!(c.closed||c.plan||c.logs.length),version:0,team:{operator:owner?.role==='OPERATOR'?owner.id:4,nurse:owner?.role==='NURSE'?owner.id:3},nodes:Object.fromEntries(hjPaths[center].map(n=>[n.key,{status:'TODO',values:{},history:[]}])),history:[],entry:'FULL'};
 // Existing clinical cases keep their original plan and execution records; do not invent completed steps.
 return c.serviceJourney;
}
function hjAll(){return acCases().filter(c=>hjCenters[c.kind]).map(c=>{hjEnsure(c);return c})}
function hjVisible(c){const p=patient(c.patient),j=hjEnsure(c);if(j.legacy)return !!mine(p);return !!account&&(manager()||account.role==='DOCTOR'&&p.doctor===account.id||['OPERATOR','NURSE'].includes(account.role)&&j.team[hjRoleKey[account.role]]===account.id)}
function hjCases(center=icCenter()){return hjAll().filter(c=>hjEnsure(c).center===center&&hjVisible(c))}
function hjNodes(c){return hjPaths[hjEnsure(c).center]}
function hjPending(c){if(hjEnsure(c).legacy)return null;return hjNodes(c).find(n=>!['DONE','SKIPPED'].includes(hjEnsure(c).nodes[n.key].status))}
function hjOwner(c,n){return n.role==='DOCTOR'?patient(c.patient).doctor:hjEnsure(c).team[hjRoleKey[n.role]]}
function hjCan(c,n){return hjVisible(c)&&(account.role===n.role&&account.id===hjOwner(c,n)||manager()&&n.role==='OPERATOR')}
function hjActive(c){return !hjEnsure(c).legacy&&c.status==='ACTIVE'&&patient(c.patient).service_consent!==false&&!['PAUSED','CLOSED'].includes(patient(c.patient).lifecycle)}
function hjApproved(c){return c.plan?.status==='APPROVED'&&c.plan.reviewer===patient(c.patient).doctor&&c.plan.approvedRevision===c.revision&&c.plan.grant===(patient(c.patient).serviceGrant||0)}
function hjVisits(c){return c.visits.filter(v=>v.revision===c.revision&&v.serviceJourney)}
function hjAllVisited(c){return !!c.plan&&c.plan.rows.every((r,i)=>hjVisits(c).some(v=>v.node===i&&v.success))}
function hjReceipt(c){return c.feedback.some(f=>f.serviceJourney&&f.revision===c.revision&&f.count===c.visits.length&&f.by===patient(c.patient).doctor)}
function hjOpenIssues(c){return c.issues.filter(x=>!x.closed)}
function hjLog(c,title,note,before){const j=hjEnsure(c);j.version++;j.history.unshift({title,note,by:account.id,at:icNow(),before:before?structuredClone(before):null,version:j.version});acLog(c,title,note)}
function hjUrl(c,node,extra={}){const q=new URLSearchParams({center:hjEnsure(c).center,service:String(c.id),phase:node?.phase||hjPending(c)?.phase||'POST',...(node?{node:node.key}:{}),...extra});return '/after-care?'+q}
function hjBtn(label,action,id,primary=false,disabled=false){return '<button type="button" data-action="hj-'+action+'" data-id="'+esc(id)+'" class="'+(primary?'primary':'')+'"'+(disabled?' disabled':'')+'>'+esc(label)+'</button>'}
function hjDate(v){return v?esc(String(v).slice(0,16).replace('T',' ')):'未记录'}
function hjStateLabel(c,n){const s=hjEnsure(c).nodes[n.key].status;return {DONE:'已完成',SKIPPED:'诊后接入 · 已说明',DRAFT:'草稿待办',STALE:'修改后待复核',TODO:'待办理'}[s]}
function hjOptions(values){return values.map(x=>({value:x,label:x}))}
function hjField(f,value,c){
 let options=f.options?hjOptions(f.options):[];
 if(f.type==='record')options=[{value:'',label:'请选择本患者原报告'},...demo.records.filter(r=>r.patient===c.patient&&r.type===acPaths[c.kind].record).map(r=>({value:r.id,label:r.title}))];
 return field(f.key,f.label,f.type==='record'?'select':f.type,value??'',options,false);
}
function hjPlanFields(c){
 const plan=c.plan;return '<div class="hj-wide">'+field('goal','患者个体目标与优先级','textarea',plan?.goal||'',[],false)+'</div>'+field('startDate','健康管理周期开始','date',plan?.startDate||'',[],false)+field('endDate','健康管理周期结束','date',plan?.endDate||'',[],false)+field('baseline','已采集健康基线与来源','textarea',plan?.baseline||'',[],false)+field('barriers','执行困难、家属支持与个人偏好','textarea',plan?.barriers||'',[],false)+field('education','宣教与自我管理安排（依据医生意见）','textarea',plan?.education||'',[],false)+field('uncertainties','待补信息与医生需确认的事项','textarea',plan?.uncertainties||'',[],false)+[0,1,2].map(i=>{
  const row=plan?.rows[i]||[['首次随访'],['持续跟进'],['阶段复盘']][i],d=plan?.details?.[i]||{};
  return '<section class="hj-plan-edit"><h3>'+String(i+1).padStart(2,'0')+' / '+esc(row[0])+'</h3><div class="hj-form-grid">'+field('task'+i,'任务名称','text',row[0],[],false)+field('time'+i,'计划联系时间','datetime-local',row[1]||'',[],false)+field('content'+i,'具体执行内容','textarea',row[2]||'',[],false)+field('measure'+i,'反馈 / 观察目标','textarea',row[3]||'',[],false)+field('escalation'+i,'异常升级与处理要求','textarea',d.escalation||'',[],false)+'</div></section>'
 }).join('');
}
function hjAgentPanel(c){
 const a=c.plan?.agent;
 return '<section class="hj-agent"><div><span class="hj-agent-icon">AI</span><h3>智能体健康计划规划</h3><b>本地模拟 · '+(hjApproved(c)?'当前版本已审核':'待医生确认')+'</b></div><p>将报告依据、患者目标和执行条件整理成可办理的健康计划。</p><ol><li>核对来源与待补信息</li><li>整理个体目标与管理周期</li><li>安排随访、监测与宣教任务</li><li>医生修改审核，团队执行反馈</li></ol>'+(a?'<details><summary>本次规划依据与生成记录</summary><p>原报告 #'+a.record+' · '+esc(a.reportTitle)+'<br>生成者 '+esc(person(a.by)?.name)+' · '+hjDate(a.at)+'<br>规划方式：本地演示模板 '+esc(a.version)+'</p><p>输入目标：'+esc(a.inputs.goal)+'<br>执行条件：'+esc(a.inputs.barriers)+'<br>待确认事项：'+esc(a.inputs.uncertainties)+'</p><p>修改后仍保留此原始规划依据，医生审核当前编辑版本。</p></details>':'<small>可手工制定，或点击下方按钮填入规划条件后生成草稿。</small>')+'</section>';
}
function hjEvidence(c){
 return '<div class="hj-facts"><div><span>本次报告依据</span><strong>'+esc(c.baseline?.title||'待医生核对原报告')+'</strong><small>'+esc(c.baseline?.note||'资料缺项与不确定内容须注明')+'</small></div><div><span>当前个案计划</span><strong>'+esc(c.plan?'v'+c.revision+' · '+({APPROVED:hjApproved(c)?'当前医生已审核':'需当前医生重新审核',DRAFT:'待审核',REJECTED:'退回修改'}[c.plan.status]||'待审核'):'尚未制定')+'</strong><small>'+esc(c.plan?.goal||'医学目标由责任医生确认')+'</small></div><div><span>本轮执行与反馈</span><strong>'+hjVisits(c).filter(v=>v.success).length+' 条有效反馈 · '+hjOpenIssues(c).length+' 项未结问题</strong><small>'+(hjReceipt(c)?'责任医生已查收本轮最新结果':'新反馈待责任医生查收')+'</small></div></div>';
}
function hjForm(c,n){
 const j=hjEnsure(c),s=j.nodes[n.key],v=s.values,can=hjCan(c,n),pending=hjPending(c),blocked=pending&&hjNodes(c).indexOf(n)>hjNodes(c).indexOf(pending),inactive=!hjActive(c),editable=can&&!inactive;
 let fields=n.fields.map(f=>hjField(f,v[f.key],c)).join(''),extra='';
 if(n.key==='report'){
  const reports=demo.records.filter(r=>r.patient===c.patient&&r.type===acPaths[c.kind].record);
  extra='<div class="hj-source">'+(reports.length?reports.map(r=>'<details open><summary>'+esc(r.title)+' · 原始来源 #'+r.id+'</summary><p>'+esc(r.text)+'</p><small>本次审核须确认采用的原报告；未核实信息不能作为已确认结论。</small></details>').join(''):'尚无本次报告，请先在患者档案补充报告。')+'</div>';
 }
 if(n.key==='plan'||n.key==='review'){
  fields=hjPlanFields(c)+(n.key==='review'?field('decision','审核决定','select','', [{value:'',label:'请选择审核决定'},{value:'APPROVED',label:'审核通过，启用当前版本'},{value:'REJECTED',label:'退回修改，说明需补充内容'}],false)+field('reviewNote','审核意见与修改依据','textarea',v.reviewNote||'',[],false):'');
  extra=hjAgentPanel(c)+'<div class="hj-source"><b>计划依据：'+esc(c.baseline?.title||'请先由医生核对报告')+'</b><p>'+esc(c.baseline?.note||'尚未确认医学依据。')+'</p></div>'+(n.key==='plan'&&editable?'<div class="hj-assist">'+hjBtn('AI 智能体规划健康计划','draft',c.id,true)+'<span>原报告 + 患者目标 + 执行条件 → 可编辑计划 → 责任医生审核</span></div>':'');
 }
 if(n.key==='quality-pre'||n.key==='quality-post'){
  extra='<div class="hj-source"><b>质控依据：'+esc(c.baseline?.title||'待核对原报告')+' · 计划 v'+c.revision+'</b><p>'+esc(c.plan?.review||'医生尚未审核')+'</p><p>当前计划执行记录：'+hjVisits(c).length+' 条；未结问题：'+hjOpenIssues(c).length+' 项。</p></div>'+table(['任务','运营实际执行与反馈'],(c.plan?.rows||[]).map((r,i)=>[esc(r[0])+'<br>'+esc(r[1]),hjVisits(c).filter(v=>v.node===i).map(v=>esc(v.at)+' · '+esc(v.note)).join('<br>')||esc(r[2])]));
 }
 if(n.key==='followup'){
  fields=field('node','本次执行计划任务','select',v.node||'0',(c.plan?.rows||[]).map((r,i)=>({value:i,label:r[0]+' · '+r[1]})),false)+field('result','执行结果','select',v.result||'',[{value:'',label:'请选择实际结果'},{value:'SUCCESS',label:'已接通并完成本项任务'},{value:'FAILED',label:'未接通 / 未完成，安排重试'}],false)+field('occurred_at','本次实际联系时间','datetime-local',v.occurred_at||acDateTime(),[],false)+field('retry_at','重试时间（未完成时必填）','datetime-local',v.retry_at||'',[],false)+field('symptoms','症状与患者主观反馈','textarea',v.symptoms||'',[],false)+field('monitoring','监测值、单位、采集时间和来源','textarea',v.monitoring||'',[],false)+field('adherence','原医嘱执行与遇到的困难','textarea',v.adherence||'',[],false)+field('note','本次执行结论与下一步','textarea',v.note||'',[],false);
  extra='<div class="hj-task-list">'+(c.plan?.rows||[]).map((r,i)=>'<div><b>'+esc(r[0])+'</b><span>'+esc(r[1])+'</span><em>'+ (hjVisits(c).some(v=>v.node===i&&v.success)?'已完成':'待执行')+'</em><p>'+esc(r[2])+'</p></div>').join('')+'</div>';
 }
 const needReview=['quality-pre','handoff','contact','followup','quality-post','feedback','outcome'].includes(n.key)&&!hjApproved(c);
 const reason=s.status!=='TODO'&&s.status!=='DRAFT'?field('reason','修改原因（修改已办理内容时填写）','textarea','',[],false):'';
 const hint=inactive?'当前服务暂停或授权不可用。':!can?'当前环节由 '+hjRoles[n.role]+' · '+(person(hjOwner(c,n))?.name||'待分派')+' 办理。':blocked?'前序待办：'+pending.title+'。可先填写草稿，完成前序后提交。':needReview?'计划或责任医生已变更，需重新审核当前版本后执行。':'';
 const previous=blocked?link('前往前序待办 →',hjUrl(c,pending),'btn'):'';
 const buttons=editable?'<div class="hj-form-actions"><button type="submit" name="intent" value="draft">保存草稿 / 修改</button><button type="submit" name="intent" value="complete" class="primary"'+(blocked||needReview?' disabled':'')+'>'+esc(n.action)+'</button></div>':'';
 return '<section class="hj-step-content"><div class="hj-step-heading"><div><span>'+phases[n.phase].title+' / '+hjRoles[n.role]+'</span><h2>'+esc(n.title)+'</h2><p>'+esc(n.goal)+'</p></div><b class="hj-status '+s.status.toLowerCase()+'">'+hjStateLabel(c,n)+'</b></div>'+(hint?'<div class="hj-notice">'+esc(hint)+' '+previous+'</div>':'')+extra+'<form data-form="hj-step" data-id="'+c.id+':'+n.key+'"><input type="hidden" name="version" value="'+j.version+'"><fieldset '+(!editable?'disabled':'')+'><div class="hj-form-grid">'+fields+reason+'</div></fieldset>'+buttons+'</form>'+(s.completedBy?'<div class="hj-stamp">上次办理：'+esc(person(s.completedBy)?.name)+' · '+hjDate(s.completedAt)+' · v'+s.completedVersion+'</div>':'')+'</section>';
}
function hjIssues(c){
 const list=c.issues,can=hjVisible(c),j=hjEnsure(c);
 return '<section class="hj-issues"><div class="hj-section-head"><h2>咨询、异常与未结事项 <small>'+hjOpenIssues(c).length+' 项待闭环</small></h2>'+(can&&hjActive(c)&&!c.closed?hjBtn('＋ 登记问题','issue',c.id):'')+'</div>'+(list.length?list.map((x,i)=>{
  const doctor=x.kind==='CLINICAL',owner=doctor?patient(c.patient).doctor:x.owner||j.team.operator,handle=account?.id===owner||!doctor&&manager();
  return '<article><div><span class="hj-role '+(doctor?'doctor':'operator')+'">'+(doctor?'临床问题':'服务协调')+'</span><b>'+esc(x.note)+'</b><span>'+ (x.closed?'已核验关闭':x.resolution?'待患者反馈核验':x.accepted?'已接单，处理中':'待责任人接单')+'</span></div><p>负责：'+esc(person(owner)?.name)+' · 截止 '+hjDate(x.due)+'</p>'+(x.resolution?'<p>处理结果：'+esc(x.resolution)+'</p>':'')+'<div class="toolbar">'+(!x.closed?(x.resolution&&hjIsOps()?hjBtn('登记患者反馈并关闭','issue-close',c.id+':'+i):!x.resolution&&handle?hjBtn(x.accepted?'记录处理结果':'接单办理',x.accepted?'issue-resolve':'issue-accept',c.id+':'+i):''):'')+'</div></article>'
 }).join(''):'<p class="hj-muted">全旅程均可登记。服务协调交运营，医学问题交责任医生；处理结果与患者回执分别记录。</p>')+'</section>';
}
function hjWorkspace(c){
 if(hjEnsure(c).legacy)return '<div class="hj-empty">本次个案已有办理记录，请在原个案中继续，历史计划与审核保持原记录。'+link('继续原个案办理','/after-care?case='+c.id+'&patient='+c.patient,'btn')+'</div>';
 const j=hjEnsure(c),p=patient(c.patient),pending=hjPending(c),phase=phases[current.query.get('phase')]?current.query.get('phase'):pending?.phase||'POST',nodes=hjNodes(c).filter(n=>n.phase===phase),selected=nodes.find(n=>n.key===current.query.get('node'))||nodes.find(n=>n.key===pending?.key)||nodes[0];
 const roles=Object.entries(hjRoles).map(([r,l])=>'<div class="hj-team-person '+(account?.role===r?'is-current':'')+'"><span class="hj-role '+r.toLowerCase()+'">'+l+'</span><b>'+esc(person(r==='DOCTOR'?p.doctor:j.team[hjRoleKey[r]] )?.name||'待分派')+'</b><small>'+({OPERATOR:'全旅程组织、执行、联系、记录与闭环',NURSE:'护理核对 · 执行准备质控 · 随访质量复核',DOCTOR:'医学判断 · 计划审核 · 结果查收与处置'}[r])+'</small></div>').join('');
 const phasesNav='<nav class="hj-phases" aria-label="患者旅程阶段">'+Object.entries(phases).map(([k,v],i)=>{const ns=hjNodes(c).filter(n=>n.phase===k),done=ns.filter(n=>['DONE','SKIPPED'].includes(j.nodes[n.key].status)).length;return link(String(i+1).padStart(2,'0')+' '+v.title+' · '+done+'/'+ns.length,hjUrl(c,ns.find(n=>n.key===pending?.key)||ns[0]),k===phase?'active':'')}).join('')+'</nav>';
 const rail='<nav class="hj-steps" aria-label="本阶段办理步骤">'+nodes.map(n=>'<a href="#'+esc(hjUrl(c,n))+'" class="'+(n.key===selected.key?'active':'')+'"><i>'+(['DONE','SKIPPED'].includes(j.nodes[n.key].status)?'✓':String(hjNodes(c).indexOf(n)+1).padStart(2,'0'))+'</i><div><b>'+esc(n.title)+'</b><span>'+hjRoles[n.role]+' · '+hjStateLabel(c,n)+'</span></div></a>').join('')+'</nav>';
 const progress=hjNodes(c).filter(n=>['DONE','SKIPPED'].includes(j.nodes[n.key].status)).length;
 const history=j.history.slice(0,20).map(h=>'<li><div><b>'+esc(h.title)+'</b><small>'+esc(person(h.by)?.name)+' · '+hjDate(h.at)+'</small></div><p>'+esc(h.note)+'</p>'+(h.before?'<details><summary>查看修改前记录</summary><pre>'+esc(JSON.stringify(h.before,null,2))+'</pre></details>':'')+'</li>').join('');
 return '<section class="hj-patient"><div class="hj-patient-heading"><div><span>当前患者 / 就医事件 #'+esc(c.eventKey)+'</span><h2>'+esc(p.name)+' <small>'+esc(p.age)+' 岁 · '+esc(p.department)+'</small></h2><p>下一步：'+esc(c.closed?'本次旅程已结束，持续管理独立衔接':pending?.title||'等待结案核验')+'</p></div><div class="hj-progress"><b>'+progress+'<small> / '+hjNodes(c).length+'</small></b><span>本次旅程已办理</span></div></div><div class="hj-team">'+roles+'</div>'+hjEvidence(c)+'<div class="hj-context-links">'+(mine(p)?link('患者档案与报告 ↗','/patients/'+p.id):'')+(mine(p)?link('连续管理与历次就医 ↗','/after-care?tab=summary&patient='+p.id):'')+(manager()?hjBtn('修改协作分工','team',c.id):'')+'</div></section>'+phasesNav+'<div class="hj-workspace">'+rail+hjForm(c,selected)+'</div>'+hjIssues(c)+'<details class="hj-history"><summary>办理与修改记录 · '+j.history.length+' 条</summary><ol>'+history+'</ol></details><details class="hj-demo-tools"><summary>原型体验工具 · 切换身份保留本页记录</summary><div class="toolbar">'+Object.entries(hjRoles).map(([r,l])=>hjBtn('以'+l+'体验','role',c.id+':'+r)).join('')+hjBtn('以运营主管体验','role',c.id+':MANAGER')+'</div><p>仅切换虚构演示账号，办理仍校验对应责任人。数据在当前页面内存中保存，刷新恢复样例。</p></details>';
}
function hjPage(){
 if(!canOperate()&&account?.role!=='DOCTOR')return forbidden();
 const center=icCenter(),rows=hjCases(center),q=(current.query.get('q')||'').trim(),scope=current.query.get('queue')||'all';
 const filtered=rows.filter(c=>(!q||(patient(c.patient).name+' '+c.eventKey).includes(q))&&(scope==='all'||scope==='mine'&&hjPending(c)&&hjCan(c,hjPending(c))||scope==='review'&&hjPending(c)?.role==='DOCTOR'||scope==='issues'&&hjOpenIssues(c).length||scope==='closed'&&c.closed));
 const specified=current.query.get('service'),selected=specified?filtered.find(c=>String(c.id)===specified):filtered[0];
 const centersNav='<nav class="hj-centers" aria-label="服务中心">'+Object.entries(centers).map(([k,v])=>link(v.title,'/after-care?center='+k,k===center?'active':'')).join('')+'</nav>';
 const metrics=[['在管旅程',rows.filter(c=>!c.closed).length,'all'],['我的待办',rows.filter(c=>hjPending(c)&&hjCan(c,hjPending(c))).length,'mine'],['等待医生',rows.filter(c=>hjPending(c)?.role==='DOCTOR').length,'review'],['未结问题',rows.reduce((a,c)=>a+hjOpenIssues(c).length,0),'issues']];
 const queue='<section class="hj-queue"><div class="hj-section-head"><h2>患者服务清单 <small>'+filtered.length+' 人次</small></h2><form data-form="hj-search"><input aria-label="搜索患者旅程" name="q" value="'+esc(q)+'" placeholder="患者姓名 / 就医事件"><button>搜索</button></form></div><div class="hj-queue-table">'+table(['患者 / 本次服务','当前待办','责任人','办理'],filtered.map(c=>{const n=hjPending(c);return[esc(patient(c.patient).name)+'<small>'+esc(c.eventKey)+'</small>',c.closed?'已完成本次旅程':esc(n?.title||'继续原个案')+'<small>'+ (n?phases[n.phase].title:'院后')+'</small>',n?esc(person(hjOwner(c,n))?.name):'—',link(selected?.id===c.id?'正在办理':'进入办理 →',hjUrl(c,n),'btn '+(selected?.id===c.id?'selected':''))]}))+'</div></section>';
 return '<div class="ic-shell hj-shell"><div class="ic-breadcrumb">患者服务 / 诊后健康服务中心</div>'+centersNav+'<div class="hj-heading"><div><span class="hj-eyebrow">PATIENT JOURNEY / '+centers[center].code+'</span><h1>'+centers[center].title+'</h1><p>'+({OUTPATIENT:'运营负责门诊全旅程服务，医生与护士负责医疗和质控。',INPATIENT:'运营接续入院、住院与院后服务，医护负责医疗和质控。',EXAM:'运营贯通检前、检中与检后服务，医护负责医疗和质控。'}[center])+'</p></div>'+(hjIsOps()?hjBtn('＋ 建立本次患者旅程','create',center,true):'')+'</div><div class="hj-metrics">'+metrics.map(([l,n,k])=>'<a class="'+(scope===k?'active':'')+'" href="#/after-care?center='+center+'&queue='+k+'"><span>'+l+'</span><b>'+n+'</b><small>'+ (k==='issues'?'按未关闭问题计数':'按当前可见旅程计数')+'</small></a>').join('')+'</div>'+queue+(selected?hjWorkspace(selected):'<div class="hj-empty">当前没有符合条件的患者旅程。'+link('查看本中心全部患者','/after-care?center='+center,'btn')+'</div>')+'<footer class="hj-footer">虚构交互原型 · 修改保留至本页刷新 · 医院与企微真实接口未接通，不发送消息</footer></div>';
}
function hjRequired(values,keys){return keys.every(k=>String(values[k]??'').trim())}
function hjPast(value){const t=Date.parse(value);return !!value&&Number.isFinite(t)&&t<=Date.now()}
function hjFuture(value){return !!value&&Number.isFinite(Date.parse(value))&&Date.parse(value)>Date.now()}
function hjPlanFrom(c,v){
 return {status:'DRAFT',goal:(v.goal||'').trim(),...Object.fromEntries(['startDate','endDate','baseline','barriers','education','uncertainties'].map(k=>[k,String(v[k]||'').trim()])),agent:c.plan?.agent?structuredClone(c.plan.agent):null,rows:[0,1,2].map(i=>[v['task'+i]||'',v['time'+i]||'',v['content'+i]||'',v['measure'+i]||'','运营执行 / 医护质控']),details:[0,1,2].map(i=>({problem:v.goal||'',goal:v['measure'+i]||'',measure:v['measure'+i]||'',feedback:'运营采集 / 医护质控',escalation:v['escalation'+i]||'',reviewDate:(v['time'+i]||'').slice(0,10)})),report:structuredClone(c.baseline),revision:c.revision+1,createdBy:account.id,createdAt:icNow()};
}
function hjPlanValid(v){return hjRequired(v,['goal','startDate','endDate','baseline','barriers','education','uncertainties',...[0,1,2].flatMap(i=>['task','time','content','measure','escalation'].map(k=>k+i))])&&[0,1,2].every(i=>Number.isFinite(Date.parse(v['time'+i]))&&v['time'+i].slice(0,10)>=v.startDate&&v['time'+i].slice(0,10)<=v.endDate)&&Number.isFinite(Date.parse(v.startDate))&&Number.isFinite(Date.parse(v.endDate))&&v.startDate<=v.endDate}
function hjInvalidate(c,n){
 const j=hjEnsure(c),index=hjNodes(c).indexOf(n);
 hjNodes(c).slice(index+1).forEach(next=>{const s=j.nodes[next.key];if(s.status!=='SKIPPED'){if(s.status==='DONE')s.history.push(structuredClone({...s,history:undefined}));s.status=s.status==='TODO'?'TODO':'STALE'}});
 if(index<=hjNodes(c).findIndex(x=>x.key==='review')&&c.plan){c.plan.status='DRAFT';c.plan.reviewer=null;c.plan.approvedRevision=null;c.plan.grant=null}
 c.closed=false;if(index<=hjNodes(c).findIndex(x=>x.key==='feedback'))c.noRevisit=null;
}
function hjSubmit(c,n,v){
 const j=hjEnsure(c),state=j.nodes[n.key],intent=v.intent||'draft',complete=intent==='complete',pending=hjPending(c);
 if(!hjVisible(c)||!hjCan(c,n))return toast('请由本环节分派的'+hjRoles[n.role]+'本人办理。');
 if(!hjActive(c))return toast('当前授权或服务状态不可用。');
 if(Number(v.version)!==j.version)return toast('记录已更新，请重新打开当前步骤后保存。');
 if(!['draft','complete'].includes(intent))return toast('办理方式无效。');
 if(complete&&pending&&hjNodes(c).indexOf(n)>hjNodes(c).indexOf(pending))return toast('请先完成：'+pending.title+'。');
 if(['DONE','STALE','SKIPPED'].includes(state.status)&&!v.reason?.trim())return toast('修改已办理内容请填写修改原因。');
 if(['quality-pre','handoff','contact','followup','quality-post','feedback','outcome'].includes(n.key)&&complete&&!hjApproved(c))return toast('请由当前责任医生重新审核本版计划。');
 const data=Object.fromEntries(n.fields.map(f=>[f.key,String(v[f.key]||'').trim()]));
 if(complete&&n.fields.some(f=>!['retry'].includes(f.key)&&!data[f.key]))return toast('请补齐本环节实际信息、结果和依据。');
 if(complete&&n.fields.some(f=>f.options&&!f.options.includes(data[f.key])))return toast('选项已变化，请重新选择。');
 if(complete&&n.fields.some(f=>['date','datetime-local'].includes(f.type)&&f.key!=='retry'&&!Number.isFinite(Date.parse(data[f.key]))))return toast('请核对日期与时间。');
 if(complete&&n.key==='intake'&&data.consent!=='已核实并取得授权')return toast('身份与本用途授权核实后才能进入后续服务。');
 if(complete&&n.key==='appointment'&&data.booking!=='预约已确认')return toast('尚未获得确认，请保存草稿并跟进预约或入院接收。');
 if(complete&&n.key==='arrival'&&(data.arrival!=='已人工核验到院'||!hjPast(data.occurred)))return toast('患者自述或预约不能记作已到院，请保存草稿并补齐实际核验。');
 if(complete&&n.key==='report'){
  const r=demo.records.find(r=>r.id===Number(data.record)&&r.patient===c.patient&&r.type===acPaths[c.kind].record);
  if(!r||data.read!=='已查看并核对原报告')return toast('本人查看并核对本患者、本次场景的原报告后再确认。');
  if(acCases().some(other=>other.id!==c.id&&other.baseline?.id===r.id))return toast('该报告已关联另一就医事件，请补充本次原报告。');
 }
 if(complete&&['plan','review'].includes(n.key)){
  if(!c.baseline||j.nodes.report.status!=='DONE')return toast('先由责任医生确认本次原报告。');
  if(n.key==='plan'&&!hjPlanValid(v))return toast('请补齐健康基线、管理周期、个体目标、宣教安排，以及周期内三项任务的内容、观察目标和升级要求。');
  if(n.key==='review'&&(!c.plan||!['APPROVED','REJECTED'].includes(v.decision)||!v.reviewNote?.trim()))return toast('请填写审核决定与意见。');
  if(n.key==='review'&&v.decision==='APPROVED'&&(!hjPlanValid(v)||j.nodes.report.completedBy!==patient(c.patient).doctor))return toast('须由当前责任医生核对报告，并完整确认每一项任务。');
 }
 if(complete&&n.key==='contact'&&(!hjPast(data.contactAt)||data.contactResult==='未联系'))return toast('请登记已发生的真实联系结果。');
 if(complete&&n.key==='contact'&&data.contactResult!=='已接通并确认继续服务'&&!hjFuture(data.retry))return toast('未接通或另约时间须填写未来的再次联系时间。');
 if(complete&&n.key==='followup'){
  const node=Number(v.node);
  if(!Number.isInteger(node)||!c.plan.rows[node]||!hjRequired(v,['symptoms','monitoring','adherence','note'])||!['SUCCESS','FAILED'].includes(v.result)||!hjPast(v.occurred_at))return toast('请完整记录本次任务、实际联系时间与结构化反馈。');
  if(v.result==='FAILED'&&!hjFuture(v.retry_at))return toast('未完成的任务须安排未来重试时间。');
 }
 if(complete&&['quality-pre','quality-post'].includes(n.key)&&!['质控通过','退回运营完善'].includes(data.qualityDecision))return toast('请完成医疗护理核对并选择质控结论。');
 if(complete&&n.key==='quality-post'&&!hjAllVisited(c))return toast('运营完成本轮全部计划任务后，再进行随访质量复核。');
 if(complete&&n.key==='feedback'&&!hjAllVisited(c))return toast('本轮计划的每项任务均需完成后交医生查收。');
 if(complete&&n.key==='outcome'){
  if(!hjAllVisited(c)||!hjReceipt(c)||hjOpenIssues(c).length)return toast('全部任务、当前医生查收和患者问题闭环后方可结束本次旅程。');
  if(!hjPast(data.resultDate))return toast('请填写已发生的结果核验日期。');
  if(!['已人工核验复诊 / 复查','医生确认无需本轮复诊','交接持续管理'].includes(data.outcome))return toast('预约与自述不能作为实际到院；请继续跟进或记录医生确认的后续安排。');
  const decision=j.nodes.feedback.values.revisit;
  if(data.outcome==='医生确认无需本轮复诊'&&(decision!=='无需本轮复诊'||c.noRevisit?.by!==patient(c.patient).doctor))return toast('无需复诊须有当前责任医生独立医学确认。');
  if(data.outcome==='交接持续管理'&&decision!=='继续长期管理')return toast('请先由责任医生确认持续管理安排。');
 }
 // Apply only after all validation; rejected submissions never partially overwrite state.
 const before={node:n.key,status:state.status,values:structuredClone(state.values),plan:['plan','review'].includes(n.key)?structuredClone(c.plan):undefined};
 if(state.status==='DONE'||state.status==='STALE'||state.status==='SKIPPED'){state.history.push(structuredClone(before));hjInvalidate(c,n)}
 state.values=['plan','review','followup'].includes(n.key)?Object.fromEntries(Object.entries(v).filter(([k])=>!['intent','version','reason'].includes(k))):data;
 state.status=complete?'DONE':'DRAFT';
 if(n.key==='plan'||n.key==='review'){
  if(c.plan)c.planHistory.push(structuredClone(c.plan));
  const next=hjPlanFrom(c,v);c.revision++;c.plan=next;
  if(n.key==='review'&&complete){
   c.plan.status=v.decision;c.plan.review=v.reviewNote;c.plan.reviewer=account.id;c.plan.reviewedAt=icNow();
   if(v.decision==='APPROVED'){c.plan.approvedRevision=c.revision;c.plan.grant=patient(c.patient).serviceGrant||0;c.stage=acPaths[c.kind].steps.findIndex(x=>x.includes('医生反馈'))}
   else{state.status='DRAFT';j.nodes.plan.status='STALE';c.stage=acPaths[c.kind].roles.indexOf('ai')}
  }else c.stage=acPaths[c.kind].steps.findIndex(x=>x.includes('计划审核'));
 }
 if(complete&&n.key==='report'){
  const r=demo.records.find(r=>r.id===Number(data.record));c.baseline={id:r.id,title:r.title,text:r.text,date:acDateTime().slice(0,10),note:data.findings+'；'+data.instructions,missing:data.missing};r.status='READ';r.viewer=account.id;r.opinion=data.findings;
 }
 if(complete&&n.key==='intake'){c.consent=true;c.handoff=true;c.enrollment=structuredClone(data)}
 if(complete&&n.key==='contact'&&data.contactResult!=='已接通并确认继续服务')state.status='DRAFT';
 if(complete&&n.key==='followup'){
  c.visits.push({serviceJourney:true,revision:c.revision,node:Number(v.node),success:v.result==='SUCCESS',result:v.result==='SUCCESS'?'已接通':'未完成',note:v.note+'；症状：'+v.symptoms+'；监测与来源：'+v.monitoring+'；执行困难：'+v.adherence,at:v.occurred_at,retry_at:v.retry_at,by:account.id});
  state.status=hjAllVisited(c)?'DONE':'DRAFT';
 }
 if(complete&&['quality-pre','quality-post'].includes(n.key)&&data.qualityDecision==='退回运营完善'){
  const target=hjNodes(c).find(x=>x.key===(n.key==='quality-post'?'followup':data.returnTo==='资料采集与准备'?'prepare':'plan'));
  j.nodes[target.key].history.push(structuredClone({values:j.nodes[target.key].values,status:j.nodes[target.key].status}));hjInvalidate(c,target);j.nodes[target.key].status='STALE';state.status='DRAFT';
 }
 if(complete&&n.key==='feedback'){
  c.feedback.push({serviceJourney:true,revision:c.revision,count:c.visits.length,by:account.id,note:data.assessment+'；'+data.medicalReason,at:icNow()});
  if(data.revisit==='无需本轮复诊')c.noRevisit={by:account.id,note:data.medicalReason};
 }
 if(complete&&n.key==='outcome'){c.outcome=structuredClone(data);c.closed=true;c.stage=acPaths[c.kind].steps.length}
 if(complete){state.completedBy=account.id;state.completedAt=icNow();state.completedVersion=j.version+1}
 hjLog(c,(state.status==='DONE'?'完成：':'保存：')+n.title,v.reason||v.reviewNote||v.note||data.feedback||'已记录本环节资料与办理结果。',before);
 $('#dialog').close();
 const next=complete&&(state.status==='DONE'||data.qualityDecision==='退回运营完善')&&!c.closed?hjPending(c):n;go(hjUrl(c,next));render();toast(state.status==='DONE'?'本环节已完成，下一责任人可继续办理。':'内容已保存，待办保留。');
}
function hjAction(action,id,v){
 if(action==='search')return go('/after-care?'+new URLSearchParams({center:icCenter(),q:v.q||''}));
 if(action==='create'){
  if(!hjIsOps())return toast('由运营人员建立和组织患者旅程。');
  if(!v)return modal('建立本次患者旅程','hj-create',id,patientChoice()+field('eventKey','本次就医事件编号')+field('entry','接入方式','select','FULL',[{value:'FULL',label:'从院前开始全旅程服务'},{value:'POST',label:'诊后接入，前置环节记录跳过依据'}])+field('reason','来源、服务需求与诊后接入依据','textarea'),'同一就医事件仅建一条旅程；既往记录保留。');
  const p=patient(v.patient);if(!p||!mine(p)||!hjPaths[id]||!['FULL','POST'].includes(v.entry)||!hjRequired(v,['eventKey','reason'])||p.service_consent===false)return toast('请核对患者范围、授权、事件编号和来源。');
  if(acCases().some(c=>c.eventKey===v.eventKey.trim()))return toast('此就医事件已有个案，请直接继续办理。');
  const c={id:Math.max(...acCases().map(c=>c.id),1000)+1,patient:p.id,kind:hjKinds[id],eventKey:v.eventKey.trim(),stage:0,logs:[],plan:null,planHistory:[],visits:[],feedback:[],issues:[],baseline:null,consent:false,handoff:false,closed:false,revision:0,status:'ACTIVE',data:[]};
  acCases().push(c);const j=hjEnsure(c);j.entry=v.entry;
  if(v.entry==='POST')for(const key of ['appointment','prepare','arrival','coordinate']){j.nodes[key].status='SKIPPED';j.nodes[key].values={reason:v.reason}}
  hjLog(c,'建立患者旅程',v.reason);$('#dialog').close();go(hjUrl(c));render();return;
 }
 const [cid,key]=String(id).split(':'),c=hjAll().find(x=>x.id===Number(cid));if(!c||!hjVisible(c))return toast('该患者旅程不在当前角色范围内。');
 const j=hjEnsure(c),p=patient(c.patient),fail=message=>toast(message);
 if(action==='role'){
  const actor=key==='MANAGER'?person(1):key==='DOCTOR'?person(p.doctor):person(j.team[hjRoleKey[key]]);
  if(!actor?.active)return fail('对应演示账号不可用。');account=actor;go(hjUrl(c,hjPending(c)));render();return;
 }
 if(action==='step'){const n=hjNodes(c).find(x=>x.key===key);return n?hjSubmit(c,n,v):fail('步骤不存在。')}
 if(action==='draft'){
  const n=hjNodes(c).find(n=>n.key==='plan');if(!hjCan(c,n)||!hjActive(c)||!c.baseline||j.nodes.report.status!=='DONE')return fail('请先由责任医生核对原报告，再由运营点击起草。');
  if(!v)return modal('AI 智能体 · 规划个体健康计划','hj-draft',id,field('version','','hidden',j.version)+field('goal','患者优先目标与本次服务需求','textarea',c.plan?.goal||j.nodes.intake.values.need||'')+field('baseline','已采集健康基线与来源','textarea',c.plan?.baseline||c.baseline.note||'')+field('barriers','执行困难、个人偏好与家属支持','textarea',c.plan?.barriers||'')+field('startDate','管理周期开始日期','date',c.plan?.startDate||acDateTime().slice(0,10))+field('endDate','管理周期结束日期','date',c.plan?.endDate||new Date(Date.now()+30*86400000).toISOString().slice(0,10))+field('education','医生已确认的宣教与自我管理依据','textarea',c.plan?.education||j.nodes.report.values.instructions||'')+field('uncertainties','缺项与待医生确认的信息','textarea',c.plan?.uncertainties||c.baseline.missing||'尚未采集的信息须保留待核实状态')+field('reason','规划 / 重新规划原因','textarea'),'本地模拟智能体：依据本次原报告和上述资料生成三个阶段的可编辑计划。不会自动调药、给出诊断或发送患者；由责任医生确认后执行。');
  if(Number(v.version)!==j.version||!hjRequired(v,['goal','baseline','barriers','education','uncertainties','reason'])||!Number.isFinite(Date.parse(v.startDate))||!Number.isFinite(Date.parse(v.endDate))||v.endDate<v.startDate||Date.parse(v.endDate)-Date.parse(v.startDate)>366*86400000)return fail('请补全规划输入，并填写不超过一年的有效管理周期。');
  const names=j.center==='EXAM'?['检后问题与报告核对','复查准备与执行跟进','检后结果与健康管理复盘']:j.center==='INPATIENT'?['出院接续与居家核对','居家执行与困难跟进','康复反馈与复诊衔接']:['门诊后接续与需求核对','原医嘱执行与困难跟进','阶段结果与复诊衔接'];
  const values={...v,version:j.version,intent:'draft'},start=Date.parse(v.startDate+'T12:00:00Z'),end=Date.parse(v.endDate+'T12:00:00Z');
  names.forEach((title,i)=>Object.assign(values,{['task'+i]:title,['time'+i]:new Date(start+(end-start)*i/2).toISOString().slice(0,10)+'T10:00',['content'+i]:['核对患者对原医嘱的理解、当前反馈与本次需求。','回访实际执行情况、监测记录与遇到的困难；针对已确认需求协调服务。','整理本轮反馈和未结问题，核对复诊或下一周期安排。'][i]+' 服务目标：'+v.goal,['measure'+i]:['记录患者原始反馈、已有监测信息及来源，未采集项明确留空待补。','与本人已核实基线对照；指标、单位和频次由责任医生确认。','记录已完成事项、患者反馈与真实结果证据，交医生评价。'][i],['escalation'+i]:'新增症状、执行困难或患者医学疑问记录事实并交责任医生处理；依据：'+v.education}));
  const beforeVersion=j.version;hjSubmit(c,n,values);
  if(j.version!==beforeVersion){c.plan.agent={mode:'LOCAL_DEMO',version:'health-plan-planner-2.4',at:icNow(),by:account.id,record:c.baseline.id,reportTitle:c.baseline.title,inputs:structuredClone(v),planning:['采集来源与缺项核对','拆解患者目标与执行条件','规划首次、持续与复盘任务','责任医生编辑审核后启用']};hjLog(c,'AI 智能体规划健康计划（本地模拟）','关联原报告 #'+c.baseline.id+'；目标：'+v.goal+'；管理周期：'+v.startDate+' 至 '+v.endDate+'。');render()}
  return;
 }
 if(action==='team'){
  if(!manager())return fail('由运营主管修改分工。');
  if(!v)return modal('修改本次患者旅程协作分工','hj-team',id,field('version','','hidden',j.version)+['operator','nurse'].map(k=>field(k,k==='operator'?'接入与结果核验运营':'医疗护理与服务质控护士','select',j.team[k],demo.accounts.filter(a=>a.active&&a.role===(k==='operator'?'OPERATOR':'NURSE')).map(a=>({value:a.id,label:a.name})))).join('')+field('reason','交接原因与未结事项','textarea'),'责任医生沿用患者档案分派；这里修改业务执行人员。');
  if(Number(v.version)!==j.version||!v.reason?.trim()||person(v.operator)?.role!=='OPERATOR'||person(v.nurse)?.role!=='NURSE'||!person(v.operator)?.active||!person(v.nurse)?.active)return fail('请核对协作人员和交接依据。');
  const before=structuredClone(j.team);j.team={operator:Number(v.operator),nurse:Number(v.nurse)};hjLog(c,'调整协作分工',v.reason,before);$('#dialog').close();render();return;
 }
 const issue=c.issues[Number(key)],isClinical=issue?.kind==='CLINICAL',owner=isClinical?p.doctor:issue?.owner||j.team.operator,handle=account.id===owner||!isClinical&&manager();
 if(action==='issue'){
  if(!hjActive(c)||c.closed)return fail('当前旅程不可新增问题。');
  if(!v)return modal('登记咨询、异常或服务问题','hj-issue',id,field('version','','hidden',j.version)+field('kind','处理类别','select','SERVICE',[{value:'SERVICE',label:'服务协调 / 投诉，交运营处理'},{value:'CLINICAL',label:'医学疑问 / 异常，交责任医生处理'}])+field('due','处理截止时间','datetime-local',acDateTime())+field('note','实际问题、发生时间与信息来源','textarea'));
  if(Number(v.version)!==j.version||!v.note?.trim()||!Number.isFinite(Date.parse(v.due))||!['SERVICE','CLINICAL'].includes(v.kind))return fail('请补全问题事实、来源和处理时限。');
  c.issues.push({kind:v.kind,note:v.note,due:v.due,owner:v.kind==='CLINICAL'?p.doctor:j.team.operator,accepted:false,closed:false});hjLog(c,'登记患者问题',v.note);
 }else if(['issue-accept','issue-resolve','issue-close'].includes(action)){
  if(!issue||issue.closed)return fail('问题状态已变化。');
  if(action==='issue-close'?!hjIsOps()||!issue.resolution||isClinical&&issue.resolvedBy!==p.doctor:!handle||action==='issue-accept'&&issue.accepted||action==='issue-resolve'&&!issue.accepted)return fail('请由本问题责任人员按接单、处理、反馈核验顺序办理。');
  if(!v)return modal({ 'issue-accept':'接单与办理安排','issue-resolve':'记录实质处理结果','issue-close':'核验患者已获反馈'}[action],'hj-'+action,id,field('version','','hidden',j.version)+field('note',action==='issue-close'?'患者获得反馈与问题解决的核验依据':'处理安排 / 结果与依据','textarea'));
  if(Number(v.version)!==j.version||!v.note?.trim())return fail('请补充依据并确认最新版本。');
  if(action==='issue-accept'){issue.accepted=true;issue.acceptedBy=account.id}else if(action==='issue-resolve'){issue.resolution=v.note;issue.resolvedBy=account.id}else{issue.receipt=v.note;issue.closed=true;issue.closedBy=account.id}
  hjLog(c,{ 'issue-accept':'问题接单','issue-resolve':'问题处理结果','issue-close':'患者反馈核验关闭'}[action],v.note);
 }else return fail('操作不存在。');
 $('#dialog').close();render();toast('办理记录已保存。');
}
function hjCaseLabel(c){return c.serviceJourney&&!c.serviceJourney.legacy?(c.closed?'本次旅程已结束':hjPending(c)?.title||'待核验'):acPaths[c.kind].steps[c.stage]||acStateLabels[c.status]}
function hjCaseLink(c){return c.serviceJourney&&!c.serviceJourney.legacy?hjUrl(c,hjPending(c)):'/after-care?case='+c.id+'&patient='+c.patient}
const hjPreviousCaseAction=acAction;
acAction=function(action,id,v){const c=acCases().find(x=>x.id===Number(String(id).split(':')[0]));if(c?.serviceJourney&&!c.serviceJourney.legacy){go(hjCaseLink(c));return toast('请在当前患者旅程步骤中继续办理，保留统一审核与版本记录。')}return hjPreviousCaseAction(action,id,v)};
const hjPreviousPage=afterCarePage;
afterCarePage=function(){
 const c=current.query.has('case')?acCases().find(x=>x.id===Number(current.query.get('case'))):null;
 if(c?.serviceJourney&&!c.serviceJourney.legacy){if(!hjVisible(c)||(current.query.has('patient')&&Number(current.query.get('patient'))!==c.patient))return forbidden();current.query=new URLSearchParams(hjCaseLink(c).split('?')[1]);return hjPage()}
 if(!current.query.has('tab')&&!current.query.has('case')&&!current.query.has('scene')&&hjPaths[icCenter()])return hjPage();
 return hjPreviousPage().replaceAll('诊后主动干预中心','诊后健康服务中心').replaceAll('诊后主动干预','诊后健康服务');
};
const hjPreviousNav=careHubNav;
careHubNav=function(){let html=hjPreviousNav();if(['DOCTOR','NURSE'].includes(account?.role))html=html.replaceAll('>患者全旅程服务<','>医疗与质控工作台<');return html.replaceAll('诊后主动干预中心','诊后健康服务中心').replaceAll('诊后主动干预','诊后健康服务')};
const hjPreviousJourneyPage=journeyPage;
journeyPage=function(){
 if(!['DOCTOR','NURSE'].includes(account?.role)||current.query.has('tab'))return hjPreviousJourneyPage();
 const rows=hjAll().filter(c=>hjVisible(c)&&!c.serviceJourney.legacy&&!c.closed).flatMap(c=>hjNodes(c).filter(n=>n.role===account.role&&hjEnsure(c).nodes[n.key].status!=='DONE').map(n=>({c,n,ready:hjPending(c)?.key===n.key})));
 return page('医疗与质控工作台','患者全旅程服务由运营负责；医生负责医学判断与审核，护士负责医疗护理核对与服务质控。','<div class="hj-clinical-banner"><h2>'+ (account.role==='DOCTOR'?'医生 · 医学审核与结果查收':'护士 · 医疗护理与服务质控')+'</h2><p>'+ (account.role==='DOCTOR'?'查看原报告，审核健康计划，评价随访反馈并处理医学问题。':'核对医疗护理资料、计划执行条件、随访质量与异常升级情况；退回运营整改并复核。')+'</p></div>'+card('我的医疗与质控待办',table(['患者 / 本次事件','医疗与质控环节','交接状态','办理'],rows.map(({c,n,ready})=>[esc(patient(c.patient).name)+'<br>'+esc(c.eventKey),esc(n.title),ready?'待本人办理':'等待前序运营或医护交接',link(ready?'进入办理':'查看资料',hjUrl(c,n),'btn')]))));
};
document.addEventListener('click',e=>{const b=e.target.closest('[data-action^="hj-"]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();hjAction(b.dataset.action.slice(3),b.dataset.id)},true);
document.addEventListener('submit',e=>{const f=e.target.closest('[data-form^="hj-"]');if(!f)return;e.preventDefault();e.stopImmediatePropagation();const v=Object.fromEntries(new FormData(f));v.intent=e.submitter?.value||'draft';hjAction(f.dataset.form.slice(3),f.dataset.id,v)},true);
render();
