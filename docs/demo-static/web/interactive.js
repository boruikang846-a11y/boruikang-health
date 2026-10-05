'use strict';

// Offline, fictional prototype state. No network, authentication or patient API is invoked.
const roles={MANAGER:'运营主管',DOCTOR:'责任医生',NURSE:'院方护士',OPERATOR:'运营人员',PLATFORM_ADMIN:'平台管理员'};
const names={PENDING:'待领取',IN_PROGRESS:'起草中',PENDING_REVIEW:'待医生审核',REJECTED:'退回修改',APPROVED:'审核通过',CONTACTED:'已联系',COMPLETED:'已完成',ESCALATED:'已升级医生',CLOSED:'已关闭',UNREAD:'待阅',READ:'已阅',DRAFT:'草稿',PUBLISHED:'已发布',BOOKED:'已预约',REMINDED:'已登记提醒',ARRIVED:'已到院',NO_SHOW:'未到院',CANCELLED:'已取消',ACTIVE:'履约中',INITIATED:'已发起',ACCEPTED:'已接收',FEEDBACK:'已反馈',NEW:'待判定',HIGH:'高危待建档',ENROLLED:'已建档'};
const initial={
  accounts:[{id:1,identifier:'manager',name:'演示运营主管',role:'MANAGER',department:'运营团队',active:true},{id:2,identifier:'doctor',name:'演示责任医生甲',role:'DOCTOR',department:'心血管内科',active:true},{id:3,identifier:'nurse',name:'演示护士',role:'NURSE',department:'心血管内科',active:true},{id:4,identifier:'operator_a',name:'演示运营专员',role:'OPERATOR',department:'运营团队',active:true},{id:5,identifier:'platform',name:'演示平台管理员',role:'PLATFORM_ADMIN',department:'平台',active:true},{id:6,identifier:'doctor_b',name:'演示责任医生乙',role:'DOCTOR',department:'全科',active:true}],
  patients:[{id:1001,name:'演示患者一',gender:'MALE',age:66,phone:'00000000001',department:'心血管内科',disease:'演示病程 A',risk:'高',doctor:2,owner:4,source:'HOSPITAL_MOCK',external:'MOCK-DEMO-001'},{id:1002,name:'演示患者二',gender:'FEMALE',age:54,phone:'00000000002',department:'心血管内科',disease:'演示病程 B',risk:'中',doctor:2,owner:3,source:'MANUAL',external:''},{id:1003,name:'演示患者三',gender:'MALE',age:61,phone:'00000000003',department:'全科',disease:'演示病程 C',risk:'低',doctor:6,owner:4,source:'HOSPITAL_MOCK',external:'MOCK-DEMO-003'}],
  records:[{id:101,patient:1001,type:'出院',title:'虚构出院报告 A',status:'UNREAD',text:'【虚构演示报告】请由责任医生核对原记录。随访时核实原医嘱执行中遇到的困难、近期反馈和复诊准备。不提供调药或诊断建议。',opinion:''},{id:102,patient:1002,type:'门诊',title:'虚构门诊报告 B',status:'READ',text:'【虚构演示报告】用于查看病程记录、关联随访和团队交接。',opinion:'请记录原医嘱执行时遇到的问题。'},{id:103,patient:1003,type:'体检',title:'虚构体检记录 C',status:'UNREAD',text:'【虚构演示报告】本记录尚待责任医生核对。',opinion:''}],
  tasks:[{id:2001,patient:1001,record:101,title:'出院后 D7 随访',status:'PENDING',due:'2026-10-02T10:00',draft:'',approved:'',version:1},{id:2002,patient:1002,record:102,title:'门诊报告后随访',status:'PENDING_REVIEW',due:'2026-10-02T11:00',draft:'请核对原医嘱执行情况，记录需要责任医生解答的问题。',approved:'',version:1},{id:2003,patient:1001,record:101,title:'复诊准备核实',status:'APPROVED',due:'2026-10-03T09:00',draft:'请核实复诊准备和原医嘱执行中遇到的问题。',approved:'请核实复诊准备和原医嘱执行中遇到的问题。',reviewer:2,version:1},{id:2004,patient:1001,record:101,title:'首次联系结果查收',status:'COMPLETED',due:'2026-10-01T09:00',draft:'核对原医嘱和复诊准备。',approved:'核对原医嘱和复诊准备。',reviewer:2,contacts:[{at:'2026-10-01T09:00',result:'SUCCESS',note:'【虚构联系记录】已核实身份，记录了复诊资料准备问题。'}],version:1},{id:2005,patient:1003,record:103,title:'体检报告后随访',status:'PENDING_REVIEW',due:'2026-10-03T09:00',draft:'请核对报告理解中遇到的问题。',approved:'',version:1}],
  alerts:[{id:4001,patient:1001,title:'待医生判断的患者反馈',kind:'CLINICAL',status:'ESCALATED',note:'【虚构演示】团队核实后升级，等待责任医生判断。'},{id:4002,patient:1001,title:'再次联系仍未接通',kind:'LOST',status:'IN_PROGRESS',note:'【虚构演示】待负责人核实失联情况。'}],
  pool:[{id:5001,name:'虚构筛查对象一',status:'NEW',source:'心电网络 Mock',note:'筛查发现待人工判定',owner:4}],
  invitations:[{id:6001,patient:1001,status:'已接通，有到院意向',note:'【虚构演示】已说明可选到院方式。',at:'2026-10-01T09:20'}],
  appointments:[{id:7001,patient:1001,status:'BOOKED',at:'2026-10-07T10:00',note:'按原记录安排，尚待到院核实。'}],
  enrollments:[{id:8001,patient:1001,status:'待激活',name:'演示连续随访服务',note:'仅履约台账，不发生支付。'}],
  referrals:[{id:9001,patient:1001,status:'INITIATED',direction:'上转',target:'虚构示范医院',note:'【虚构演示】待目标机构接收。'}],
  knowledge:[{id:10001,title:'复诊资料准备说明（演示）',content:'请依原报告核对需要携带的资料；有疑问由责任医生解答。',status:'DRAFT'}],
  channels:[{id:11001,name:'演示医院介绍渠道',active:true}],
  audits:[{at:'演示初始状态',patient:1001,text:'虚构演示档案与任务已载入。'}],
  archives:[],mockSynced:false,integrationConfigured:false
};
let demo=structuredClone(initial),account=null,current={path:'/login',query:new URLSearchParams()},noticeTimer;
demo.accounts.forEach(a=>a.password='HealthDemo@2026!');
const operations=[['/journey','患者全旅程服务'],['/enrollment','全量扫码服务入组'],['/after-care','诊后主动干预'],['/workbench','运营工作台'],['/screening','诊前筛查中心'],['/data-ingestion','数据接入测试'],['/patients','患者中心'],['/invitations','邀约记录'],['/appointments','预约到诊'],['/packages','服务包与方案'],['/referrals','转诊台账'],['/followups','随访工作台'],['/alerts','异常响应'],['/revisits','复诊跟踪'],['/knowledge','宣教内容'],['/channels','渠道管理'],['/reports','随访统计与复盘'],['/hospital','医院数据'],['/accounts','医护账号'],['/ai-reports','报告解析复核'],['/risk-review','风险复核'],['/care-plans','AI 管理计划'],['/longitudinal','长期健康档案'],['/analytics','运营分析'],['/wecom','企业微信协作'],['/quality','质量保障中心'],['/settings','运营设置'],['/overview','系统介绍']];
const doctors=[['/journey','患者全旅程服务'],['/enrollment','扫码服务入组'],['/after-care','诊后主动干预'],['/screening','诊前风险复核'],['/doctor','医生工作台'],['/doctor/reports','患者报告'],['/doctor/reviews','随访意见审核'],['/doctor/results','随访结果查收'],['/doctor/alerts','异常处置'],['/patients','我的患者'],['/knowledge','宣教审核'],['/ai-reports','报告解析复核'],['/risk-review','风险复核'],['/care-plans','AI 管理计划'],['/longitudinal','长期健康档案'],['/analytics','运营分析'],['/wecom','企业微信协作'],['/quality','医学安全与验收'],['/overview','系统介绍']];
const $=s=>document.querySelector(s);
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const link=(label,path,cls='')=>'<a class="'+esc(cls)+'" href="#'+esc(path)+'">'+esc(label)+'</a>';
const button=(label,action,id='',cls='')=>'<button type="button" class="'+esc(cls)+'" data-action="'+esc(action)+'" data-id="'+esc(id)+'">'+esc(label)+'</button>';
const tag=v=>'<span class="tag '+(['COMPLETED','APPROVED','PUBLISHED','READ','CLOSED','ARRIVED','ACTIVE'].includes(v)?'green':['REJECTED','ESCALATED','NO_SHOW'].includes(v)?'red':'gold')+'">'+esc(names[v]||v)+'</span>';
const card=(title,body)=>'<div class="card">'+(title?'<h2>'+esc(title)+'</h2>':'')+body+'</div>';
const table=(heads,rows)=>'<div class="table-wrap"><table><thead><tr>'+heads.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+(rows.length?rows.map(r=>'<tr>'+r.map(c=>'<td>'+c+'</td>').join('')+'</tr>').join(''):'<tr><td colspan="'+heads.length+'" class="empty">暂无匹配的演示记录</td></tr>')+'</tbody></table></div>';
const patient=id=>demo.patients.find(p=>p.id===Number(id));
const person=id=>demo.accounts.find(a=>a.id===Number(id));
const canOperate=()=>account&&['MANAGER','OPERATOR','NURSE'].includes(account.role);
const manager=()=>account&&account.role==='MANAGER';
const mine=p=>account&&p&&(manager()||(account.role==='DOCTOR'?p.doctor===account.id:['OPERATOR','NURSE'].includes(account.role)&&p.owner===account.id));
const patients=()=>demo.patients.filter(mine);
const pool=()=>demo.pool.filter(x=>manager()||x.owner===account?.id);
const tasks=()=>demo.tasks.filter(t=>mine(patient(t.patient)));
const home=()=>account.role==='DOCTOR'?'/doctor':account.role==='PLATFORM_ADMIN'?'/settings':'/workbench';
const menu=()=>account.role==='DOCTOR'?doctors:account.role==='PLATFORM_ADMIN'?[['/settings','接入设置'],['/wecom','企业微信接入'],['/quality','质量保障中心'],['/overview','系统介绍']]:manager()?operations:operations.filter(([p])=>!['/channels','/accounts','/quality','/analytics','/data-ingestion'].includes(p));
function toast(text){clearTimeout(noticeTimer);$('#notice').textContent=text;$('#notice').classList.add('visible');noticeTimer=setTimeout(()=>$('#notice').classList.remove('visible'),4500)}
function go(path){if(location.hash==='#'+path)render();else location.hash=path}
function audit(text,p=0){demo.audits.unshift({at:new Date().toLocaleString('zh-CN'),patient:Number(p),text:account.name+'：'+text})}
function page(title,description,body){return '<div class="crumb">'+link('流程总览','/flow')+' / '+esc(title)+'</div><h1>'+esc(title)+'</h1><p>'+esc(description)+'</p>'+body}
function field(name,label,type='text',value='',options=[],required=true){
  const attrs=' name="'+esc(name)+'"'+(required?' required':'');
  let input=type==='select'?'<select'+attrs+'>'+options.map(o=>{const v=typeof o==='object'?o.value:o,l=typeof o==='object'?o.label:o;return '<option value="'+esc(v)+'"'+(String(v)===String(value)?' selected':'')+'>'+esc(l)+'</option>'}).join('')+'</select>':type==='textarea'?'<textarea'+attrs+' maxlength="4000">'+esc(value)+'</textarea>':'<input'+attrs+' type="'+esc(type)+'" value="'+esc(value)+'" maxlength="200">';
  return '<label>'+esc(label)+input+'</label>';
}
function modal(title,action,id,fields,help=''){
  $('#dialog-content').innerHTML='<h2>'+esc(title)+'</h2><form data-form="'+esc(action)+'" data-id="'+esc(id)+'"><div class="form-grid">'+fields+'</div><p>'+esc(help)+'</p><div class="form-actions">'+button('取消','close')+'<button type="submit" class="primary">保存演示记录</button></div></form>';
  $('#dialog').showModal();
}
function patientChoice(value){return field('patient','患者','select',value||patients()[0]?.id||'',patients().map(p=>({value:p.id,label:p.name})))}
function patientCell(id){const p=patient(id);return p?link(p.name,'/patients/'+p.id):'—'}
function timeline(id){return '<ul class="timeline">'+demo.audits.filter(a=>!id||a.patient===Number(id)).map(a=>'<li><small class="muted">'+esc(a.at)+'</small><br>'+esc(a.text)+'</li>').join('')+'</ul>'}
function tabs(items,active){return '<div class="tabs">'+items.map(([key,label,path])=>link(label,path,key===active?'active':'')).join('')+'</div>'}
function recordCard(r){return card(r.title,'<div class="row">'+tag(r.type)+tag(r.status)+'</div><div class="report">'+esc(r.text)+'</div><p>医生意见：'+esc(r.opinion||'尚未填写')+'</p>'+((account.role==='DOCTOR'&&mine(patient(r.patient)))?button(r.status==='READ'?'更新医生意见':'确认已阅 / 写意见','read-report',r.id,'primary'):'')+' '+link('打开患者档案','/patients/'+r.patient))}

function login(){
  return '<div class="login"><div class="hero"><small>HEALTH 1.8 · 可离线体验的交互原型</small><h1>每一次随访，都有下文。</h1><p>选择演示角色，查看完整页面跳转与团队交接。所有患者、报告和业务记录均为虚构。</p>'+link('查看完整页面流程','/flow','btn')+' '+link('公开系统介绍','/overview','btn')+'</div><div class="roles">'+Object.keys(roles).map(role=>card(roles[role],'<p>'+esc({MANAGER:'全院运营、分派、医护账号和医院 Mock 数据。',DOCTOR:'看报告、审核意见、查收随访结果、处置异常。',NURSE:'处理分配给自己的患者，与运营人员使用同一套执行页面。',OPERATOR:'建档、起草、提交审核、人工联系、邀约与到诊核实。',PLATFORM_ADMIN:'维护接入设置，不访问患者数据。'}[role])+'</p><label>演示账号<select id="login-'+role+'">'+demo.accounts.filter(a=>a.role===role).map(a=>'<option value="'+a.id+'"'+(!a.active?' disabled':'')+'>'+esc(a.identifier+' · '+a.name+(!a.active?'（已停用）':''))+'</option>').join('')+'</select></label>'+button('进入演示','login',role,'primary'))).join('')+'<div class="card"><h2>体验说明</h2><p>角色入口用于演示页面流程，不连接登录接口。数据在当前页面中联动；刷新或重置后恢复初始演示状态。</p>'+button('重置全部演示记录','reset')+'</div></div></div>';
}
function dashboard(doctor=false){
  const ts=tasks(),ps=patients();
  const metrics=doctor?[['待阅报告',demo.records.filter(r=>mine(patient(r.patient))&&r.status==='UNREAD').length,'/doctor/reports?status=UNREAD'],['待审核意见',ts.filter(t=>t.status==='PENDING_REVIEW').length,'/doctor/reviews'],['待查收结果',ts.filter(t=>t.status==='COMPLETED'&&!t.received).length,'/doctor/results'],['待处置异常',demo.alerts.filter(a=>mine(patient(a.patient))&&a.status==='ESCALATED').length,'/doctor/alerts']]:[['我的患者',ps.length,'/patients'],['待执行随访',ts.filter(t=>['PENDING','IN_PROGRESS','REJECTED'].includes(t.status)).length,'/followups?status=IN_PROGRESS'],['待人工联系',ts.filter(t=>t.status==='APPROVED').length,'/followups?status=APPROVED'],['待响应异常',demo.alerts.filter(a=>mine(patient(a.patient))&&a.status!=='CLOSED').length,'/alerts']];
  const queues=doctor?[['查看原报告','/doctor/reports'],['审核随访意见','/doctor/reviews'],['查收完成结果','/doctor/results'],['处置升级异常','/doctor/alerts']]:[['今日待触达','/invitations'],['超 SLA 高危','/patients?risk=高'],['今日随访','/followups'],['待再次联系','/followups?retry=1'],['明日到诊提醒','/appointments?status=BOOKED'],['7 天内待复诊','/revisits'],['待院方确认','/referrals?status=INITIATED'],['失联待确认','/alerts?kind=LOST']];
  if(doctor)metrics.unshift(['我的患者',ps.length,'/patients'],['高风险患者',ps.filter(p=>p.risk==='高').length,'/patients?risk=高']);
  return page(doctor?'医生工作台':'运营工作台',doctor?'只展示您负责患者的报告和待办。':'从队列进入清单，再进入患者或任务详情。','<div class="grid">'+metrics.map(([l,n,p])=>'<a class="card metric-link" href="#'+p+'">'+esc(l)+'<strong class="metric">'+n+'</strong><small>查看对应清单 →</small></a>').join('')+'</div>'+card('待办队列','<div class="flow">'+queues.map(([l,p])=>link(l,p)).join('')+'</div>')+card('我的患者',table(['患者','责任医生','负责人','下一步'],ps.map(p=>[patientCell(p.id),esc(person(p.doctor).name),esc(person(p.owner).name),link('查看档案与服务记录','/patients/'+p.id)])))+card('团队交接流程',journey()));
}
function journey(){return '<div class="flow">'+[['医生看报告','/doctor/reports'],['团队起草','/followups/2001'],['医生审核','/doctor/reviews'],['团队人工联系','/followups/2001'],['医生查收','/doctor/results']].map(([l,p])=>link(l,p)).join('')+'</div><p class="muted">需要对应角色才能执行各步骤。右上角“切换角色”返回演示入口；切换角色保留当前演示记录。</p>'}
function patientList(){
  const key=current.query.get('q')||'',risk=current.query.get('risk')||'',batch=current.query.get('batch')||'',all=patients();let ps=all.filter(p=>(p.name+p.id+p.department+(p.phone||'')).includes(key)&&(!risk||p.risk===risk)&&(!batch||p.batch===batch));
  const categoryValue=current.query.get('category');if(categoryValue&&categoryValue!=='ALL')ps=ps.filter(p=>p.patient_type===categoryValue||(p.patient_type==null&&demo.records.some(r=>r.patient===p.id&&r.type===({OUTPATIENT:'门诊',INPATIENT:'住院',DISCHARGED:'出院'}[categoryValue]))));
  const sourceName={HOSPITAL_MOCK:'医院 Mock',MANUAL:'人工补充',FILE_IMPORT:'文件导入'};
  const title='<div class="crumb">'+link('流程总览','/flow')+' / 患者管理</div><div class="patient-page-head"><div><h1>'+(account.role==='DOCTOR'?'我的患者':'患者中心')+'</h1><p>集中管理患者档案，连接责任医生与日常跟进人员。</p></div>'+(canOperate()?'<div class="row">'+importButton('上传患者信息','open','primary')+button('新建患者','new-patient','','primary')+'</div>':'')+'</div>';
  const metrics='<div class="patient-metrics">'+[['可见患者',all.length,'已建立健康档案'],['待评估',all.filter(p=>p.risk==='待评估').length,'等待责任医生评估'],['高风险',all.filter(p=>p.risk==='高').length,'重点跟进'],['文件导入',all.filter(p=>p.source==='FILE_IMPORT').length,'当前演示累计']].map(([l,n,d])=>'<div><span>'+l+'</span><strong>'+n+'</strong><small>'+d+'</small></div>').join('')+'</div>';
  const category=current.query.get('category')||'ALL';const categoryTabs=tabs([['ALL','全部患者','/patients'],['OUTPATIENT','门诊患者','/patients?category=OUTPATIENT'],['INPATIENT','住院患者','/patients?category=INPATIENT'],['DISCHARGED','出院患者','/patients?category=DISCHARGED']],category);
  const entry=canOperate()?'<div class="patient-import-entry"><div><h3>上传门诊、住院或出院患者名单</h3><p>Excel / CSV 上传 → 逐行校验与查重 → 分派医生和管家 → 确认建档 → 核验授权与旅程服务。</p></div>'+importButton('导入患者资料','open')+'</div>':'';
  const filters='<form data-form="search"><div class="toolbar"><input name="q" style="width:260px" aria-label="搜索患者" placeholder="搜索姓名、编号、科室或电话" value="'+esc(key)+'"><select name="risk" style="width:150px" aria-label="风险筛选"><option value="">全部风险</option>'+['高','中','低','待评估'].map(r=>'<option'+(r===risk?' selected':'')+'>'+r+'</option>').join('')+'</select><button type="submit">查询</button>'+link('重置','/patients','btn')+'</div></form>';
  return title+categoryTabs+metrics+patientImportResultCard()+entry+card('', '<div class="row between"><h2>患者清单 <small class="muted">'+ps.length+' 位</small></h2><span class="muted">虚构演示资料</span></div>'+(batch?'<div class="import-alert success">正在查看批次 '+esc(batch)+' 的新增患者　'+link('返回全部患者','/patients')+'</div>':'')+filters+table(['患者 / 编号','性别 / 年龄','科室 / 管理原因','联系电话','风险 / 阶段','责任医生 / 负责人','来源','操作'],ps.map(p=>['<strong>'+patientCell(p.id)+'</strong><br><small class="muted">#'+p.id+'</small>',esc(({MALE:'男',FEMALE:'女',UNKNOWN:'未知'}[p.gender]||'—')+' / '+(p.age??'—')),esc(p.department)+'<br><small class="muted">'+esc(p.disease)+'</small>',esc(p.phone||'—'),tag(p.risk)+'<br><small class="muted">'+(p.source==='FILE_IMPORT'?(serviceAuthorized(p.id)?'已核验并交接':'已建档待核验'):'已建档')+'</small>',esc(person(p.doctor).name)+'<br><small class="muted">'+esc(person(p.owner).name)+'</small>',importStatus(sourceName[p.source]||p.source,p.source==='FILE_IMPORT'?'success':'')+'<br><small class="muted">'+esc(p.external||'')+'</small>',link('查看档案','/patients/'+p.id)])));
}
function patientDetail(id){
  const p=patient(id);if(!mine(p))return forbidden();
  const tab=current.query.get('tab')||'records',pt=demo.tasks.filter(t=>t.patient===p.id);
  let body='';
  if(tab==='records')body=(canOperate()?'<div class="toolbar">'+button('补充虚构原报告','new-record',p.id,'primary')+'</div>':'')+(demo.records.filter(r=>r.patient===p.id).map(recordCard).join('')||card('报告','<p>暂无报告，请先补充与医院来源对应的记录。</p>'));
  if(tab==='tasks')body=taskTable(pt,account.role==='DOCTOR'?'/doctor/reviews':'/followups')+(canOperate()?'<div class="toolbar">'+button('创建关联随访','new-task',p.id,'primary')+'</div>':'');
  if(tab==='timeline')body=card('只追加的演示时间轴',timeline(p.id));
  const ledgerLink=(type,id)=>account.role==='DOCTOR'?tag('只读'):link('查看','/'+type+'/'+id);
  if(tab==='ledger')body=card('关联服务记录',table(['类型','演示记录','状态','查看'],[].concat(demo.invitations.filter(x=>x.patient===p.id).map(x=>['邀约',esc(x.note),tag(x.status),ledgerLink('invitations',x.id)]),demo.appointments.filter(x=>x.patient===p.id).map(x=>['预约到诊',esc(x.at),tag(x.status),ledgerLink('appointments',x.id)]),demo.enrollments.filter(x=>x.patient===p.id).map(x=>['服务实例',esc(x.name),tag(x.status),ledgerLink('packages',x.id)]),demo.referrals.filter(x=>x.patient===p.id).map(x=>['转诊',esc(x.direction+' · '+x.target),tag(x.status),ledgerLink('referrals',x.id)]))));
  return page(p.name+' · 健康档案',p.department+' / '+p.disease+' · '+(account.role==='DOCTOR'?'医生只读档案，可查看报告与审核任务。':'同一患者的全部服务过程在这里关联。'),'<div class="toolbar">'+link('返回患者清单','/patients','btn')+(manager()?button('调整责任医生 / 负责人','assign',p.id):'')+(canOperate()?button('创建随访','new-task',p.id,'primary')+button('登记邀约','new-invitation',p.id)+button('预约到诊','new-appointment',p.id):'')+'</div>'+card('责任分工','<div class="row">'+tag('责任医生：'+person(p.doctor).name)+tag('负责人：'+person(p.owner).name)+tag('来源：'+(p.source==='FILE_IMPORT'?'文件导入':p.source))+'</div>')+tabs([['records','报告','/patients/'+id+'?tab=records'],['tasks','随访任务','/patients/'+id+'?tab=tasks'],['ledger','服务台账','/patients/'+id+'?tab=ledger'],['timeline','沟通与审计时间轴','/patients/'+id+'?tab=timeline']],tab)+body);
}
function taskTable(ts,base='/followups'){
  return card('',table(['患者','任务 / 关联报告','状态','节点日期','操作'],ts.map(t=>[patientCell(t.patient),esc(t.title)+'<br><small class="muted">'+esc(demo.records.find(r=>r.id===t.record)?.title||'未关联报告')+'</small>',tag(t.status),esc(t.due.replace('T',' ')),link('查看 / 处理',base+'/'+t.id,'btn')])));
}
function taskList(mode='followups'){
  let ts=tasks();const status=current.query.get('status')||'';
  if(mode==='reviews')ts=ts.filter(t=>t.status==='PENDING_REVIEW');
  else if(mode==='results')ts=ts.filter(t=>t.status==='COMPLETED'&&!t.received);
  else if(status)ts=ts.filter(t=>status==='IN_PROGRESS'?['PENDING','IN_PROGRESS','REJECTED'].includes(t.status):t.status===status);
  if(current.query.has('retry'))ts=ts.filter(t=>t.nextContact);
  const title={reviews:'随访意见审核',results:'随访结果查收',followups:'随访工作台'}[mode];
  return page(title,mode==='reviews'?'责任医生对照原报告审核正文；退回需说明原因。':mode==='results'?'完成任务后进入责任医生待查收清单。':'关联原报告 → 领取 → 起草 → 医生审核 → 人工联系 → 完成 → 医生查收。','<div class="toolbar">'+(mode==='followups'?link('全部','/followups','btn')+link('待执行','/followups?status=IN_PROGRESS','btn')+link('待医生审核','/followups?status=PENDING_REVIEW','btn')+link('待人工联系','/followups?status=APPROVED','btn')+link('已完成','/followups?status=COMPLETED','btn')+(canOperate()?button('新建随访任务','new-task','','primary'):''):link('返回医生工作台','/doctor','btn'))+'</div>'+taskTable(ts,mode==='followups'?'/followups':'/doctor/'+mode));
}
function taskDetail(id,mode='followups'){
  const t=demo.tasks.find(x=>x.id===Number(id));if(!t||!mine(patient(t.patient)))return forbidden();
  const p=patient(t.patient),r=demo.records.find(x=>x.id===t.record);let actions='';
  if(canOperate()){
    if(t.status==='PENDING')actions+=button('领取任务','claim',t.id,'primary');
    if(['IN_PROGRESS','REJECTED'].includes(t.status))actions+=button('编辑随访草稿','draft',t.id,'primary')+button('提交责任医生审核','submit-review',t.id);
    if(t.status==='APPROVED')actions+=button('登记实际人工联系','contact',t.id,'primary');
    if(t.status==='CONTACTED')actions+=button('完成任务并交医生查收','complete',t.id,'primary');
  }
  if(account.role==='DOCTOR'&&t.status==='PENDING_REVIEW')actions+=button('审核通过 / 修改正文','approve',t.id,'primary')+button('退回修改','reject',t.id,'danger');
  if(account.role==='DOCTOR'&&t.status==='COMPLETED'&&!t.received)actions+=button('查收并反馈','receive',t.id,'primary');
  const contacts=(t.contacts||[]).map(c=>card(c.result==='SUCCESS'?'已核实并完成联系':'未接通 / 需要再次联系','<p>'+esc(c.at.replace('T',' '))+'</p><p>'+esc(c.note)+'</p>'+(c.next?'<p>下次联系：'+esc(c.next.replace('T',' '))+'</p>':''))).join('');
  return page(t.title,'患者 '+p.name+' · 责任医生 '+person(p.doctor).name+' · '+names[t.status],'<div class="toolbar">'+link('返回'+(mode==='reviews'?'审核清单':mode==='results'?'结果清单':'随访清单'),mode==='followups'?'/followups':'/doctor/'+mode,'btn')+link('患者详情','/patients/'+p.id,'btn')+actions+'</div>'+card('任务流程','<div class="flow">'+['PENDING','IN_PROGRESS','PENDING_REVIEW','APPROVED','CONTACTED','COMPLETED'].map(s=>'<span class="tag '+(s===t.status?'green':'')+'">'+names[s]+'</span>').join('')+'</div><p>节点日期由团队核对：'+esc(t.due.replace('T',' '))+' · 版本 '+t.version+'</p>')+'<div class="columns"><div>'+(r?recordCard(r):card('原报告','<p>尚未关联，提交审核前必须关联报告。</p>'))+card('团队起草的随访意见','<div class="report">'+esc(t.draft||'尚未起草')+'</div>'+(t.rejected?'<div class="note">退回原因：'+esc(t.rejected)+'</div>':''))+card('医生审核通过的正文','<div class="report">'+esc(t.approved||'尚未通过；暂不能联系患者。')+'</div>')+contacts+(t.received?card('医生已查收','<p>'+esc(t.feedback)+'</p>'):'')+'</div><div>'+card('沟通与审计',timeline(p.id))+'<div class="note">临床建议必须由患者的责任医生本人审核。系统不自动联系患者；联系记录仅代表团队登记的服务事实。</div></div></div>');
}
function reportList(){
  const status=current.query.get('status')||'',type=current.query.get('type')||'',rs=demo.records.filter(r=>mine(patient(r.patient))&&(!status||r.status===status)&&(!type||r.type===type));
  return page('患者报告','按阅读状态和报告类型查看自己患者的原报告。','<div class="toolbar">'+link('全部','/doctor/reports','btn')+link('待阅','/doctor/reports?status=UNREAD','btn')+link('已阅','/doctor/reports?status=READ','btn')+'</div><div class="toolbar">'+['出院','门诊','住院','手术','体检'].map(t=>link(t+'报告','/doctor/reports?status='+status+'&type='+encodeURIComponent(t),'btn')).join('')+'</div>'+card('',table(['患者','报告','类型','状态','操作'],rs.map(r=>[patientCell(r.patient),esc(r.title),tag(r.type),tag(r.status),link('查看报告','/doctor/reports/'+r.id,'btn')]))));
}
function alertList(doctor=false){
  const kind=current.query.get('kind'),rows=demo.alerts.filter(a=>mine(patient(a.patient))&&(!kind||a.kind===kind)&&(!doctor||a.kind==='CLINICAL'&&a.status==='ESCALATED'));
  return page(doctor?'医生异常处置':'异常响应','临床异常由团队核实后升级责任医生；失联类由负责人核实后关闭。',card('',table(['患者','异常','类型','状态','操作'],rows.map(a=>[patientCell(a.patient),esc(a.title),tag(a.kind==='CLINICAL'?'临床反馈':'失联'),tag(a.status),link('查看 / 处理',(doctor?'/doctor/alerts/':'/alerts/')+a.id,'btn')]))));
}
function alertDetail(id,doctor=false){
  const a=demo.alerts.find(x=>x.id===Number(id));if(!a||!mine(patient(a.patient)))return forbidden();
  const actions=a.status==='CLOSED'?'':account.role==='DOCTOR'&&a.kind==='CLINICAL'&&a.status==='ESCALATED'?button('记录处置去向与结果','dispose',a.id,'primary'):canOperate()&&a.kind==='LOST'?button('核实失联并关闭','close-lost',a.id,'primary'):canOperate()&&a.kind==='CLINICAL'&&a.status!=='ESCALATED'?button('核实并升级医生','escalate',a.id,'primary'):'';
  return page(a.title,'同一患者的异常响应与处理结果。','<div class="toolbar">'+link('返回异常清单',doctor?'/doctor/alerts':'/alerts','btn')+link('患者详情','/patients/'+a.patient,'btn')+actions+'</div>'+card('异常内容',tag(a.status)+'<p>'+esc(a.note)+'</p>'+(a.disposition?'<p>处置去向：'+esc(a.disposition)+'</p>':''))+card('审计时间轴',timeline(a.patient)));
}
function collection(type,id,titleOverride=''){
  const info={invitations:['邀约记录','登记逐轮实际联系，未联系上需记录下次计划。'],appointments:['预约到诊','预约 → 登记人工提醒 → 到院核实 → 完成，或登记未到院 / 取消。'],packages:['服务包与方案','仅记录服务签约与履约；节点日期由团队核对，不发生支付。'],referrals:['转诊台账','发起 → 接收 → 到达 → 反馈 → 关闭；没有自动向机构发送消息。']}[type];
  const key=type==='packages'?'enrollments':type,rows=demo[key].filter(x=>mine(patient(x.patient))&&(!current.query.get('status')||x.status===current.query.get('status')));
  if(id){
    const x=demo[key].find(x=>x.id===Number(id));if(!x||!mine(patient(x.patient)))return forbidden();
    const next=type==='appointments'?{BOOKED:['登记实际提醒','REMINDED'],REMINDED:['核实到院','ARRIVED'],ARRIVED:['登记完成结果','COMPLETED']}[x.status]:type==='referrals'?{INITIATED:['登记接收','ACCEPTED'],ACCEPTED:['核实到达','ARRIVED'],ARRIVED:['登记反馈','FEEDBACK'],FEEDBACK:['关闭转诊','CLOSED']}[x.status]:type==='packages'&&x.status==='待激活'?['激活服务并确认随访日期','ACTIVE']:null;
    return page(info[0]+'详情',info[1],'<div class="toolbar">'+link('返回清单','/'+type,'btn')+link('患者详情','/patients/'+x.patient+'?tab=ledger','btn')+(canOperate()&&next?button(next[0],'transition',type+':'+x.id+':'+next[1],'primary'):'')+(canOperate()&&type==='appointments'&&['BOOKED','REMINDED'].includes(x.status)?button('未到院','transition',type+':'+x.id+':NO_SHOW')+button('取消预约','transition',type+':'+x.id+':CANCELLED'):'')+(canOperate()&&type==='invitations'?button('登记下一轮邀约','new-invitation',x.patient)+button('预约到诊','new-appointment',x.patient,'primary'):'')+'</div>'+card('服务记录','<p>患者：'+patientCell(x.patient)+'</p>'+tag(x.status)+'<p>'+esc(x.name||x.direction||'')+' '+esc(x.target||'')+'</p><p>'+esc(x.at||'')+'</p><p>'+esc(x.note||'')+'</p>')+card('沟通与审计',timeline(x.patient)));
  }
  const actions={invitations:'new-invitation',appointments:'new-appointment',packages:'new-enrollment',referrals:'new-referral'};
  let extra='';
  if(type==='packages'){
    const tab=current.query.get('tab')||'enrollments';
    extra=tabs([['catalog','服务包','/packages?tab=catalog'],['plans','随访方案','/packages?tab=plans'],['enrollments','签约实例','/packages']],tab);
    if(tab==='catalog')return page(info[0],info[1],extra+card('演示服务包',table(['服务包','服务范围','下一步'],[['演示连续随访服务','报告核对、医生审核、人工随访、复诊核实',canOperate()?button('登记服务签约','new-enrollment','','primary'):tag('只读')]])));
    if(tab==='plans')return page('随访方案','方案节点只表达服务安排；个体日期与内容由团队对照原报告核对。',extra+card('演示随访节点',table(['节点','处理内容','进入'],[['首次随访','原报告核对 → 起草 → 医生审核 → 人工联系',link('查看随访任务','/followups','btn')],['复诊准备','按原记录核实预约时间与到院资料',link('复诊跟踪','/revisits','btn')]])));
  }
  return page(titleOverride||info[0],info[1],extra+'<div class="toolbar">'+(canOperate()?button('新增'+info[0],actions[type],'','primary'):'')+link('查看患者关联记录','/patients','btn')+'</div>'+card('',table(['患者','服务记录','状态','操作'],rows.map(x=>[patientCell(x.patient),esc(x.name||x.at||x.direction+' · '+x.target),tag(x.status),link('详情与下一步','/'+type+'/'+x.id,'btn')]))));
}
function legacyScreening(){
  return page('患者池','医院 Mock 或人工补充的筛查对象，人工判定后进入建档流程。','<div class="toolbar">'+(canOperate()?button('补充筛查对象','new-pool','','primary'):'')+'</div>'+card('',table(['筛查对象','来源','判定','下一步'],pool().map(x=>[esc(x.name),esc(x.source),tag(x.status),x.status==='ENROLLED'?link('查看已建档患者','/patients/'+x.patient,'btn'):canOperate()?button('判定并建档','enroll-pool',x.id,'primary'):'—'])))+'<div class="note">演示对象均为虚构。高危判定需要工作人员登记依据，没有自动医学阈值。</div>');
}
function knowledge(){
  const rows=demo.knowledge;
  return page(account.role==='DOCTOR'?'宣教审核':'宣教内容','运营主管维护草稿，医生审核后发布。SOP 是团队系统外的业务使用流程。','<div class="toolbar">'+(manager()?button('起草宣教内容','new-knowledge','','primary'):'')+'</div>'+card('',table(['标题','正文','状态','操作'],rows.map(x=>[esc(x.title),esc(x.content),tag(x.status),account.role==='DOCTOR'&&x.status==='DRAFT'?button('查看并审核发布','publish',x.id,'primary'):tag(x.status==='PUBLISHED'?'已完成医生审核':'待医生审核')]))));
}
function hospital(){
  return page('医院数据','虚构医院 Mock：预览 → 选择责任医生与负责人 → 幂等同步 → 打开导入档案。','<div class="note">真实医院接口未接通。这里演示 Mock 数据，不代表医院实际接入。</div>'+card('Mock 预览','<p>2 位虚构患者、3 份演示报告。再次同步不重复创建。</p>'+table(['医院患者号','患者','报告'],[['MOCK-IMPORT-001','虚构医院对象一','出院报告、门诊报告'],['MOCK-IMPORT-002','虚构医院对象二','体检报告']])+'<div class="toolbar">'+(manager()?button(demo.mockSynced?'再次演示同步（不重复导入）':'选择负责人并演示同步','mock-sync','','primary'):'<span class="muted">仅运营主管可以执行同步。</span>')+(demo.mockSynced?link('查看已导入患者','/patients?q=虚构医院','btn'):'')+'</div>'));
}
function accounts(){
  return page('医护账号','主管开通医生、护士与运营账号；停用的账号不能再进入演示。','<div class="toolbar">'+button('新增账号','new-account','','primary')+'</div>'+card('',table(['姓名 / 账号','角色','科室','状态','操作'],demo.accounts.map(a=>[esc(a.name)+'<br><small>'+esc(a.identifier)+'</small>',esc(roles[a.role]),esc(a.department),tag(a.active?'启用中':'已停用'),['MANAGER','PLATFORM_ADMIN'].includes(a.role)?'<span class="muted">保留账号</span>':button('重置演示密码','reset-password',a.id)+button(a.active?'停用':'启用','toggle-account',a.id,a.active?'danger':'')]))));
}
function settings(){
  const tab=current.query.get('tab')||'integrations',writable=manager(),platform=account.role==='PLATFORM_ADMIN';
  const items=[['orgs','机构','/settings?tab=orgs'],['campaigns','活动','/settings?tab=campaigns'],['sla','SLA 时限','/settings?tab=sla'],['templates','短信与话术','/settings?tab=templates'],['integrations','外部接入','/settings?tab=integrations']];
  if(platform||tab==='integrations')return page(platform?'接入设置':'外部接入','未配置的外部服务始终显示未接通。',(!platform?tabs(items,tab):'')+card('接入状态',table(['外部服务','当前状态','说明'],[['医院真实接口',tag('未接通'),'医院数据仅使用 Mock'],['企业微信 / 短信',tag('未接通'),'只登记人工服务事实'],['AI 服务',tag('未接通'),demo.integrationConfigured?'已保存演示配置，尚未真实联调':'默认关闭，模板草稿可独立使用']]))+(platform?'<div class="toolbar">'+button('保存演示接入配置','integration','','primary')+'</div>':''));
  const content={orgs:['机构网络','虚构示范医院 / 虚构社区机构'],campaigns:['运营活动','演示出院随访活动'],sla:['响应时限','运营响应与联系计划由团队维护，不属于医学阈值。'],templates:['短信与话术','模板仅供团队参考，不自动发送外部消息。']}[tab]||['运营设置',''];
  return page('运营设置','运营主管维护，运营人员与护士只读。',tabs(items,tab)+card(content[0],'<p>'+esc(demo['setting-'+tab]||content[1])+'</p>'+(writable?button('编辑'+content[0],'setting',tab,'primary'):tag('只读'))));
}
function reports(){
  if(current.path==='/reports/archives')return page('日报周报归档','归档记录仅在此演示中保存。',card('',table(['归档名称','内容','查看'],demo.archives.map(x=>[esc(x.title),esc(x.summary),link('查看归档','/reports/archives/'+x.id,'btn')]))));
  if(current.path.startsWith('/reports/archives/')){const x=demo.archives.find(x=>x.id===Number(current.path.split('/').pop()));return x?page(x.title,'演示归档，报告外发仍需人工登记。','<div class="toolbar">'+link('返回归档清单','/reports/archives','btn')+button('登记人工外发凭证','deliver',x.id)+'</div>'+card('归档正文','<p>'+esc(x.summary)+'</p><p>'+esc(x.delivery||'尚未登记人工外发')+'</p>')):notFound()}
  const ts=tasks(),completed=ts.filter(t=>t.status==='COMPLETED').length;
  return page('随访统计与复盘','数字来自当前可见的虚构演示记录；没有演示分母的指标显示 —。','<div class="grid">'+[['在管患者',patients().length],['应随访',ts.length],['已完成',completed],['完成率',ts.length?Math.round(completed/ts.length*100)+'%':'—']].map(([l,n])=>card(l,'<strong class="metric">'+n+'</strong>')).join('')+'</div>'+card('运营漏斗','<div class="flow">'+link('筛查对象 '+pool().length,'/screening')+link('患者 '+patients().length,'/patients')+link('邀约 '+demo.invitations.filter(x=>mine(patient(x.patient))).length,'/invitations')+link('预约 '+demo.appointments.filter(x=>mine(patient(x.patient))).length,'/appointments')+link('服务实例 '+demo.enrollments.filter(x=>mine(patient(x.patient))).length,'/packages')+'</div>')+card('指标口径',table(['指标','当前演示值'],[['首触率','—（没有完整统计分母）'],['有效随访率',ts.length?completed+'/'+ts.length:'—'],['按时履约率','—（需逐任务核对）'],['预约率','—'],['到院率','—'],['有效到院率','—'],['服务激活率','—'],['转诊闭环率','—'],['异常响应率','—'],['失联恢复率','—']]))+'<div class="toolbar">'+button('生成演示日报 / 周报','archive','','primary')+link('查看已归档报告','/reports/archives','btn')+'</div>');
}
function overview(publicMode=false){
  return '<div class="public">'+page(publicMode?'系统公开介绍':'系统与团队分工','HEALTH-USER 仅提供公开介绍，没有患者登录、入组、咨询、指标填报或消息功能。','<div class="hero"><h1>让出院后的服务<br>有人负责，有据可循。</h1><p>医生负责医学判断与个案审核，运营团队和护士负责执行、记录与复盘。</p></div>'+card('服务过程','<div class="flow"><span class="tag">医院报告</span><span class="tag">团队起草</span><span class="tag">责任医生审核</span><span class="tag">人工联系与记录</span><span class="tag">查收与复诊核实</span></div>')+card('三种计划模式',table(['模式','状态'],[['企业微信',tag('规划中，未接通')],['微信小程序',tag('规划中，未开放')],['Web 患者业务',tag('规划中，当前仅公开介绍')]]))+'<div class="toolbar">'+link(account?'返回当前角色工作台':'进入医护与运营演示',account?home():'/login','btn primary')+link('页面跳转流程','/flow','btn')+'</div>')+'</div>';
}
function flow(){
  const groups=[['运营人员 / 护士',4,[['工作台','/workbench'],['患者清单','/patients'],['患者报告','/patients/1001?tab=records'],['领取并起草随访','/followups/2001'],['提交医生审核','/followups?status=PENDING_REVIEW'],['人工联系与完成','/followups/2001'],['患者时间轴','/patients/1001?tab=timeline']]],['责任医生',2,[['医生工作台','/doctor'],['报告确认已阅','/doctor/reports'],['随访意见审核','/doctor/reviews'],['完成结果查收','/doctor/results'],['临床异常处置','/doctor/alerts'],['宣教审核发布','/knowledge']]],['运营主管',1,[['医院 Mock 同步','/hospital'],['筛查判定与建档','/screening'],['患者分派','/patients'],['邀约','/invitations'],['预约与到院','/appointments'],['服务激活','/packages'],['转诊闭环','/referrals'],['医护账号','/accounts'],['日报周报归档','/reports']]],['平台管理员',5,[['接入设置','/settings']]],['公开介绍',0,[['系统与三种计划模式','/public']]]];
  return page('完整页面跳转流程','页面之间可以来回跳转；切换角色保留数据，浏览器后退返回上一页。',groups.map(([l,a,steps])=>card(l,'<div class="flow">'+steps.map(([title,path])=>'<button data-action="flow-step" data-id="'+a+'|'+esc(path)+'">'+esc(title)+' →</button>').join('')+'</div>')).join('')+card('随访协作主线','<ol><li>进入运营角色，领取 #2001，关联原报告，起草并提交审核。</li><li>切换责任医生，查看原报告，通过或退回修改。</li><li>切换原运营角色，按通过正文登记实际联系；未接通留下下次计划。</li><li>接通后核实身份和报告，登记反馈，完成任务。</li><li>切换医生查收结果；打开同一患者的时间轴追溯全部操作。</li></ol><p>护士可用 #2002 体验同一套执行页面；患者与任务均按责任分工显示。</p>')+'<div class="toolbar">'+link(account?'返回工作台':'返回角色入口',account?home():'/login','btn primary')+'</div>');
}
function forbidden(){return page('当前角色无权访问','请返回自己的工作台，或从演示入口选择对应角色。','<div class="toolbar">'+link('返回我的工作台',account?home():'/login','btn primary')+button('切换角色','logout')+'</div>')}
function notFound(){return page('没有找到这个原型页面','可从流程总览进入现有页面。',link('打开完整流程','/flow','btn primary'))}
function render(){
  const raw=location.hash.slice(1)||'/login',pos=raw.indexOf('?');current={path:pos<0?raw:raw.slice(0,pos),query:new URLSearchParams(pos<0?'':raw.slice(pos+1))};
  const publicRoute=['/login','/flow','/overview','/public','/patient-demo'].includes(current.path);
  if(!account&&!publicRoute){go('/login');return}
  const allowed=publicRoute||(current.path==='/in-care'&&(canOperate()||account?.role==='DOCTOR'))||menu().some(([p])=>current.path===p||current.path.startsWith(p+'/'));
  $('#header').innerHTML='<div class="brand">博瑞康 Health<small>门诊与出院全旅程 · 诊后主动干预 · 3.4 原型 · 虚构演示数据</small></div><div class="row">'+link('患者 H5 演示','/patient-demo')+link('页面流程','/flow')+(account?'<span>'+esc(account.name+' · '+roles[account.role])+'</span>'+button('修改演示密码','password')+button('切换角色','logout'):link('角色入口','/login'))+'</div>';
  $('#nav').innerHTML=account?'<small>'+esc(roles[account.role])+'</small>'+careHubNav():link('角色入口','/login')+link('完整页面流程','/flow')+link('系统公开介绍','/public');
  let html='';
  if(!allowed)html=forbidden();
  else if(current.path==='/patient-demo')html=patientDemoPage();
  else if(current.path==='/login')html=platformEntry()+login();
  else if(current.path==='/flow')html=flow();
  else if(current.path==='/overview'||current.path==='/public')html=platformEntry()+overview(current.path==='/public');
  else if(current.path==='/workbench'||current.path==='/doctor')html=collaborationBanner()+dashboard(current.path==='/doctor');
  else if(current.path==='/journey')html=journeyPage();
  else if(current.path==='/enrollment')html=enrollmentPage();
  else if(current.path==='/in-care')html=inCarePage();
  else if(current.path==='/after-care')html=afterCarePage();
  else if(current.path==='/patients')html=patientList();
  else if(/^\/patients\/\d+$/.test(current.path))html=patientDetail(current.path.split('/').pop());
  else if(current.path==='/followups')html=taskList();
  else if(/^\/followups\/\d+$/.test(current.path))html=taskDetail(current.path.split('/').pop());
  else if(current.path==='/doctor/reports')html=reportList();
  else if(/^\/doctor\/reports\/\d+$/.test(current.path)){const r=demo.records.find(r=>r.id===Number(current.path.split('/').pop()));html=r&&mine(patient(r.patient))?page('报告详情','确认已阅和医生意见会在团队任务中显示。','<div class="toolbar">'+link('返回报告清单','/doctor/reports','btn')+'</div>'+recordCard(r)):forbidden()}
  else if(['/doctor/reviews','/doctor/results'].includes(current.path))html=taskList(current.path.split('/').pop());
  else if(/^\/doctor\/(reviews|results)\/\d+$/.test(current.path))html=taskDetail(current.path.split('/').pop(),current.path.split('/')[2]);
  else if(current.path==='/alerts'||current.path==='/doctor/alerts')html=alertList(current.path.startsWith('/doctor'));
  else if(/^\/(doctor\/)?alerts\/\d+$/.test(current.path))html=alertDetail(current.path.split('/').pop(),current.path.startsWith('/doctor'));
  else if(current.path==='/revisits')html=collection('appointments',undefined,'复诊跟踪');
  else if(/^\/(invitations|appointments|packages|referrals)(\/\d+)?$/.test(current.path))html=collection(current.path.split('/')[1],current.path.split('/')[2]);
  else if(current.path==='/data-ingestion')html=ingestionPage();
  else if(current.path==='/screening'||/^\/screening\/\d+$/.test(current.path))html=screening();
  else if(current.path==='/knowledge')html=knowledge();
  else if(current.path==='/hospital')html=hospital();
  else if(current.path==='/accounts')html=accounts();
  else if(['/ai-reports','/risk-review','/care-plans','/longitudinal','/analytics'].includes(current.path))html=platformModulePage();
  else if(current.path==='/wecom')html=wecomPage();
  else if(current.path==='/quality')html=qualityPage();
  else if(current.path==='/settings')html=settings();
  else if(current.path.startsWith('/reports'))html=reports();
  else if(current.path==='/channels')html=page('渠道管理','渠道介绍仅展示系统，不采集或绑定患者。',card('',table(['渠道','状态','打开'],demo.channels.map(c=>[esc(c.name),tag(c.active?'启用':'停用'),link('查看公开介绍','/public','btn')+button(c.active?'停用渠道':'启用渠道','toggle-channel',c.id)]))));
  else html=notFound();
  $('#main').innerHTML=html;document.title=($('#main h1')?.textContent||'角色入口')+' · Health 交互原型';window.scrollTo(0,0);
}

function requireAction(kind,id){
  if(!account){toast('请先选择演示角色。');return false}
  const clinical=['read-report','approve','reject','receive','dispose','publish'];
  if(clinical.includes(kind)){
    if(account.role!=='DOCTOR'){toast('此步骤必须由责任医生本人执行。');return false}
    let row=kind==='read-report'?demo.records.find(x=>x.id===Number(id)):kind==='dispose'?demo.alerts.find(x=>x.id===Number(id)):demo.tasks.find(x=>x.id===Number(id));
    if(kind!=='publish'&&(!row||!mine(patient(row.patient)))){toast('只能处理自己负责患者的记录。');return false}
  }else if(['new-account','toggle-account','reset-password','assign','mock-sync','new-knowledge','setting','toggle-channel'].includes(kind)){
    if(!manager()){toast('此步骤仅运营主管可以执行。');return false}
  }else if(kind==='integration'){
    if(account.role!=='PLATFORM_ADMIN'){toast('接入配置仅平台管理员可以修改。');return false}
  }else if(!['password','deliver'].includes(kind)&&!canOperate()){toast('当前角色只能查看此记录。');return false}
  return true;
}
document.addEventListener('click',event=>{
  const b=event.target.closest('[data-action]');if(!b)return;
  const action=b.dataset.action,id=b.dataset.id||'';
  if(action.startsWith('patient-import-')||action.startsWith('qa-')||action.startsWith('platform-')||action.startsWith('screen-')||action.startsWith('sheet-')||action.startsWith('ingest-')||action.startsWith('cycle-'))return;
  if(action==='close'){$('#dialog').close();return}
  if(action==='reset'){demo=structuredClone(initial);demo.accounts.forEach(a=>a.password='HealthDemo@2026!');lastPatientImport=null;account=null;go('/login');render();toast('已重置虚构演示数据。');return}
  if(action==='login'){const a=person($('#login-'+id).value);if(!a?.active){toast('该演示账号已停用。');return}account=a;go(home());return}
  if(action==='logout'){account=null;go('/login');return}
  if(action==='flow-step'){const [a,path]=id.split('|');account=Number(a)?person(a):null;if(account&&!account.active){toast('该演示账号已停用。');account=null;return}go(path);return}
  if(!requireAction(action,id))return;
  const t=demo.tasks.find(t=>t.id===Number(id)),p=patient(t?.patient||id);
  if(['claim','draft','submit-review','contact','complete'].includes(action)&&(!t||!mine(p))){toast('只能处理分配给自己的患者。');return}
  if(action==='claim'&&t.status==='PENDING'){t.status='IN_PROGRESS';t.version++;audit('领取随访任务 #'+t.id,t.patient);render();return}
  if(action==='submit-review'){
    if(!['IN_PROGRESS','REJECTED'].includes(t.status)||!t.draft?.trim()||!t.record){toast('请先保存草稿并关联原报告。');return}
    t.status='PENDING_REVIEW';t.rejected='';t.version++;audit('提交责任医生审核 #'+t.id,t.patient);render();toast('已进入责任医生待审核清单。');return;
  }
  if(action==='complete'&&t.status==='CONTACTED'){t.status='COMPLETED';t.version++;audit('完成随访并交责任医生查收 #'+t.id,t.patient);render();return}
  if(action==='toggle-account'){const a=person(id);if(['MANAGER','PLATFORM_ADMIN'].includes(a.role))return;a.active=!a.active;audit((a.active?'启用':'停用')+'演示账号 '+a.identifier);render();return}
  if(action==='toggle-channel'){const c=demo.channels.find(c=>c.id===Number(id));c.active=!c.active;audit((c.active?'启用':'停用')+'渠道 '+c.name);render();return}
  if(action==='draft'&&['IN_PROGRESS','REJECTED'].includes(t.status))modal('起草随访意见','draft',id,field('record','关联原报告','select',t.record,demo.records.filter(r=>r.patient===t.patient).map(r=>({value:r.id,label:r.title})))+field('due','人工核对的节点日期','datetime-local',t.due)+field('text','随访正文','textarea',t.draft||'请核对原医嘱执行中遇到的困难，记录需要责任医生解答的问题。'),'保存草稿后，回到任务详情提交责任医生审核。');
  if(action==='approve'&&t.status==='PENDING_REVIEW')modal('医生审核通过','approve',id,field('text','审核后用于人工联系的正文','textarea',t.draft)+field('opinion','审核意见','textarea','',[],false));
  if(action==='reject'&&t.status==='PENDING_REVIEW')modal('退回修改','reject',id,field('reason','退回原因','textarea'));
  if(action==='receive'&&t.status==='COMPLETED'&&!t.received)modal('查收随访结果','receive',id,field('feedback','医生反馈与后续安排','textarea'));
  if(action==='read-report'){const r=demo.records.find(r=>r.id===Number(id));modal('确认报告已阅 / 更新医生意见','read-report',id,field('opinion','医生意见','textarea',r.opinion,[],false))}
  if(action==='contact'&&t.status==='APPROVED'){
    if(t.reviewer!==p.doctor){toast('责任医生变更后需重新审核。');return}
    modal('登记实际人工联系','contact',id,field('result','联系结果','select','SUCCESS',[{value:'SUCCESS',label:'已接通并完成核实'},{value:'FAILED',label:'未接通 / 忙线 / 号码问题'}])+field('at','实际联系时间','datetime-local','2026-10-01T10:00')+field('note','反馈问题 / 未接通原因','textarea')+field('next','未接通时的下次联系时间','datetime-local','',[],false)+'<label class="check"><input type="checkbox" name="identity">已核实本人或授权联系人身份</label><label class="check"><input type="checkbox" name="report">已核对本任务关联报告</label>','接通时必须核实身份与报告；未接通时必须保留原因和下次联系计划。')
  }
  if(['dispose','close-lost','escalate'].includes(action)){const a=demo.alerts.find(a=>a.id===Number(id));if(!a||!mine(patient(a.patient)))return;modal(action==='dispose'?'责任医生处置':action==='escalate'?'核实并升级':'核实失联并关闭',action,id,(action==='dispose'?field('disposition','处置去向','select','门诊',['门诊','急诊','住院','继续观察','误报','其他']):'')+field('note','核实依据与处理结果','textarea'))}
  if(action==='new-patient')modal('补充患者档案','new-patient','',field('name','虚构演示姓名')+field('department','科室','text','心血管内科')+field('doctor','责任医生','select',2,demo.accounts.filter(a=>a.role==='DOCTOR'&&a.active).map(a=>({value:a.id,label:a.name})))+(manager()?field('owner','负责人','select',4,demo.accounts.filter(a=>['OPERATOR','NURSE','MANAGER'].includes(a.role)&&a.active).map(a=>({value:a.id,label:a.name}))):''),'建档后可补充虚构原报告。运营人员和护士的补充档案由本人负责。');
  if(action==='new-record'){const x=patient(id);if(!mine(x))return;modal('补充虚构原报告','new-record',id,field('type','报告类型','select','出院',['出院','门诊','住院','手术','体检'])+field('title','虚构报告标题','text','虚构补充报告')+field('text','虚构报告内容','textarea','【虚构演示报告】请由责任医生核对原记录，随访时记录患者对原报告的理解困难和复诊准备问题。'),'这里仅补充虚构报告，用于关联随访与医生核对，不上传真实患者资料。')}
  if(action==='assign'){const x=patient(id);if(!mine(x))return;modal('调整责任分工','assign',id,field('doctor','责任医生','select',x.doctor,demo.accounts.filter(a=>a.role==='DOCTOR'&&a.active).map(a=>({value:a.id,label:a.name})))+field('owner','负责人','select',x.owner,demo.accounts.filter(a=>['OPERATOR','NURSE','MANAGER'].includes(a.role)&&a.active).map(a=>({value:a.id,label:a.name}))),'更换责任医生后，尚未联系任务的旧审核自动失效，需重新提交新医生审核。')}
  if(action==='new-task')modal('新建随访任务','new-task','',patientChoice(id)+field('title','随访任务标题','text','演示随访任务')+field('due','人工确认节点日期','datetime-local','2026-10-02T10:00'),'新任务需要在详情中关联原报告，再提交医生审核。');
  if(action==='new-invitation')modal('登记实际邀约','new-invitation','',patientChoice(id)+field('result','本轮结果','select','已接通，有到院意向',['已接通，有到院意向','未接通','拒绝','待考虑'])+field('at','实际联系时间','datetime-local','2026-10-01T10:00')+field('note','沟通摘要 / 原因','textarea')+field('next','未联系上时的下次计划','datetime-local','',[],false));
  if(action==='new-appointment')modal('预约到诊','new-appointment','',patientChoice(id)+field('at','预约到院时间','datetime-local','2026-10-07T10:00')+field('note','经核对的预约安排','textarea'));
  if(action==='new-enrollment')modal('登记服务签约','new-enrollment','',patientChoice(id)+field('name','服务包','text','演示连续随访服务')+field('note','服务内容与知情同意凭证','textarea'),'仅展示服务台账，不发生支付。');
  if(action==='new-referral')modal('发起转诊台账','new-referral','',patientChoice(id)+field('direction','方向','select','上转',['上转','下转'])+field('target','目标机构','text','虚构示范医院')+field('note','原因与人工联系凭证','textarea'));
  if(action==='transition'){const [type,xid,next]=id.split(':');modal('登记下一步服务事实','transition',id,(type==='packages'?field('due','核对后的首次随访日期','datetime-local','2026-10-04T10:00'):'')+field('note',next==='ARRIVED'?'实际到院 / 到达核验证据':'结果与人工服务凭证','textarea'),'保存后更新台账，并进入详情与患者时间轴。')}
  if(action==='new-pool')modal('补充筛查对象','new-pool','',field('name','虚构对象姓名')+field('source','来源','text','MANUAL')+field('note','筛查发现','textarea'));
  if(action==='enroll-pool')modal('人工判定与建档','enroll-pool',id,field('category','人工判定','select','HIGH',[{value:'HIGH',label:'高危，建档跟进'},{value:'非高危',label:'非高危，留池记录'},{value:'作废',label:'作废'}])+field('note','判定依据','textarea')+field('doctor','高危建档时的责任医生','select',2,demo.accounts.filter(a=>a.role==='DOCTOR'&&a.active).map(a=>({value:a.id,label:a.name})),false)+(manager()?field('owner','高危建档时的负责人','select',4,demo.accounts.filter(a=>['OPERATOR','NURSE','MANAGER'].includes(a.role)&&a.active).map(a=>({value:a.id,label:a.name})),false):'')+field('due','高危建档时人工确认的首次节点日期','datetime-local','2026-10-02T10:00',[],false),'高危对象建档后进入患者详情，补充原报告，再执行首次随访。');
  if(action==='new-knowledge')modal('宣教草稿','new-knowledge','',field('title','标题')+field('content','正文','textarea'));
  if(action==='publish'){const k=demo.knowledge.find(k=>k.id===Number(id));if(k.status!=='DRAFT')return;modal('医生审核宣教内容','publish',id,field('content','审核后的正文','textarea',k.content))}
  if(action==='mock-sync')modal('虚构医院 Mock 同步','mock-sync','',field('doctor','责任医生','select',2,demo.accounts.filter(a=>a.role==='DOCTOR'&&a.active).map(a=>({value:a.id,label:a.name})))+field('owner','负责人','select',4,demo.accounts.filter(a=>['OPERATOR','NURSE','MANAGER'].includes(a.role)&&a.active).map(a=>({value:a.id,label:a.name}))));
  if(action==='new-account')modal('新增演示医护账号','new-account','',field('role','角色','select','DOCTOR',[{value:'DOCTOR',label:'医生'},{value:'NURSE',label:'护士'},{value:'OPERATOR',label:'运营人员'}])+field('name','演示姓名')+field('identifier','登录账号')+field('department','科室（医生、护士必填）','text','',[],false)+field('password','初始演示密码','password','HealthDemo@2026!'));
  if(action==='reset-password')modal('重置演示密码','reset-password',id,field('password','新的演示密码','password'));
  if(action==='password')modal('修改演示密码','password','',field('old','原演示密码','password')+field('password','新演示密码','password'),'初始演示口令为 HealthDemo@2026!；不修改任何真实账号。');
  if(action==='setting')modal('编辑运营设置','setting',id,field('content','配置内容','textarea',demo['setting-'+id]||''));
  if(action==='integration')modal('演示接入配置','integration','',field('provider','服务','select','AI',['AI','企业微信','短信'])+field('note','配置说明','textarea'),'保存演示配置后仍显示未接通，不调用外部服务。');
  if(action==='archive')modal('生成演示日报 / 周报','archive','',field('title','归档名称','text','演示运营周报')+field('summary','本次复盘摘要','textarea','当前可见患者 '+patients().length+' 位，已完成随访 '+tasks().filter(t=>t.status==='COMPLETED').length+' 项。'));
  if(action==='deliver')modal('登记报告人工外发凭证','deliver',id,field('note','人工外发方式与凭证','textarea'),'不发送邮件或企业微信消息。');
});
document.addEventListener('submit',event=>{
  const f=event.target.closest('[data-form]');if(!f)return;event.preventDefault();
  if(f.dataset.form.startsWith('screen-')||f.dataset.form.startsWith('sheet-')||f.dataset.form.startsWith('cycle-'))return;
  const action=f.dataset.form,id=f.dataset.id||'',v=Object.fromEntries(new FormData(f));Object.keys(v).forEach(k=>v[k]=v[k].trim());
  if(action==='search'){go('/patients?q='+encodeURIComponent(v.q)+'&risk='+encodeURIComponent(v.risk));return}
  if(Array.from(f.elements).some(e=>e.required&&e.name&&e.type!=='checkbox'&&!v[e.name])){toast('请填写完整内容，不能只输入空格。');return}
  if(!requireAction(action,id))return;
  const t=demo.tasks.find(t=>t.id===Number(id));let dest=current.path+(current.query.size?'?'+current.query:'');
  const nextId=rows=>Math.max(0,...rows.map(x=>x.id))+1;
  if(['draft','approve','reject','receive','contact'].includes(action)&&(!t||!mine(patient(t.patient))))return;
  if(action==='draft'){if(!['IN_PROGRESS','REJECTED'].includes(t.status))return;const r=demo.records.find(r=>r.id===Number(v.record)&&r.patient===t.patient);if(!r){toast('请选择此患者的关联报告。');return}t.record=r.id;t.due=v.due;t.draft=v.text;t.status='IN_PROGRESS';t.version++;audit('保存关联原报告的随访草稿 #'+t.id,t.patient)}
  if(action==='approve'){if(t.status!=='PENDING_REVIEW')return;t.status='APPROVED';t.approved=v.text;t.reviewer=account.id;t.reviewedAt=new Date().toLocaleString('zh-CN');demo.records.find(r=>r.id===t.record).status='READ';t.version++;audit('责任医生审核通过 #'+t.id,t.patient)}
  if(action==='reject'){if(t.status!=='PENDING_REVIEW')return;t.status='REJECTED';t.rejected=v.reason;t.approved='';t.reviewer=account.id;t.reviewedAt=new Date().toLocaleString('zh-CN');demo.records.find(r=>r.id===t.record).status='READ';t.version++;audit('责任医生退回：'+v.reason,t.patient)}
  if(action==='read-report'){const r=demo.records.find(x=>x.id===Number(id));r.status='READ';r.opinion=v.opinion;audit('确认报告已阅并保存医生意见 #'+r.id,r.patient)}
  if(action==='receive'){if(t.status!=='COMPLETED'||t.received)return;t.received=true;t.feedback=v.feedback;t.version++;audit('责任医生查收并反馈 #'+t.id,t.patient)}
  if(action==='contact'){
    if(t.status!=='APPROVED'||t.reviewer!==patient(t.patient).doctor){toast('当前任务需要责任医生重新审核。');return}
    if(v.result==='SUCCESS'&&(!v.identity||!v.report)){toast('接通时必须核实身份并对照关联报告。');return}
    if(v.result==='FAILED'&&!v.next){toast('未接通时必须填写下次联系计划。');return}
    if(v.result==='FAILED'&&v.next<=v.at){toast('下次联系时间必须晚于本次联系时间。');return}
    (t.contacts||=[]).push(v);if(v.result==='SUCCESS'){t.status='CONTACTED';delete t.nextContact}else t.nextContact=v.next;
    t.version++;audit(v.result==='SUCCESS'?'登记已核实的实际人工联系 #'+t.id:'未接通，保留原节点日期与再次联系计划 #'+t.id,t.patient);
  }
  if(['dispose','close-lost','escalate'].includes(action)){const a=demo.alerts.find(x=>x.id===Number(id));if(!a||!mine(patient(a.patient)))return;if(action==='dispose'&&(a.kind!=='CLINICAL'||a.status!=='ESCALATED'))return;if(action==='close-lost'&&a.kind!=='LOST'){toast('临床异常须由责任医生处置。');return}a.status=action==='escalate'?'ESCALATED':'CLOSED';a.note=v.note;a.disposition=v.disposition;audit(action==='dispose'?'责任医生记录异常处置结果':action==='escalate'?'核实后升级责任医生':'核实失联后关闭',a.patient)}
  if(action==='new-patient'){const p={id:nextId(demo.patients),name:v.name,department:v.department,disease:'人工补充演示档案',risk:'待核对',doctor:Number(v.doctor),owner:manager()?Number(v.owner):account.id,source:'MANUAL',external:''};demo.patients.push(p);audit('补充虚构演示档案',p.id);dest='/patients/'+p.id}
  if(action==='new-record'){const p=patient(id);if(!mine(p))return;const r={id:nextId(demo.records),patient:p.id,type:v.type,title:v.title,text:v.text,status:'UNREAD',opinion:'',source:'MANUAL'};demo.records.push(r);audit('补充虚构原报告 #'+r.id+'，等待责任医生核对',p.id);dest='/patients/'+p.id+'?tab=records'}
  if(action==='assign'){const p=patient(id);if(!mine(p))return;if(p.doctor!==Number(v.doctor))demo.tasks.filter(t=>t.patient===p.id&&!['CONTACTED','COMPLETED'].includes(t.status)).forEach(t=>{if(['APPROVED','PENDING_REVIEW'].includes(t.status))t.status='IN_PROGRESS';t.approved='';delete t.reviewer;delete t.reviewedAt;t.version++});p.doctor=Number(v.doctor);p.owner=Number(v.owner);audit('调整分派，未联系任务的旧医生审核失效',p.id)}
  if(action==='new-task'){const p=patient(v.patient);if(!mine(p))return;const t={id:nextId(demo.tasks),patient:p.id,record:null,title:v.title,status:'PENDING',due:v.due,draft:'',approved:'',version:1};demo.tasks.push(t);audit('创建随访，节点日期由团队确认',p.id);dest='/followups/'+t.id}
  if(['new-invitation','new-appointment','new-enrollment','new-referral'].includes(action)){
    if(!mine(patient(v.patient)))return;
    if(action==='new-invitation'&&v.result==='未接通'&&!v.next){toast('未接通时必须登记下次邀约计划。');return}
    const type={'new-invitation':'invitations','new-appointment':'appointments','new-enrollment':'enrollments','new-referral':'referrals'}[action],x={...v,id:nextId(demo[type]),patient:Number(v.patient),status:{'new-invitation':v.result,'new-appointment':'BOOKED','new-enrollment':'待激活','new-referral':'INITIATED'}[action]};demo[type].push(x);audit('登记'+{invitations:'实际邀约',appointments:'预约',enrollments:'服务签约',referrals:'转诊发起'}[type],x.patient);dest='/'+(type==='enrollments'?'packages':type)+'/'+x.id;
  }
  if(action==='transition'){
    const [type,xid,next]=id.split(':'),key=type==='packages'?'enrollments':type,x=demo[key].find(x=>x.id===Number(xid));if(!x||!mine(patient(x.patient)))return;
    const allowed=type==='appointments'?{BOOKED:['REMINDED','NO_SHOW','CANCELLED'],REMINDED:['ARRIVED','NO_SHOW','CANCELLED'],ARRIVED:['COMPLETED']}[x.status]:type==='referrals'?{INITIATED:['ACCEPTED'],ACCEPTED:['ARRIVED'],ARRIVED:['FEEDBACK'],FEEDBACK:['CLOSED']}[x.status]:x.status==='待激活'?['ACTIVE']:[];
    if(!allowed?.includes(next)){toast('记录状态已变化，请重新打开详情。');return}x.status=next;x.note=v.note;audit('登记服务下一步：'+(names[next]||next),x.patient);
    if(type==='packages'){const t={id:nextId(demo.tasks),patient:x.patient,record:null,title:'服务激活后的首次随访',status:'PENDING',due:v.due,draft:'',approved:'',version:1};demo.tasks.push(t);audit('确认节点日期并创建待执行随访',x.patient)}
  }
  if(action==='new-pool'){demo.pool.push({id:nextId(demo.pool),name:v.name,status:'NEW',source:v.source,note:v.note,owner:account.id});audit('补充虚构筛查对象')}
  if(action==='enroll-pool'){const x=demo.pool.find(x=>x.id===Number(id));if(!x||(!manager()&&x.owner!==account.id)||x.status==='ENROLLED')return;if(v.category==='HIGH'&&(!v.due||!demo.accounts.some(a=>a.id===Number(v.doctor)&&a.role==='DOCTOR'&&a.active))){toast('高危建档需要选择启用的责任医生并确认首次节点日期。');return}x.note=v.note;if(v.category==='HIGH'){const p={id:nextId(demo.patients),name:x.name,department:'待人工核对',disease:'筛查后待核对',risk:'高',doctor:Number(v.doctor),owner:manager()?Number(v.owner):account.id,source:x.source,external:''};demo.patients.push(p);x.status='ENROLLED';x.patient=p.id;x.owner=p.owner;demo.tasks.push({id:nextId(demo.tasks),patient:p.id,record:null,title:'筛查建档后首次联系',status:'PENDING',due:v.due,draft:'',approved:'',version:1});audit('人工判定依据：'+v.note+'；确认节点日期并建档生成待办',p.id);dest='/patients/'+p.id}else{x.status=v.category;audit('人工记录筛查判定：'+v.category)}}
  if(action==='new-knowledge'){demo.knowledge.push({...v,id:nextId(demo.knowledge),status:'DRAFT'});audit('保存宣教草稿，等待医生审核')}
  if(action==='publish'){const x=demo.knowledge.find(x=>x.id===Number(id));if(x.status!=='DRAFT')return;x.content=v.content;x.status='PUBLISHED';x.reviewer=account.id;audit('医生审核发布宣教：'+x.title)}
  if(action==='mock-sync'){
    if(!demo.mockSynced){for(let n=1;n<=2;n++){const p={id:nextId(demo.patients),name:'虚构医院对象'+n,department:'全科',disease:'待责任医生核对',risk:'待核对',doctor:Number(v.doctor),owner:Number(v.owner),source:'HOSPITAL_MOCK',external:'MOCK-IMPORT-00'+n};demo.patients.push(p);for(let j=0;j<(n===1?2:1);j++)demo.records.push({id:nextId(demo.records),patient:p.id,type:j?'门诊':n===1?'出院':'体检',title:'【虚构医院 Mock 报告】'+n+'-'+j,status:'UNREAD',text:'【虚构演示】保留医院患者号与报告来源，等待责任医生核对。',opinion:''});audit('按医院来源 ID 导入虚构患者与报告',p.id)}demo.mockSynced=true}else audit('重复 Mock 同步：新增患者 0，新增报告 0');
    dest='/patients?q=虚构医院';
  }
  if(['new-account','reset-password','password'].includes(action)){
    if(v.password.length<8||v.password.length>64){toast('演示密码长度应为 8–64 位。');return}
    if(action==='new-account'){if(!/^[A-Za-z0-9_]{3,40}$/.test(v.identifier)||demo.accounts.some(a=>a.identifier===v.identifier)){toast('账号须为 3–40 位字母、数字或下划线，且不能重复。');return}if(['DOCTOR','NURSE'].includes(v.role)&&!v.department){toast('医生、护士需要填写科室。');return}demo.accounts.push({...v,id:nextId(demo.accounts),active:true});audit('创建演示账号 '+v.identifier)}
    if(action==='reset-password'){const a=person(id);if(['MANAGER','PLATFORM_ADMIN'].includes(a.role))return;a.password=v.password;audit('重置演示账号口令 '+a.identifier)}
    if(action==='password'){if(v.old!==account.password){toast('原演示密码不正确。');return}account.password=v.password;audit('修改当前演示账号口令')}
  }
  if(action==='setting'){demo['setting-'+id]=v.content;audit('保存运营设置 '+id)}
  if(action==='integration'){demo.integrationConfigured=true;audit('保存演示接入说明，真实服务仍未接通')}
  if(action==='archive'){const x={...v,id:nextId(demo.archives)};demo.archives.push(x);audit('归档演示日报周报');dest='/reports/archives/'+x.id}
  if(action==='deliver'){if(!canOperate()){toast('此步骤仅运营角色可以登记。');return}const x=demo.archives.find(x=>x.id===Number(id));x.delivery=v.note;audit('登记报告人工外发凭证')}
  $('#dialog').close();if(location.hash==='#'+dest)render();else go(dest);toast('已保存演示记录；相关页面同步更新。');
});
window.addEventListener('hashchange',render);
if(document.body.dataset.demoEntry==='patient-import'){account=person(1);if(!location.hash)location.hash='/patients'}
render();
