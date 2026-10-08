'use strict';
const inCareTabs=[['reports','报告解析汇总'],['risk','风险复核'],['plans','AI 管理计划'],['archive','长期健康档案']];
const afterCareTabs=[['annual','AI 年度计划'],['consult','微信咨询'],['overview','房颤干预总览'],['boundaries','协作范围与上线验收'],['invitations','邀约记录'],['appointments','预约到诊'],['packages','服务包与方案'],['referrals','转诊台账'],['followups','随访工作台'],['alerts','异常响应'],['revisits','复诊跟踪'],['knowledge','宣教内容']];
function careHubNav(){const hidden=['/ai-reports','/risk-review','/care-plans','/longitudinal','/invitations','/appointments','/packages','/referrals','/followups','/alerts','/revisits','/knowledge'];const groups=[['全流程服务',['/enrollment','/screening','/in-care','/after-care']],['角色待办',['/workbench','/doctor','/doctor/reports','/doctor/reviews','/doctor/results','/doctor/alerts','/patients','/wecom']],['运营与治理',['/analytics','/reports','/channels','/hospital','/data-ingestion','/accounts','/quality','/settings','/overview']]];return groups.map(([label,paths])=>{const entries=menu().filter(([p])=>paths.includes(p)&&!hidden.includes(p));return entries.length?'<div class="nav-group"><small>'+label+'</small>'+entries.map(([p,l])=>link(l,p,current.path===p?'active':'')).join('')+'</div>':''}).join('')}
function enrollmentState(){return demo.enrollment??={rows:demo.patients.map((p,i)=>({id:p.id,patient:p.id,scene:['门诊','出院','体检'][i%3],status:'PENDING',channel:false,consent:false,bound:false,assigned:false,logs:[]})).concat(sheetState().records.map(r=>({id:100000+r.id,sourceRecord:r.id,patient:null,scene:r.source==='医院门诊'?'门诊':r.source==='社区筛查'?'社区筛查':'体检',status:'PENDING',channel:false,consent:false,bound:false,assigned:false,logs:[]})))}}
function enrollmentPerson(x){return x.patient?patient(x.patient):sheetState().records.find(r=>r.id===x.sourceRecord)}
function enrollmentRows(){const state=enrollmentState();for(const r of sheetState().records)if(!state.rows.some(x=>x.sourceRecord===r.id))state.rows.push({id:100000+r.id,sourceRecord:r.id,patient:null,scene:r.source==='医院门诊'?'门诊':'社区筛查',channel:false,consent:false,bound:false,assigned:false,logs:[]});for(const p of demo.patients)if(!state.rows.some(x=>x.patient===p.id))state.rows.push({id:p.id,patient:p.id,scene:'门诊',channel:false,consent:false,bound:false,assigned:false,logs:[]});return state.rows.filter(x=>mine(enrollmentPerson(x)))}
function careCycleStrip(){return '<div class="care-cycle-strip">'+[['/enrollment','全量扫码服务入组'],['/screening','诊前筛查'],['/in-care','诊中患者管理'],['/after-care','诊后主动干预'],['/analytics','服务复盘']].map(([p,l])=>link(l,p)).join('<span>→</span>')+'</div>'}
function enrollmentPage(){if(!canOperate()&&account?.role!=='DOCTOR')return forbidden();const rows=enrollmentRows();return page('全量扫码服务入组','覆盖社区筛查、体检、门诊、住院 / 出院和院后回流；自愿服务授权，不影响正常就医。',careCycleStrip()+'<section class="screen-hero"><span class="eyebrow">ONE PATIENT / ONE CONTINUOUS SERVICE RECORD</span><h2>每个场景都有入口，每位患者都有服务交接</h2><p>临床与现场人员引导添加，健康管家承接服务，责任医生把关医学内容。</p></section><div class="note">二维码与企业微信真实接入未配置。下方按钮模拟扫码事件，不生成可用于真实入组的二维码。</div>'+card('入组入口与承接场景','<div class="scene-enrollment-grid">'+['社区筛查','体检','门诊','住院 / 出院','院后回流'].map(scene=>'<section><h3>'+scene+'</h3><p>引导扫码 → 身份核验 → 授权 → 关联档案 → 分派管家 → 服务交接</p>'+button('模拟该场景扫码','cycle-scan',scene)+'</section>').join('')+'</div>')+'<div class="quality-metrics">'+[['应引导扫码',rows.length],['已模拟扫码',rows.filter(x=>x.channel).length],['已授权绑定',rows.filter(x=>x.consent&&x.bound).length],['已交接服务',rows.filter(x=>x.assigned).length]].map(([l,n])=>'<div><small>'+l+'</small><strong>'+n+'</strong><span>当前角色可见演示患者</span></div>').join('')+'</div>'+card('入组服务队列',table(['患者 / 场景','扫码 / 授权 / 绑定','管家 / 责任医生','当前阶段','操作'],rows.map(x=>{const p=enrollmentPerson(x);return [(x.patient?patientCell(p.id):esc(p.name))+'<br>'+esc(x.scene),(x.channel?'已模拟扫码':'待扫码')+' / '+(x.consent?'已演示授权':'未授权')+' / '+(x.bound?'已核验绑定':'未绑定'),esc(person(p.owner)?.name)+'<br>'+esc(person(p.doctor)?.name),tag(x.assigned?'已交接服务':x.bound?'待交接服务':x.channel?'待核验授权':'待现场引导'),canOperate()?(!x.channel?button('模拟扫码','cycle-scan-patient',x.id):!x.bound?button('核验与授权','cycle-verify',x.id):!x.assigned?button('分派并交接','cycle-handoff',x.id,'primary'):button('撤回服务授权','cycle-revoke',x.id,'danger')):'医生只读服务状态']})))+card('全量覆盖与医学入组分开','<p>扫码服务入组用于连接患者、确认身份与服务授权。心电高危确诊、专病管理与个案建议仍需要责任医生判断。已建档患者再次扫码只关联既有档案，不重复创建。</p><p>拒绝、暂缓、家属代办与未成年人监护授权在真实系统中须单独记录。未授权时允许现场咨询和正常就医，不外发医学内容。</p>'))}
function embeddedCarePage(path,fn){const saved=current;try{current={path,query:new URLSearchParams(saved.query)};current.query.delete('tab');return fn()}finally{current=saved}}
function inCarePage(){if(!canOperate()&&account?.role!=='DOCTOR')return forbidden();const tab=current.query.get('tab')||'reports';let body='';if(tab==='reports'){const rs=demo.records.filter(r=>mine(patient(r.patient)));body=card('体检报告 · 门诊病历 · 出院小结',table(['患者','报告类型','原报告','医生查阅','进入'],rs.map(r=>[patientCell(r.patient),esc(r.type),esc(r.title),tag(r.status),link('原文与解析复核','/in-care?tab=reports&patient='+r.patient,'btn')])));body+=embeddedCarePage('/ai-reports',platformModulePage)}if(tab==='risk')body=embeddedCarePage('/risk-review',platformModulePage);if(tab==='plans')body=embeddedCarePage('/care-plans',platformModulePage);if(tab==='archive')body=embeddedCarePage('/longitudinal',platformModulePage);return page('诊中患者管理','汇总报告与病历，完成风险复核、管理计划审批和长期档案，形成交接依据。',careCycleStrip()+tabs(inCareTabs.map(([k,l])=>[k,l,'/in-care?tab='+k+(current.query.get('patient')?'&patient='+current.query.get('patient'): '')]),tab)+card('诊中到诊后交接','<p>体检异常：报告复核 → 专科评估 → 检后跟进；门诊：按门诊病历确认管理建议；出院：按出院小结核对医嘱、复诊时间与随访内容。</p><p>AI 只生成辅助草稿；责任医生本人审核后，博瑞康健康管理师执行，护士质控。扫码状态与医学审核状态分别追踪。</p>'+link('进入诊后干预','/after-care','btn primary'))+body)}
function afterCareOverview(doctor){
  const ps=patients().filter(p=>p.department.includes('心血管')&&p.disease.includes('房颤'));
  const ids=new Set(ps.map(p=>p.id)),ts=tasks().filter(t=>ids.has(t.patient));
  const metrics=[['已确认房颤患者',ps.length,'按科室与已登记病种筛选'],['待医生审核',ts.filter(t=>t.status==='PENDING_REVIEW').length,'计划须责任医生本人确认'],['待人工联系',ts.filter(t=>t.status==='APPROVED').length,'仅执行已审核的个案内容'],['待医生查收',ts.filter(t=>t.status==='COMPLETED'&&!t.received).length,'完成联系后继续追踪结果']];
  return afScenarioPanel()+'<section class="af-hero"><div><span class="eyebrow">心血管科 / 房颤专病管理</span><h2>让每一次诊后联系，都有依据、有承接、有反馈</h2><p>从原医嘱到主动随访，将医生审核、人工执行和异常处置连接到同一条服务记录。</p><div class="toolbar">'+link(doctor?'审核随访计划':'进入随访工作台','/after-care?tab=followups','btn primary')+link('处理异常','/after-care?tab=alerts','btn')+link('复诊跟踪','/after-care?tab=revisits','btn')+'</div></div><div class="af-context"><strong>院内系统部署</strong><span>首期数据来源：医院 HIS</span><span class="af-pending">待接通 · 当前仅医院 Mock</span><small>门诊病历、出院小结、医嘱及检查报告的接口范围待院方核对；院内部署为目标方案。</small></div></section>'+
  '<div class="quality-metrics">'+metrics.map(([label,n,note])=>'<div><small>'+label+'</small><strong>'+n+'</strong><span>'+note+'</span></div>').join('')+'</div>'+
  card('房颤主动干预闭环','<div class="care-steps">'+['核对 HIS 来源与原报告','起草个体计划与待确认项','责任医生本人审核','护士 / 管家人工联系','异常升级与复诊承接','医生查收与档案回流'].map((l,i)=>'<div><b>0'+(i+1)+'</b><span>'+l+'</span></div>').join('')+'</div><p class="muted">随访日期、复查项目及干预内容按已核对的原医嘱和医生确认确定；未接通记录原因及下次计划，修改医学内容后重新审核。</p>')+
  '<div class="af-focus-grid">'+[
    ['01','用药执行核对','记录按原医嘱用药的执行情况、漏服或自行停药反馈，以及需医生答复的问题。','followups','核对并记录'],
    ['02','症状与异常反馈','采集患者自述与相关资料，标注来源和待核实项；异常交由责任医生判断与处置。','alerts','进入异常响应'],
    ['03','复诊与检查承接','核对医生确定的复诊日期和检查要求，记录预约、未到诊原因及实际到诊结果。','revisits','跟踪复诊'],
    ['04','长期档案与宣教','持续记录健康指标与随访反馈；患者宣教沿用医生审核发布流程。','knowledge','查看宣教内容']
  ].map(([n,title,desc,tab,label])=>'<article class="af-focus"><small>'+n+' / 干预重点</small><h3>'+title+'</h3><p>'+desc+'</p>'+link(label,'/after-care?tab='+tab,'btn')+'</article>').join('')+'</div>'+
  card('房颤专病患者 · 当前角色可见',table(['患者','专病登记','责任医生 / 执行负责人','关联资料','操作'],ps.map(p=>[patientCell(p.id),esc(p.disease),esc(person(p.doctor)?.name)+' / '+esc(person(p.owner)?.name),esc(demo.records.filter(r=>r.patient===p.id).length)+' 份原始资料',link('查看档案与关联任务','/patients/'+p.id,'btn')]))+(!ps.length?'<p class="muted">当前演示资料未登记已确认的房颤患者，专病队列为空；既有随访流程仍可体验，不把普通心血管患者自动归为房颤。</p>':''))+
  card('协作与医学边界','<p>AI 整理资料与草稿，责任医生审核个案意见、查收结果和处置临床异常；护士与健康管家负责分配范围内的联系、核实和记录。药物与剂量调整由医生判断，系统不根据患者反馈自动改变医嘱。</p>'+link('查看角色范围、规则来源与验收口径','/after-care?tab=boundaries','btn'));
}
function afterCareBoundaries(){return '<div class="af-section-intro"><span class="eyebrow">实施范围 / 待院方确认</span><h2>协作范围与上线验收</h2><p>已明确：心血管科房颤、首期 HIS 接入、院内部署。下列未确定事项作为实施建议保留，完成确认与验证后再上线。</p></div>'+
card('医生、执行人员与患者端范围',table(['角色 / 端','首期建议范围','边界'],[
['责任医生','查看原报告、审核计划、查收结果、处置异常、审核宣教','本人审核留痕，其他人员不得代登记'],
['护士','资料、计划及服务记录质量检查，异常闭环质控','质控不替代医生医学审核'],['博瑞康健康管理师','主动随访、微信咨询、用药执行核对、复诊承接','按医生审核计划执行，医学咨询转医生'],
['患者 / 家属','首期建议由电话或人工企微联系采集反馈；患者 H5 保留离线演示','生产患者端范围、身份授权与家属代办待确认；未配置渠道不外发'],
['平台管理员','院内系统运维、权限与接入管理','不开放患者业务数据访问']]))+
card('风险规则与证据来源',table(['来源','用途','当前状态'],[
['医院 HIS 原始诊疗资料','个案医嘱、病历、复诊安排及来源追溯','真实接口待接通；跨系统报告范围待确认'],
['院方批准的房颤诊疗规范 / 指南','风险提示、资料缺项与复核依据','规则文件、适用人群、版本和医学负责人待确认'],
['责任医生的个体判断','确认管理计划、干预时点和异常处置','沿用本人审核与处置记录'],
['AI 辅助整理','摘要、草稿、待确认与矛盾项提示','不自动生成医学阈值或替代医生结论']]))+
card('院内接入与追踪要求','<div class="care-steps">'+['HIS 患者 / 就诊 ID 对齐','原报告与医嘱版本关联','增量同步与重复校验','缺失 / 冲突人工核对','角色权限与访问审计','审核 / 执行 / 反馈可追溯'].map((l,i)=>'<div><b>0'+(i+1)+'</b><span>'+l+'</span></div>').join('')+'</div><p>真实部署需确认院内网络、身份认证、数据保存和模型运行方式；外部模型调用须另行明确，原型不代表患者资料已出院或 HIS 已接通。</p>')+
card('性能与准确率验收 · 口径建议',table(['验收维度','建议验证方式','上线条件'],[
['页面 / 任务性能','目标并发下测量工作台加载、保存操作 P95 延迟及失败率','并发规模与数值门槛待院方确认'],
['HIS 同步质量','统计同步成功率、延迟、重复记录及患者 / 就诊关联错误','指标门槛待确认；重复同步不重复建档'],
['结构化提取准确率','医生标注样本，按字段统计准确率、召回率与来源定位正确性','样本量、字段范围与目标值待确认'],
['风险识别质量','院方确认风险类别，逐类评价漏报与误报；缺失数据单独统计','临床负责人确认门槛，不用综合准确率掩盖高风险漏报'],
['审核与权限','验证未审核执行阻断、修改后重审、非责任医生越权及管理员访问','必测场景全部通过后才放行'],
['闭环与追溯','模拟未接通重试、异常承接、实际到诊、结果查收和版本回溯','可定位来源、责任人、审核版本与处置结果']]))+
'<div class="note">尚未提供规则文件及数值验收标准，页面不展示“已通过”或虚构准确率；此处为实施建议，不新增规则发布或 SOP 配置功能。</div>';
}
function afterCarePage(){if(!canOperate()&&account?.role!=='DOCTOR')return forbidden();const tab=current.query.get('tab')||'overview';let body='';const doctor=account.role==='DOCTOR';if(['invitations','appointments','packages','referrals'].includes(tab)){if(doctor){const type=tab==='packages'?'enrollments':tab;body=card('关联服务台账 · 医生只读',table(['患者','记录','状态'],demo[type].filter(x=>mine(patient(x.patient))).map(x=>[patientCell(x.patient),esc(x.note||x.name||x.at||''),tag(x.status)])))}else body=embeddedCarePage('/'+tab,()=>collection(tab))}if(tab==='followups')body=embeddedCarePage(doctor?'/doctor/reviews':'/followups',()=>taskList(doctor?'reviews':undefined));if(tab==='alerts')body=embeddedCarePage(doctor?'/doctor/alerts':'/alerts',()=>alertList(doctor));if(tab==='revisits')body=doctor?card('复诊跟踪 · 医生只读',table(['患者','时间','状态'],demo.appointments.filter(x=>mine(patient(x.patient))).map(x=>[patientCell(x.patient),esc(x.at),tag(x.status)]))):embeddedCarePage('/revisits',()=>collection('appointments',undefined,'复诊跟踪'));if(tab==='knowledge')body=embeddedCarePage('/knowledge',knowledge);if(tab==='overview')body=afterCareOverview(doctor);if(tab==='boundaries')body=afterCareBoundaries();if(tab==='annual')body=mine(patient(1010))?afAnnualPanel():card('年度计划','暂无负责病例');if(tab==='consult')body=mine(patient(1010))?afConsultPanel():card('微信咨询','暂无负责病例');return page('诊后主动干预管理','心血管科 · 房颤专病｜依据院内诊疗记录制定计划，责任医生审核，博瑞康健康管理师执行，护士质控，反馈回流。',careCycleStrip()+tabs(afterCareTabs.map(([k,l])=>[k,l,'/after-care?tab='+k]),tab)+(tab==='overview'||tab==='boundaries'?'':card('主动干预服务链','<div class="care-steps">'+['扫码授权与服务承接','原报告关联与计划审核','电话 / 企微人工跟进','邀约预约与到诊核实','异常升级与绿色回院','结果查收与运营复盘'].map((l,i)=>'<div><b>0'+(i+1)+'</b><span>'+l+'</span></div>').join('')+'</div><p>企微真人一对一服务、检查须知、资料准备与复诊提醒以已核对的业务事实为依据；药物和剂量不由运营或 AI 自行调整。</p>')+ '<p class="muted">既有业务台账包含当前角色可见的全部病种；房颤专病范围在总览单独核对。</p>')+body)}
function cycleAction(kind,id,v){if(!canOperate())return toast('只有被分配的护士 / 运营或主管可处理服务入组。');const rows=enrollmentRows();if(kind==='cycle-scan'){const x=rows.find(x=>!x.channel)||rows[0];if(!x)return toast('暂无可关联的虚构患者。');if(!v){modal('模拟场景扫码','cycle-scan-confirm',x.id,field('patient','选择已有虚构患者','select',x.id,rows.map(r=>({value:r.id,label:enrollmentPerson(r).name})))+field('scene','扫码场景','select',id,['社区筛查','体检','门诊','住院 / 出院','院后回流']),'模拟事件只关联已授权角色可见的虚构档案，不创建新患者。');return}}
const x=rows.find(x=>x.id===Number(id));if(!x)return toast('无权处理该患者。');if(kind==='cycle-scan-confirm'){const chosen=rows.find(r=>r.id===Number(v.patient));if(!chosen||!['社区筛查','体检','门诊','住院 / 出院','院后回流'].includes(v.scene))return toast('场景或患者不合法。');chosen.channel=true;chosen.scene=v.scene;chosen.logs.push('模拟扫码');if(chosen.patient)audit('模拟场景扫码，关联既有档案：'+v.scene,chosen.patient);$('#dialog').close();render();return}if(kind==='cycle-scan-patient'){x.channel=true;if(x.patient)audit('模拟扫码关联既有档案',x.patient);render();return}if(kind==='cycle-verify'){if(!x.channel)return toast('尚未扫码。');if(!v){modal('核验身份与服务授权',kind,id,field('note','虚构核验依据与本人授权记录','textarea')+(!x.patient?field('target','档案关联方式','select','NEW',[{value:'NEW',label:'核验后新建虚构档案'},...patients().map(p=>({value:String(p.id),label:'关联已有：'+p.name}))]):''),'核对既有档案与就诊身份，不凭手机号自动合并；真实患者授权由本人完成。');return}if(!v.note?.trim())return toast('请填写核验与授权依据。');if(!x.patient){const source=enrollmentPerson(x);if(v.target==='NEW'){const p={id:Math.max(0,...demo.patients.map(p=>p.id))+1,name:source.name,gender:source.gender==='男'?'MALE':'FEMALE',age:source.age,phone:source.phone,department:'待核对（演示）',disease:'导入后待医生复核',risk:'待评估',doctor:source.doctor,owner:source.owner,source:'FILE_IMPORT',external:'DEMO-LEDGER-'+source.id};demo.patients.push(p);x.patient=p.id}else{const existing=patients().find(p=>p.id===Number(v.target));if(!existing)return toast('目标档案不可访问。');x.patient=existing.id}}x.bound=true;x.consent=true;audit('演示身份核验与服务授权：'+v.note,x.patient)}if(kind==='cycle-handoff'){if(!x.bound||!x.consent)return toast('未完成核验与授权，交接已阻断。');x.assigned=true;audit('完成服务入组交接；管家 '+person(patient(x.patient).owner).name+'；医学管理须另行审核',x.patient)}if(kind==='cycle-revoke'){x.consent=false;x.assigned=false;x.bound=false;audit('撤回演示服务授权，停止服务外发与交接',x.patient)}$('#dialog').close();render()}
document.addEventListener('click',e=>{const b=e.target.closest('[data-action^="cycle-"]');if(b)cycleAction(b.dataset.action,b.dataset.id)});
document.addEventListener('submit',e=>{const f=e.target.closest('[data-form^="cycle-"]');if(!f)return;e.preventDefault();const v=Object.fromEntries(new FormData(f));Object.keys(v).forEach(k=>v[k]=String(v[k]).trim());cycleAction(f.dataset.form,f.dataset.id,v)});

// A fictional, click-through case. Every mutation is local and explicitly simulated.
function afScenarioSeed(data){
  data.patients.push({id:1010,name:'房颤演示患者 · 林先生（虚构）',gender:'MALE',age:68,phone:'00000000010',department:'心血管内科',disease:'房颤（虚构医生已确认）',risk:'待个体复核',doctor:2,owner:4,source:'HOSPITAL_MOCK',external:'MOCK-AF-001'});
  data.records.push({id:110,patient:1010,type:'出院',title:'房颤模拟出院小结 · HIS-MOCK-AF-001',status:'UNREAD',source:'HOSPITAL_MOCK',text:'【全虚构病例，不用于诊疗】\n2026-10-08：68 岁男性，虚构院内医生已确认房颤；既往高血压。因反复心悸接受院内诊疗后，进入院后连续管理。\n既定医嘱：按院内原处方执行；博瑞康健康管理师核对执行困难与患者反馈，药物名称、剂量及检查指标以实际医嘱为准，本示例不生成。\n演示个案安排：2026-10-10 首次电话随访，2026-10-15 复诊，2026-10-22 持续随访。以上为本病例虚构日期，不是统一随访标准。\n病史补充项：过敏史、肾功能、完整用药清单及既往相关病史待核对，不将缺失项写为正常。\n来源标识 MOCK-AF-001 / VISIT-AF-001；原报告版本 v1。',opinion:''});
  data.tasks.push({id:2010,patient:1010,record:110,title:'房颤出院后首次主动随访（虚构）',status:'PENDING',due:'2026-10-10T10:00',draft:'',approved:'',version:1});
  data.audits.push({at:'2026-10-08 · 虚构起点',patient:1010,text:'载入房颤虚构病例、HIS Mock 出院小结及关联首访任务；真实 HIS 未接通。'});
}
function afScenarioState(){return demo.afScenario??={stage:0,plan:null,consult:null,nextTask:null,history:[]};}
const afFlow=[
['enroll','授权入组与博瑞康承接',4,'模拟身份核验、服务授权、微信渠道确认与管家分派。'],
['report','核对病历与原医嘱',3,'护士核对资料完整性，记录过敏史、用药清单等待补充项。'],
['generate','AI 生成未来一年计划草稿',4,'根据虚构病例生成 12 个月、7 类任务的本地模拟草稿。'],
['quality','护士质控年度计划',3,'检查来源、日期、缺项及原医嘱一致性；质控不替代医学审核。'],
['approve','医生审核年度计划',2,'本人核对个体安排与医学内容，确认年度计划 v1 后生效。'],
['contact','博瑞康主动随访',4,'按已审核计划核对身份、医嘱执行和患者反馈。'],
['consult','博瑞康承接微信咨询',4,'虚构患者询问服药执行问题并反馈再次心悸，登记医学问题转交。'],
['answer','医生审核咨询回复',2,'记录医生对虚构咨询的意见，不自动生成处方或剂量。'],
['reply','管家回复并跟踪患者',4,'模拟人工微信回复并记录患者知悉情况。'],
['escalate','核实异常并升级医生',4,'将患者自述与待核实信息交责任医生处置。'],
['dispose','医生接管与个案处置',2,'确认异常承接和院内评估安排，记录处置依据。'],
['book','博瑞康预约与复诊提醒',4,'登记虚构 2026-10-15 复诊，保留资料准备和提醒记录。'],
['arrive','核实到院并回流复诊资料',4,'核对模拟到诊凭证，关联复诊记录。'],
['complete','博瑞康汇总首轮执行结果',4,'汇总随访、微信咨询、异常承接与实际到诊结果。'],
['receive','医生查收医学结果',2,'本人确认首轮结果与复诊资料，记录后续安排。'],
['execution-qc','护士质控服务闭环',3,'核查联系、咨询回复、异常处置与到诊凭证是否完整。'],
['update','AI 提出年度计划调整草稿',4,'根据复诊资料生成 v2 草稿，保留已执行记录，未审核不替换 v1。'],
['update-qc','护士质控调整草稿',3,'检查调整依据及后续任务与复诊记录的一致性。'],
['update-approve','医生审核计划更新',2,'本人确认 v2，下一轮意见进入已审核的管理版本。'],
['next','博瑞康承接下一轮持续管理',4,'生成关联复诊记录的待领取任务，后续联系意见仍须审核。']
];
function afScenarioSteps(){const s=afScenarioState();return afFlow.map(([key,title,role,note],i)=>({key,title,role,note,done:i<s.stage}));}
function afAnnualDraft(version,source){
 const categories=['主动随访','用药执行核对','复诊承接','危急响应准备','饮食管理','运动管理','微信咨询'];
 const months=Array.from({length:12},(_,i)=>{const d=new Date(Date.UTC(2026,9+i,10));return {month:d.toISOString().slice(0,7),date:d.toISOString().slice(0,10),items:categories.map(kind=>({kind,content:{'主动随访':'核对近期反馈、执行困难与待咨询问题','用药执行核对':'对照原处方核对执行；不生成药品或剂量','复诊承接':i===0?'演示个案复诊 2026-10-15；核实提醒与到诊':'复诊时间由医生按最新记录确认，不自动安排每月检查','危急响应准备':'核对预先批准的应急联系与承接流程；事件发生即时升级','饮食管理':'使用医生审核的个体适用内容，记录执行反馈','运动管理':'医生确认适用范围，记录活动反馈与限制','微信咨询':'博瑞康持续承接；新增医学意见转医生审核'}[kind]}))};});
 return {version,source,status:'DRAFT',qc:false,reviewer:null,months,generated:'本地模板模拟 AI，未调用模型',range:'2026-10-08 至 2027-10-07'};
}
function afAnnualPanel(){const s=afScenarioState(),p=s.pendingPlan||s.plan;if(!p)return card('年度计划','<p>完成资料核对后，点击流程中的“AI 生成未来一年计划草稿”。</p>');return card('AI 年度计划 · v'+p.version,tag(p.status)+'<p>'+esc(p.generated)+' · 12 个月 / 84 个管理主题 · '+esc(p.range)+'</p><p>来源报告 #'+p.source+' · 护士质控：'+(p.qc?'已完成':'待完成')+' · 医生审核：'+(p.reviewer?esc(person(p.reviewer).name):'待审核')+'</p><div class="note">日期为虚构排期。用药按原医嘱执行，复诊和活动安排由医生个体确认；危急响应是持续触发机制，不等待月度任务。</div>'+(s.pendingPlan?'<p>v2 为调整草稿；当前执行仍依据已审核 v'+s.plan.version+'，历史版本保留。</p>':'')+table(['月份 / 演示联系日期','随访与用药','复诊与风险','饮食、运动与咨询'],p.months.map(m=>[esc(m.month)+'<br>'+esc(m.date),m.items.slice(0,2).map(x=>'<b>'+esc(x.kind)+'</b>：'+esc(x.content)).join('<br>'),m.items.slice(2,4).map(x=>'<b>'+esc(x.kind)+'</b>：'+esc(x.content)).join('<br>'),m.items.slice(4).map(x=>'<b>'+esc(x.kind)+'</b>：'+esc(x.content)).join('<br>')])));}
function afConsultPanel(){const c=afScenarioState().consult;return card('博瑞康微信咨询台账',c?'<p>患者：林先生（虚构） · 渠道：微信人工联系模拟</p>'+tag(c.status)+'<p>患者问题：'+esc(c.question)+'</p><p>医生意见：'+esc(c.answer||'待责任医生审核')+'</p><p>管家回复：'+esc(c.reply||'尚未回复')+'</p><p class="muted">咨询与患者 1010、首访任务 2010 关联；未接通真实微信，不发送消息。</p>':'<p>暂无咨询。流程进入微信咨询节点后生成虚构问题，并追踪医生答复、人工回复与患者反馈。</p>');}
function afScenarioPanel(){if(!mine(patient(1010)))return '';const s=afScenarioState(),steps=afScenarioSteps(),next=steps[s.stage];return '<section class="af-scenario"><div class="af-scenario-head"><div><span class="eyebrow">博瑞康全流程运营 / 全虚构病例</span><h2>林先生 · 68 岁 · 房颤年度管理</h2><p>博瑞康健康管理师执行与微信咨询 · 院方护士质控 · 责任医生审核处置<br>出院 2026-10-08；年度管理至 2027-10-07；首访与复诊时间为本病例虚构安排。</p></div><div class="af-progress"><strong>'+s.stage+' / '+steps.length+'</strong><span>已完成管理节点</span></div></div><div class="toolbar">'+[4,3,2].map(id=>button('切换：'+({4:'博瑞康健康管理师',3:'质控护士',2:'责任医生'}[id]),'af-role',id)).join('')+link('患者档案','/patients/1010','btn')+link('年度计划','/after-care?tab=annual','btn')+link('微信咨询','/after-care?tab=consult','btn')+'</div><div class="note">所有确认与反馈为本地演示，刷新恢复起点。AI 为模板模拟；HIS 与微信未接通。切换角色不改变责任分派。</div>'+(next?'<div class="af-next"><small>下一步 · '+esc(person(next.role).name)+'</small><h3>'+esc(next.title)+'</h3><p>'+esc(next.note)+'</p>'+(account.id===next.role?button('模拟：'+next.title,'af-step',next.key,'primary'):button('切换到对应演示角色','af-role',next.role,'primary'))+(next.key==='contact'&&account.id===4?button('模拟未接通与再次联系','af-step','retry'):'')+'</div>':'<div class="af-next"><h3>首轮管理与年度计划更新已闭环</h3>'+link('查看下一轮待执行任务','/followups/'+s.nextTask,'btn primary')+'</div>')+'<ol class="af-milestones">'+steps.map((x,i)=>'<li class="'+(x.done?'done':i===s.stage?'current':'')+'"><b>'+String(i+1).padStart(2,'0')+'</b><div><strong>'+esc(x.title)+'</strong><small>'+esc(person(x.role).name)+' · '+(x.done?'已完成':'待完成')+'</small></div></li>').join('')+'</ol>'+afAnnualPanel()+afConsultPanel()+card('病例全过程审计',timeline(1010))+'</section>';}
function afScenarioAction(action,id,v){
 const p=patient(1010);const allowed=account&&(manager()||account.id===p.doctor||account.id===p.owner||account.id===3);
 if(!allowed)return toast('只能操作负责的虚构病例。');
 if(action==='af-role'){if(![2,3,4].includes(Number(id)))return;account=person(Number(id));go('/after-care');render();return;}
 const s=afScenarioState(),next=afFlow[s.stage];if(!next||!(id===next[0]||(id==='retry'&&next[0]==='contact')))return toast('请完成前序节点，重复提交不生成重复记录。');
 if(account.id!==next[2])return toast('必须由对应责任角色本人确认。');
 if(!v){modal('模拟：'+next[1],'af-step',id,field('note','虚构依据 / 确认记录','textarea','【虚构演示】'+next[3]),'仅保存本地模拟记录；不实际联系、调药或调用 AI。');return;}
 if(!v.note?.trim())return toast('请填写确认记录。');
 const t=demo.tasks.find(x=>x.id===2010),r=demo.records.find(x=>x.id===110);
 if(id==='enroll'){const e=enrollmentState().rows.find(x=>x.patient===1010);Object.assign(e,{channel:true,consent:true,bound:true,assigned:true});e.logs.push(v.note);}
 if(id==='report'){r.status='READ';r.qualityNote=v.note;}
 if(id==='generate'){s.plan=afAnnualDraft(1,110);t.draft='【虚构 AI 草稿】按原医嘱核对用药执行、近期反馈与复诊准备；具体医学问题交医生审核。';t.status='PENDING_REVIEW';t.version++;}
 if(id==='quality'){s.plan.qc=true;s.plan.qcBy=3;s.plan.qcNote=v.note;}
 if(id==='approve'){if(!s.plan?.qc)return toast('年度计划需先完成护士质控。');s.plan.status='APPROVED';s.plan.reviewer=account.id;t.approved=t.draft;t.reviewer=account.id;t.status='APPROVED';t.version++;r.opinion=v.note;}
 if(['contact','retry'].includes(id)){if(t.status!=='APPROVED'||t.reviewer!==p.doctor||s.plan?.status!=='APPROVED')return toast('需重新完成医生审核。');if(id==='retry'){if(t.contacts?.some(x=>x.result==='FAILED'))return toast('已登记重试计划。');(t.contacts??=[]).push({at:'2026-10-10T10:00',result:'FAILED',note:v.note,next:'2026-10-11T10:00'});t.nextContact='2026-10-11T10:00';}else{(t.contacts??=[]).push({at:t.nextContact||'2026-10-10T10:00',result:'SUCCESS',identity:true,report:true,note:v.note});t.status='CONTACTED';delete t.nextContact;}t.version++;}
 if(id==='consult')s.consult={patient:1010,task:2010,status:'待医生答复',question:'【虚构患者】服药执行有疑问，近期再次心悸，希望医生核实。',owner:4};
 if(id==='answer'){s.consult.answer=v.note;s.consult.reviewer=account.id;s.consult.status='待管家人工回复';}
 if(id==='reply'){if(s.consult.reviewer!==p.doctor)return toast('回复需责任医生确认。');s.consult.reply=v.note;s.consult.status='已模拟回复 / 待跟踪';}
 if(id==='escalate')demo.alerts.push({id:4010,patient:1010,task:2010,record:110,title:'房颤虚构咨询反馈 · 待医生判断',kind:'CLINICAL',status:'ESCALATED',note:v.note+' 来源：虚构患者自述，待医生判断。'});
 if(id==='dispose'){const a=demo.alerts.find(x=>x.id===4010);a.status='CLOSED';a.disposition=v.note;a.disposedBy=account.id;}
 if(id==='book')demo.appointments.push({id:7010,patient:1010,status:'BOOKED',at:'2026-10-15T09:00',note:v.note});
 if(id==='arrive'){const a=demo.appointments.find(x=>x.id===7010);a.status='COMPLETED';a.arrivalEvidence='【虚构到诊凭证】VISIT-AF-002';a.note+='\n'+v.note;demo.records.push({id:111,patient:1010,type:'门诊',title:'房颤虚构复诊记录 · VISIT-AF-002',source:'HOSPITAL_MOCK',status:'UNREAD',text:'【虚构复诊】2026-10-15 模拟到诊，后续按个案安排持续管理；不生成处方或剂量。',opinion:''});}
 if(id==='complete'){t.status='COMPLETED';t.version++;}
 if(id==='receive'){t.received=true;t.feedback=v.note;const follow=demo.records.find(x=>x.id===111);follow.status='READ';follow.opinion=v.note;}
 if(id==='execution-qc'){s.executionQC={by:3,note:v.note};s.consult.status='已跟踪 / 已质控';}
 if(id==='update'){s.pendingPlan=afAnnualDraft(2,111);s.pendingPlan.reason=v.note;}
 if(id==='update-qc'){s.pendingPlan.qc=true;s.pendingPlan.qcBy=3;s.pendingPlan.qcNote=v.note;}
 if(id==='update-approve'){if(!s.pendingPlan?.qc)return toast('调整草稿需先质控。');(s.versions??=[]).push(structuredClone(s.plan));s.pendingPlan.status='APPROVED';s.pendingPlan.reviewer=account.id;s.plan=s.pendingPlan;s.pendingPlan=null;}
 if(id==='next'){s.nextTask=Math.max(...demo.tasks.map(x=>x.id))+1;demo.tasks.push({id:s.nextTask,patient:1010,record:111,title:'房颤复诊后持续随访（虚构）',status:'PENDING',due:'2026-10-22T10:00',draft:'',approved:'',planVersion:2,version:1});}
 s.history.push({key:id,by:account.id,note:v.note,planVersion:s.plan?.version});if(id!=='retry')s.stage++;
 audit('【博瑞康房颤模拟】'+(id==='retry'?'未接通与重试':next[1])+'：'+v.note,1010);$('#dialog').close();render();toast('虚构记录已保存，管理台账同步更新。');
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-action^="af-"]');if(b)afScenarioAction(b.dataset.action,b.dataset.id);});
document.addEventListener('submit',e=>{const f=e.target.closest('[data-form^="af-"]');if(!f)return;e.preventDefault();afScenarioAction(f.dataset.form,f.dataset.id,Object.fromEntries(new FormData(f)));});
