'use strict';
// Six entry points, one permission-scoped collection. Clinical decisions remain in existing handlers.
const scSections=[['statistics','筛查统计'],['critical','危急预警'],['network','一张网检出'],['exam','体检检出'],['health','健康筛查'],['invitations','邀约记录']];
const scPreviousScreening=screening,scPreviousNav=careHubNav;
const scSources={ECG_NETWORK:'一张网检出',EXAM:'体检检出',HEALTH_SCREENING:'健康筛查',OUTPATIENT:'门诊检出',OTHER:'其他来源'};
const scCategories=['房颤','房扑','频发室早、室速','高度或三度房室传导阻滞','预激综合征','冠心病','心肌缺血'];
function scHtmlLink(html,path,cls=''){return '<a class="'+esc(cls)+'" href="#'+esc(path)+'">'+html+'</a>'}
const scEcgGrades={CRITICAL:'危急',WARNING:'预警',NORMAL:'普通',UNASSESSED:'待核实'};
const scEcgGuidance={CRITICAL:'即刻就医诊治；即刻报告基层医疗单位或预留联系人。',WARNING:'及时告知基层医疗单位及患者，建议尽早就医。',NORMAL:'不适随诊，结合临床，择期就医。'};
const scConsensusUrl='https://xadxyylib.yuntsg.com/ueditor/jsp/upload/file/20240322/1711075946561020247.pdf';
function scEcgBadge(x){return '<span class="sc-ecg '+esc((x.ecgGrade||'UNASSESSED').toLowerCase())+'">'+esc(scEcgGrades[x.ecgGrade]||'待核实')+'</span>'}
function scGuide(){return '<details class="sc-guideline"><summary>分级依据 · 远程心电图危险分级诊断的中国专家共识（2022）<span>查看三级标准与适用范围 ↗</span></summary><div class="sc-grade-cards">'+Object.entries(scEcgGuidance).map(([key,text])=>'<section>'+scEcgBadge({ecgGrade:key})+'<p>'+text+'</p></section>').join('')+'</div><p><strong>分级仅针对本次心电图。</strong>适用于 10 秒有效静息、12 导联及以上远程传输心电图；波形失真、远程动态和长时程实时监测不在直接适用范围。单导联或其他多导联的心律失常可参照分级，不用于心肌缺血诊断分级。AI 结果必须人工审核。</p><p>危急条目包括疑似急性冠脉综合征的相应改变、严重快速或缓慢性心律失常、特定束支阻滞及其他危急心电表现。须结合原报告及适用的症状、血流动力学、速率、持续时间等条件。未核实记录不归为普通。</p><p>新发生房扑 / 房颤列在预警条目；房颤伴心室预激且最短 RR ≤250 ms 列在危急条目。病种名称不能直接决定等级。</p><p><a href="'+scConsensusUrl+'" target="_blank" rel="noreferrer">查看共识原文 ↗</a> · 《临床心电学杂志》2022，31(6)：401–405；第 403 页表 1 与临床规范。</p></details>'}
function scSeed(){
 const state=screeningState();if(state.centerSeeded)return;state.centerSeeded=true;
 const samples=[
  ['网络演示对象01','ECG_NETWORK','房颤','RED','INTERVENE',true],['网络演示对象02','ECG_NETWORK','房扑','PENDING','REVIEW',false],
  ['网络演示对象03','ECG_NETWORK','高度或三度房室传导阻滞','RED','HANDOFF',true],['网络演示对象04','ECG_NETWORK','冠心病','RED','INTERVENE',false],
  ['体检演示对象01','EXAM','心电异常待复核','PENDING','REVIEW',false],['体检演示对象02','EXAM','房颤','RED','INTERVENE',false],
  ['体检演示对象03','EXAM','冠心病','YELLOW','BOOKED',false],['体检演示对象04','EXAM','待复查项目','BLUE','MONITOR',false],
  ['健康筛查对象01','HEALTH_SCREENING','健康问卷待评估','PENDING','REVIEW',false],['健康筛查对象02','HEALTH_SCREENING','房颤','RED','INTERVENE',false],
  ['健康筛查对象03','HEALTH_SCREENING','复查计划核对','YELLOW','INTERVENE',false],['健康筛查对象04','HEALTH_SCREENING','慢病随访评估','BLUE','MONITOR',false],
 ];
 samples.forEach(([name,sourceType,category,level,stage,critical],i)=>state.rows.push({id:5201+i,name,sourceType,category,critical,
  entry:scSources[sourceType],org:sourceType==='EXAM'?'演示体检中心':sourceType==='HEALTH_SCREENING'?'演示社区卫生服务中心':'演示心电协作医院',sourceId:'SCREEN-DEMO-'+(i+1),
  gender:i%2?'女':'男',age:48+i,phone:'0000001'+String(i+1).padStart(4,'0'),idTail:'D'+String(i+1).padStart(3,'0'),screenedAt:'2026-10-'+String(10-i%5).padStart(2,'0')+' 09:'+String(i*3).padStart(2,'0'),
  tags:[i%3===0?'重点关注':i%3===1?'待补资料':'定期回访'],group:sourceType==='EXAM'?'体检跟进组':sourceType==='HEALTH_SCREENING'?'社区筛查组':'心电协作组',ecgGrade:null,ecgScope:null,ecgEvidence:'',report:'【虚构演示报告】'+category+'；仅用于工作流程展示，具体指标与临床结论应核对医院原报告。',signal:category,suggested:level,level,stage,doctor:2,owner:i%2?3:4,
  review:level==='PENDING'?'':'【虚构医生复核记录】已登记风险与后续核实安排。',appointment:stage==='BOOKED'?'2026-10-15T09:00':'',
  handoff:stage==='HANDOFF'?'【虚构处置承接】已由演示接诊团队接收，待核实到诊。':'',logs:[]}));
 // Explicit fictional report conclusions; never derived from a disease label or patient risk.
 const examples=[
  [5201,'CRITICAL','【虚构 10 秒有效静息 12 导联报告】房颤伴心室预激，最短 RR 220 ms。演示责任医生已核实本次报告为危急。'],
  [5203,'CRITICAL','【虚构 10 秒有效静息 12 导联报告】三度房室阻滞，平均心室率 30 bpm。演示责任医生已核实本次报告为危急。'],
  [5206,'WARNING','【虚构 10 秒有效静息 12 导联报告】对比既往心电图为新发生房颤，未见危急条目，演示责任医生结合临床确认本次报告为预警。'],
  [5208,'NORMAL','【虚构 10 秒有效静息 12 导联报告】本次未发现危急及预警条目，演示责任医生结合临床确认本次报告为普通。']
 ];examples.forEach(([id,grade,report])=>{const x=state.rows.find(x=>x.id===id);x.ecgGrade=grade;x.ecgScope='REST_12_LEAD';x.ecgEvidence='演示报告 '+x.sourceId+'；演示责任医生甲；依据 2022 共识核实，仅为虚构流程样例。';x.report=report});
}
function scRecords(){
 scSeed();
 const cycle=screeningRows().map(x=>({id:x.id,name:x.name,gender:x.gender||'未填写',age:x.age,phone:x.phone||'',idTail:x.idTail||'',
  ecgGrade:x.ecgGrade||'UNASSESSED',ecgScope:x.ecgScope,ecgEvidence:x.ecgEvidence||'',source:x.sourceType||(x.entry==='体检人群'?'EXAM':x.entry==='慢病患者'?'HEALTH_SCREENING':'ECG_NETWORK'),org:x.org,
  screenedAt:x.screenedAt||'',category:x.category||'待归类',finding:x.report,risk:x.level==='PENDING'?'待复核':x.critical?'危急':({RED:'高危',YELLOW:'中危',BLUE:'低危'})[x.level],
  status:x.stage==='ENROLLED'?'已入组':x.stage==='EXCLUDED'?'已排除':x.stage==='REVIEW'?'待复核':'待跟进',stage:screeningStages[x.stage],owner:x.owner,doctor:x.doctor,
  evidence:x.review||'',handled:Boolean(x.handoff),contact:Boolean(x.contact),arrived:['ARRIVED','ENROLLED'].includes(x.stage),raw:x,kind:'cycle'}));
 const historical=sheetRows().map(x=>({id:x.id,name:x.name,gender:x.gender,age:x.age,phone:x.phone,idTail:'',source:x.centerSource||(x.localImport?'ECG_NETWORK':x.source.includes('一张网')?'ECG_NETWORK':x.source.includes('社区')?'HEALTH_SCREENING':'OUTPATIENT'),
  ecgGrade:x.ecgGrade||'UNASSESSED',ecgScope:x.ecgScope,ecgEvidence:x.ecgEvidence||'',org:x.source,screenedAt:x.importedAt||'',category:'待归类',finding:x.reportConclusion,risk:x.centerRisk||x.risk,status:'待复核',stage:'历史记录待核实',owner:x.owner,doctor:x.doctor,
  evidence:x.centerRisk!==undefined?(x.centerRiskEvidence||''):(x.doctorNote||''),handled:false,contact:false,arrived:false,raw:x,kind:'sheet'}));
 return [...cycle,...historical].map(x=>({...x,tags:x.raw.tags||[],group:x.raw.group||'',followupStatus:x.raw.followupStatus||'',followupNote:x.raw.followupNote||'',riskHistorical:x.kind==='sheet'&&!x.raw.centerRisk}));
}
function scTab(){const value=current.query.get('tab')||current.query.get('origin')||(/^\/screening\/\d+$/.test(current.path)?Number(current.path.split('/')[2])>=6101?'invitations':'network':'statistics');return value==='ledger'?'invitations':value==='high-risk'?'all':value}
function scUrl(tab,changes={},preserve=false){if(tab==='high-risk'){tab='all';changes={risk:'HIGH_RISK',...changes}}const q=preserve?new URLSearchParams(current.query):new URLSearchParams();if(q.get('tab')==='high-risk'&&!q.has('risk'))q.set('risk','HIGH_RISK');if(['invitations','handoff'].includes(tab)&&current.query.get('patient'))q.set('patient',current.query.get('patient'));q.set('tab',tab);q.delete('page');Object.entries(changes).forEach(([k,v])=>v===''||v==null?q.delete(k):q.set(k,String(v)));return '/screening?'+q}
function scFilter(rows,tab=scTab(),q=current.query){
 return rows.filter(x=>(tab!=='network'||x.source==='ECG_NETWORK')&&(tab!=='exam'||x.source==='EXAM')&&(tab!=='health'||x.source==='HEALTH_SCREENING')
  &&(tab!=='critical'||(q.get('grade')==='LEGACY'?x.risk==='危急':x.ecgGrade===(q.get('grade')||'CRITICAL')))&&(tab!=='high-risk'||['高危','危急'].includes(x.risk))
  &&(!q.get('name')||x.name.includes(q.get('name')))&&(!q.get('phone')||x.phone.includes(q.get('phone')))&&(!q.get('idTail')||x.idTail===q.get('idTail'))
  &&(!q.get('from')||x.screenedAt.slice(0,10)>=q.get('from'))&&(!q.get('to')||Boolean(x.screenedAt)&&x.screenedAt.slice(0,10)<=q.get('to'))
  &&(!(q.get('risk')||(q.get('tab')==='high-risk'?'HIGH_RISK':''))||((q.get('risk')||'HIGH_RISK')==='HIGH_RISK'?['高危','危急'].includes(x.risk):x.risk===q.get('risk')))
  &&(!q.get('tag')||x.tags.includes(q.get('tag')))&&(!q.get('group')||x.group===q.get('group'))
  &&(!q.get('review')||x.status==='待复核')&&(!q.get('status')||(x.followupStatus||x.status)===q.get('status'))&&(!q.get('category')||x.category===q.get('category'))
  &&(!q.get('family')||q.get('family')==='all'||(q.get('family')==='coronary'?['冠心病','心肌缺血'].includes(x.category):scCategories.slice(0,5).includes(x.category)))
  &&(!q.get('handling')||(q.get('handling')==='pending'?!x.handled:x.handled)));
}
function scRisk(x){return '<span class="sc-risk '+({危急:'critical',高危:'high',中危:'medium',低危:'low'})[x.risk]+'">'+esc(x.risk)+'</span>'+(x.kind==='sheet'?'<small class="sc-sub">历史分层 · 待核实</small>':'')}
function scStats(rows){return {total:rows.length,pending:rows.filter(x=>x.status==='待复核').length,high:rows.filter(x=>['高危','危急'].includes(x.risk)).length,critical:rows.filter(x=>x.ecgGrade==='CRITICAL').length,enrolled:rows.filter(x=>x.status==='已入组').length}}
function scMetric(label,value,hint,target,tone=''){return '<a class="sc-metric '+tone+'" href="#'+esc(target)+'"><span>'+label+'</span><strong>'+value+'<small>条</small></strong><p>'+hint+'<b>↗</b></p></a>'}
function scFilterForm(tab){
 const q=current.query,all=scRecords(),tags=scOptions(all,'tags'),groups=scOptions(all,'group');
 const options=(values,key,label)=>[{value:'',label},...new Set([...values,...(q.get(key)?[q.get(key)]:[])])];
 return '<form data-form="sc-filter" class="sc-filter-card">'+field('tab','','hidden',tab)+['category','family','grade','handling','review'].map(k=>field(k,'','hidden',q.get(k)||'',[],false)).join('')+
 '<div class="sc-filter-grid">'+field('name','姓名','text',q.get('name')||'',[],false)+field('phone','手机号','text',q.get('phone')||'',[],false)+field('from','检出开始日期','date',q.get('from')||'',[],false)+field('to','检出结束日期','date',q.get('to')||'',[],false)+'</div>'+
 '<div class="sc-classification-filter">'+field('tag','标签','select',q.get('tag')||'',options(tags,'tag','全部标签'),false)+field('group','分组','select',q.get('group')||'',options(groups,'group','全部分组'),false)+'<span>在列表「编辑信息」中维护标签与分组</span></div>'+
 '<details'+(['risk','status','idTail'].some(k=>q.get(k))||q.get('tab')==='high-risk'?' open':'')+'><summary>更多筛选 · 证件尾号 / 风险 / 跟进状态</summary><div class="sc-filter-grid">'+field('idTail','证件尾号','text',q.get('idTail')||'',[],false)+field('risk','风险等级','select',q.get('risk')||(q.get('tab')==='high-risk'?'HIGH_RISK':''),[{value:'',label:'全部'},{value:'HIGH_RISK',label:'高危及危急'},'危急','高危','中危','低危','待复核'],false)+field('status','跟进状态','select',q.get('status')||'',[{value:'',label:'全部'},...scFollowupStatuses,'已入组','已排除'],false)+'</div></details><div class="sc-filter-footer"><span>仅显示当前账号权限内记录</span><div class="row">'+link('重置',scUrl(tab,tab==='critical'?{grade:q.get('grade')||'CRITICAL'}:{}),'btn')+'<button type="submit" class="primary">查询</button></div></div></form>';
}
function scOverview(){const q=current.query,rows=scFilter(scRecords(),'statistics'),s=scStats(rows),range={from:q.get('from'),to:q.get('to')};
 const bar=(label,n,color)=>'<div class="sc-bar"><span>'+esc(label)+'</span><div><i style="width:'+(s.total?n/s.total*100:0)+'%;background:'+color+'"></i></div><b>'+n+'</b></div>';
 const dates=[...new Set(rows.map(x=>x.screenedAt.slice(0,10)).filter(Boolean))].sort().slice(-7),max=Math.max(1,...dates.map(d=>rows.filter(x=>x.screenedAt.startsWith(d)).length));
 return '<section class="sc-overview-heading"><div><span class="sc-eyebrow">SCREENING OVERVIEW</span><h2>发现风险，让每一位患者得到跟进</h2><p>从多源检出到主动邀约，让后续工作清晰可见。</p></div><form data-form="sc-filter" class="sc-date-filter">'+field('tab','','hidden','statistics')+field('from','检出开始日期','date',q.get('from')||'',[],false)+field('to','检出结束日期','date',q.get('to')||'',[],false)+'<button type="submit">统计</button>'+link('全部时间',scUrl('statistics'),'btn')+'</form></section>'+
 '<div class="sc-metrics">'+scMetric('筛查记录',s.total,'当前权限 · 全部来源',scUrl('all',range))+scMetric('待复核',s.pending,'核对原报告与院方结论',scUrl('all',{...range,review:'pending'}),'amber')+scMetric('高危 / 危急',s.high,'包含历史分层待核实记录',scUrl('all',{...range,risk:'HIGH_RISK'}))+scMetric('本次心电危急',s.critical,'院方已核实的本次报告',scUrl('critical',range),'red')+'</div>'+
 '<div class="sc-charts"><section class="card"><div class="sc-card-title"><h2>检出来源分布</h2><span>同一统计范围 · 条</span></div>'+Object.entries(scSources).map(([key,label])=>bar(label,rows.filter(x=>x.source===key).length,'#339569')).join('')+'</section><section class="card"><div class="sc-card-title"><h2>风险分层</h2><span>历史分层与本次复核分别标记</span></div>'+[['危急','#d2645d'],['高危','#d6a348'],['中危','#659cac'],['低危','#4e9b76'],['待复核','#aebbb5']].map(([label,color])=>bar(label,rows.filter(x=>x.risk===label).length,color)).join('')+'</section></div>'+
 '<div class="sc-charts"><section class="card"><div class="sc-card-title"><h2>最近检出趋势</h2><span>最近 7 个有记录日期 · 不含日期缺失记录</span></div><div class="sc-trend">'+(dates.length?dates.map(d=>{const n=rows.filter(x=>x.screenedAt.startsWith(d)).length;return '<div><b>'+n+'</b><i style="height:'+Math.max(4,n/max*108)+'px"></i><span>'+d.slice(5)+'</span></div>'}).join(''):'<p>暂无带检出日期的记录</p>')+'</div></section><section class="card"><div class="sc-card-title"><h2>优先跟进</h2><span>明确下一步</span></div><div class="sc-todo">'+scHtmlLink('<b class="sc-dot red"></b><div><strong>危急风险核实</strong><small>确认院方判断、处理与承接结果</small></div><em>'+s.critical+'</em> →',scUrl('critical',range))+scHtmlLink('<b class="sc-dot amber"></b><div><strong>筛查资料复核</strong><small>补齐来源与报告，确认风险分层</small></div><em>'+s.pending+'</em> →',scUrl('all',{...range,review:'pending'}))+scHtmlLink('<b class="sc-dot green"></b><div><strong>回访邀约跟进</strong><small>查看两轮沟通、到诊和下次计划</small></div> →',scUrl('invitations'))+'</div></section></div>'+
 '<div class="sc-footnote">按筛查记录计数，不等于去重患者人数。历史台账不自动计为本系统已入组或已有效触达；日期缺失记录仅计入“全部时间”。全部数据为离线演示。</div>';
}
function scCategoriesPanel(){const q=current.query,f=q.get('family')||'all',selected=q.get('category')||'',base=new URLSearchParams(q);base.delete('category');base.delete('family');base.delete('page');const rows=scFilter(scRecords(),'network',base),items=f==='coronary'?scCategories.slice(5):f==='arrhythmia'?scCategories.slice(0,5):scCategories;
 return '<aside class="sc-categories"><div class="sc-family">'+[['all','全部'],['arrhythmia','心律失常'],['coronary','冠心病']].map(([key,label])=>link(label,scUrl('network',{family:key,category:''},true),f===key?'selected':'')).join('')+'</div>'+scHtmlLink('<span>全部分类</span><b>'+rows.filter(x=>f==='all'||(f==='coronary'?scCategories.slice(5):scCategories.slice(0,5)).includes(x.category)).length+'</b>',scUrl('network',{category:''},true),!selected?'selected':'')+items.map(c=>scHtmlLink('<span>'+c+'</span><b>'+rows.filter(x=>x.category===c).length+'</b>',scUrl('network',{category:c},true),selected===c?'selected':'')).join('')+(f==='all'?scHtmlLink('<span>待归类</span><b>'+rows.filter(x=>x.category==='待归类').length+'</b>',scUrl('network',{category:'待归类'},true),selected==='待归类'?'selected':''):'')+'<p>分类来自已登记项目；不依据关键词自动作医学判断。</p></aside>';
}
function scList(tab){const rows=scFilter(scRecords(),tab),size=[10,20,50].includes(Number(current.query.get('size')))?Number(current.query.get('size')):10,pages=Math.max(1,Math.ceil(rows.length/size)),pageNo=Math.max(1,Math.min(pages,Number(current.query.get('page'))||1));const title=scSections.find(([key])=>key===tab)?.[1]||'全部筛查记录';
 const grade=current.query.get('grade')||'CRITICAL';const guidance=scEcgGuidance[grade]||(grade==='LEGACY'?'历史或其他危急风险仍需核实与跟进，不能自动转换为本次报告分级。':'核对原报告、适用范围与院方结论；未核实记录不按普通处理。');
 let before=scGuide();if(tab==='critical')before+='<div class="sc-alert '+grade.toLowerCase()+'"><span class="sc-alert-icon">!</span><div><strong>'+esc(guidance)+'</strong><p>按 2022 共识显示本次报告分级；患者风险与报告分级分别记录。已通知、已承接与已到诊分别留痕。</p></div>'+link('待核实 / 待承接',scUrl(tab,{handling:'pending'},true),'btn')+link('已登记承接',scUrl(tab,{handling:'handled'},true),'btn')+'</div>';
 if(tab==='critical')before+=tabs([['CRITICAL','危急心电图',scUrl(tab,{grade:'CRITICAL'},true)],['WARNING','预警心电图',scUrl(tab,{grade:'WARNING'},true)],['NORMAL','普通心电图',scUrl(tab,{grade:'NORMAL'},true)],['UNASSESSED','待核实分级',scUrl(tab,{grade:'UNASSESSED'},true)],['LEGACY','历史 / 其他危急风险',scUrl(tab,{grade:'LEGACY'},true)]],current.query.get('grade')||'CRITICAL');
 const list='<section class="card sc-table-card"><div class="sc-list-heading"><div><h2>'+title+'</h2><span>共 <b>'+rows.length+'</b> 条筛查记录</span></div><div class="row">'+button('导出筛选结果','sc-export',tab)+(canOperate()?button(tab==='exam'?'导入体检数据':tab==='health'?'导入健康筛查': '导入筛查数据','sc-import',tab,'primary'):'')+'</div></div>'+table(['患者信息','检出来源 / 时间','检查结论 / 分类','本次心电图 / 患者风险','责任人员','操作'],rows.slice((pageNo-1)*size,pageNo*size).map(x=>[
 '<button type="button" class="sc-name" data-action="sc-detail" data-id="'+x.id+'">'+esc(x.name)+'</button><small class="sc-sub">'+esc(x.gender)+' · '+(x.age==null?'年龄待补充':esc(x.age)+' 岁')+'</small><small class="sc-sub sc-phone">'+esc(x.phone||'手机号待补充')+'</small>'+scClassification(x),
 '<span>'+esc(x.org||scSources[x.source])+'</span><small class="sc-sub">'+esc(x.screenedAt||'检出时间待补充')+'</small>',
 '<div class="sc-finding" title="'+esc(x.finding)+'">'+esc(x.finding)+'</div><small class="sc-sub">'+esc(x.category)+'</small>',
 scEcgBadge(x)+'<small class="sc-sub">患者风险：'+esc(x.risk)+(x.riskHistorical?'（历史）':'')+'</small>'+scProgress(x),esc(person(x.owner)?.name||'待分配')+'<small class="sc-sub">医生 '+esc(person(x.doctor)?.name||'待分配')+'</small>',
 '<div class="sc-row-actions">'+button('详情','sc-detail',x.id)+button('编辑信息','sc-edit',x.id)+link(x.kind==='sheet'?'回访跟进':'查看与处理','/screening/'+x.id+'?origin='+tab,'btn')+'</div>'
 ]))+(rows.length?'':'<div class="sc-empty"><strong>暂无符合条件的记录</strong><p>请调整筛选条件，或导入该来源的筛查名单。</p>'+link('清除筛选',scUrl(tab),'btn')+'</div>')+
 '<div class="sc-pagination"><span>第 '+pageNo+' / '+pages+' 页 · 共 '+rows.length+' 条</span><div class="row">'+(pageNo>1?link('上一页',scUrl(tab,{page:pageNo-1},true),'btn'):'<button disabled>上一页</button>')+'<span class="sc-page-number">'+pageNo+'</span>'+(pageNo<pages?link('下一页',scUrl(tab,{page:pageNo+1},true),'btn'):'<button disabled>下一页</button>')+'<label class="sr-only" for="sc-size">每页条数</label><select id="sc-size" data-sc-size>'+[10,20,50].map(n=>'<option value="'+n+'"'+(n===size?' selected':'')+'>'+n+' 条 / 页</option>').join('')+'</select></div></div></section>';
 return before+scFilterForm(tab)+(tab==='network'?'<div class="sc-network">'+scCategoriesPanel()+list+'</div>':list);
}
function scDetail(id){const x=scRecords().find(x=>x.id===Number(id));if(!x)return toast('无权查看该对象。');
 $('#dialog').classList.add('sc-detail-dialog');$('#dialog-content').innerHTML='<div class="sc-detail-heading"><div><span class="sc-eyebrow">SCREENING RECORD</span><h2>'+esc(x.name)+'</h2><p>'+esc(x.gender)+' · '+esc(x.age??'未知')+' 岁 · '+esc(x.phone||'电话待补充')+'</p></div>'+button('关闭','sc-close')+'</div><div class="row">'+scEcgBadge(x)+'<small class="sc-sub">患者风险：'+esc(x.risk)+(x.riskHistorical?'（历史）':'')+'</small>'+tag(x.status)+'</div>'+table(['记录字段','详情'],[['检出来源',scSources[x.source]],['检出机构',x.org],['检出时间',x.screenedAt||'待补充'],['证件尾号',x.idTail||'未留存'],['本次心电图分级',scEcgGrades[x.ecgGrade]],['本次报告分级依据',x.ecgEvidence||'待核实'],['临床就医指导',scEcgGuidance[x.ecgGrade]||'核对原报告后由医生确认，不按普通处理'],['检查项目 / 分类',x.category],['标签',x.tags.join('、')||'未设置'],['分组',x.group||'未分组'],['跟进状态',x.followupStatus||x.status],['进度说明',x.followupNote||'未填写'],['业务阶段',x.stage],['执行负责人',person(x.owner)?.name],['责任医生',person(x.doctor)?.name],['判定依据',x.evidence||'待责任医生核实'],['承接状态',x.handled?'已记录承接，仍需核实到诊':'尚未登记承接']].map(([k,v])=>[k,esc(v||'—')]))+scEditHistory(x)+'<h3 class="sc-detail-report-title">原报告 / 健康指标</h3><div class="report">'+esc(x.finding)+'</div><div class="form-actions">'+button('关闭','sc-close')+button('编辑信息','sc-edit',x.id,'primary')+(account.role==='DOCTOR'&&account.id===x.doctor?button('本人确认本次报告分级','sc-grade',x.id,'primary'):'')+link('进入完整档案','/screening/'+x.id+'?origin='+scTab(),'btn primary')+'</div>';$('#dialog').showModal();
}
function scGrade(id,values){const x=scRecords().find(x=>x.id===Number(id));if(!x||account.role!=='DOCTOR'||account.id!==x.doctor)return toast('仅责任医生本人可确认本次报告分级。');
 if(!values)return modal('本人核对本次心电图危险分级','sc-grade',id,field('grade','本次报告分级','select',x.ecgGrade==='UNASSESSED'?'':x.ecgGrade,[{value:'',label:'请选择'},...['CRITICAL','WARNING','NORMAL'].map(value=>({value,label:scEcgGrades[value]}))])+field('scope','适用范围','select',x.ecgScope||'',[{value:'',label:'请选择并核实'},{value:'REST_12_LEAD',label:'10 秒有效静息、12 导联及以上远程心电图'},{value:'ARRHYTHMIA_REFERENCE',label:'其他导联仅心律失常参照，不用于心肌缺血分级'}])+field('evidence','报告编号与本次分级依据','textarea',x.ecgEvidence), '核对采样质量、导联、适用的症状和心电条件；本次分级不会自动改写患者整体风险。');
 if(!['CRITICAL','WARNING','NORMAL'].includes(values.grade)||!['REST_12_LEAD','ARRHYTHMIA_REFERENCE'].includes(values.scope)||!values.evidence?.trim())return toast('请选择分级、适用范围并填写本次报告依据。');
 x.raw.ecgGrade=values.grade;x.raw.ecgScope=values.scope;x.raw.ecgEvidence=values.evidence;x.raw.ecgReviewedBy=account.id;x.raw.ecgReviewedAt=new Date().toISOString();
 if(x.kind==='cycle')screeningLog(x.raw,'本次心电图分级：'+scEcgGrades[values.grade]+'；'+values.evidence);else sheetState().logs.push({at:new Date().toISOString(),id:x.id,section:'ecg-grade',by:account.name,text:values.evidence,grade:values.grade});
 $('#dialog').close();render();toast('已记录医生本次分级；患者整体风险与原表历史分层保持独立。');
}
function scCsv(rows){const cell=v=>{const s=String(v??'');return '"'+(/^[=+@\-\t\r]/.test(s)?"'"+s:s).replaceAll('"','""')+'"'};return '\ufeff'+[['姓名','性别','年龄','手机号','证件尾号','检出来源','机构','检出时间','分类','患者风险','本次心电图分级','分级依据','状态','检查结论','标签','分组','跟进状态','进度说明','业务阶段','执行负责人','责任医生'],...rows.map(x=>[x.name,x.gender,x.age,x.phone,x.idTail,scSources[x.source],x.org,x.screenedAt,x.category,x.risk,scEcgGrades[x.ecgGrade],x.ecgEvidence,x.status,x.finding,(x.tags||[]).join('、'),x.group,x.followupStatus||x.status,x.followupNote,x.stage,person(x.owner)?.name,person(x.doctor)?.name])].map(row=>row.map(cell).join(',')).join('\r\n')}
function scExport(tab){const rows=scFilter(scRecords(),tab);if(!rows.length)return toast('当前没有可导出的记录。');const url=URL.createObjectURL(new Blob([scCsv(rows)],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=(scSections.find(([key])=>key===tab)?.[1]||'筛查记录')+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('已导出当前筛选的 '+rows.length+' 条记录。')}
function scImport(tab){if(!canOperate())return toast('仅执行角色可导入。');modal('导入'+(tab==='exam'?'体检':tab==='health'?'健康筛查':'一张网')+'数据','sc-import',tab,
 field('rows','粘贴名单（每行：姓名，性别，年龄，电话，检查结论）','textarea')+field('org','检出机构')+field('date','检出时间','datetime-local','2026-10-10T09:00'), '此处可导入小批量演示数据，最多 100 行；缺失电话可保留待补充。Excel 文件可使用医院数据 → 数据接入测试。导入后统一待医生复核。');}
function scSaveImport(tab,v){if(!canOperate())return toast('无操作权限。');const source=tab==='exam'?'EXAM':tab==='health'?'HEALTH_SCREENING':'ECG_NETWORK',lines=v.rows.split(/\r?\n/).filter(x=>x.trim());if(!lines.length||lines.length>100)return toast('请输入 1–100 行记录。');if(!v.org||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v.date)||Number.isNaN(Date.parse(v.date)))return toast('请填写机构与有效检出时间。');const records=[];
 for(let i=0;i<lines.length;i++){const cells=lines[i].split(/\t|,|，/).map(x=>x.trim());const [name,gender,age,phone,...finding]=cells;const report=finding.join('，');if(!name||!['男','女','未知'].includes(gender)||!/^\d{1,3}$/.test(age)||Number(age)>130||!report)return toast('第 '+(i+1)+' 行格式不完整：请核对姓名、性别、年龄和检查结论。');records.push({name,gender,age:Number(age),phone,report});}
 const state=screeningState();let added=0;records.forEach(x=>{const key=[source,v.org,v.date,x.name,x.phone,x.report].join('|');if(state.rows.some(r=>r.importKey===key))return;const id=Math.max(5300,...state.rows.map(r=>r.id))+1;state.rows.push({...x,id,importKey:key,sourceType:source,entry:scSources[source],org:v.org,sourceId:'LOCAL-'+id,screenedAt:v.date.replace('T',' '),category:'待归类',signal:'新检查待医生复核',suggested:'PENDING',level:'PENDING',stage:'REVIEW',doctor:2,owner:account.id,logs:[{at:new Date().toLocaleString('zh-CN'),text:account.name+'：本地导入，待医生复核'}]});added++});$('#dialog').close();go(scUrl(tab));render();toast('导入 '+added+' 条，重复跳过 '+(records.length-added)+' 条；仅保存当前页面。');}
function scInvitations(){const view=current.query.get('view')||(current.query.get('patient')?'records':'ledger');const nav=tabs([['ledger','回访邀约跟踪表',scUrl('invitations')],['records','逐轮邀约记录',scUrl('invitations',{view:'records'})],['appointments','预约与到诊',scUrl('invitations',{view:'appointments'})],['handoff','到诊后交接',scUrl('handoff')]],view);return nav+(view==='ledger'?screeningSheetLedger():view==='appointments'?serviceLegacyTab('appointments'):serviceLegacyTab('invitations'));}
screening=function(){
 if(!serviceRouteAllowed(current.path)||!servicePatientValid())return forbidden();
 if(/^\/screening\/\d+$/.test(current.path))return scPreviousScreening();
 const tab=scTab();if(!scSections.some(([key])=>key===tab)&&tab!=='all')return scPreviousScreening();
 const nav='<nav class="sc-mobile-nav" aria-label="筛查子目录">'+scSections.map(([key,label])=>link(label,scUrl(key),key===tab?'active':'')).join('')+'</nav>';
 const body=tab==='statistics'?scOverview():tab==='invitations'?scInvitations():scList(tab);
 return page('诊前高危患者筛查中心','多源筛查 · 风险核实 · 主动邀约 · 持续跟进','<div class="sc-center">'+nav+body+'</div>');
};
careHubNav=function(){if(serviceNavParent(current.path)!=='/screening')return scPreviousNav();return menu().map(([path,label])=>link(label,path,path==='/screening'?'active':'')+(path==='/screening'?'<nav class="sc-subnav" aria-label="筛查中心目录">'+scSections.map(([key,title])=>scHtmlLink('<span>'+title+'</span>'+(key==='critical'?'<b>'+scFilter(scRecords(),key,new URLSearchParams()).length+'</b>':''),scUrl(key),scTab()===key?'selected':'')).join('')+'</nav>':'')).join('')};
document.addEventListener('click',event=>{const b=event.target.closest('[data-action^="sc-"]');if(!b)return;const {action,id}=b.dataset;if(action==='sc-detail')scDetail(id);if(action==='sc-edit')scEdit(id);if(action==='sc-grade')scGrade(id);if(action==='sc-export')scExport(id);if(action==='sc-import')scImport(id);if(action==='sc-close'){$('#dialog').close();$('#dialog').classList.remove('sc-detail-dialog')}});
document.addEventListener('click',event=>{if(event.target.closest('#dialog a')){$('#dialog').close();$('#dialog').classList.remove('sc-detail-dialog')}});
document.addEventListener('submit',event=>{const form=event.target.closest('[data-form^="sc-"]');if(!form)return;event.preventDefault();event.stopImmediatePropagation();const v=Object.fromEntries(new FormData(form));Object.keys(v).forEach(k=>v[k]=String(v[k]).trim());if(form.dataset.form==='sc-edit')return scSaveEdit(form.dataset.id,v);if(form.dataset.form==='sc-import')return scSaveImport(form.dataset.id,v);if(form.dataset.form==='sc-grade')return scGrade(form.dataset.id,v);if(v.from&&v.to&&v.from>v.to)return toast('开始日期不能晚于结束日期。');const tab=v.tab;delete v.tab;go(scUrl(tab,v));},true);
document.addEventListener('change',event=>{if(event.target.matches('[data-sc-size]'))go(scUrl(scTab(),{size:event.target.value},true))});
const scFollowupStatuses=['待复核','待跟进','跟进中','跟进完成','暂缓跟进'];
function scOptions(rows,key){return [...new Set(rows.flatMap(x=>Array.isArray(x[key])?x[key]:x[key]?[x[key]]:[]))].sort((a,b)=>a.localeCompare(b,'zh-CN'))}
function scClassification(x){return '<div class="sc-labels">'+x.tags.map(t=>'<span class="sc-label">'+esc(t)+'</span>').join('')+'</div><small class="sc-sub">分组：'+esc(x.group||'未分组')+'</small>'}
function scProgress(x){return '<div class="sc-progress">'+tag(x.followupStatus||x.status)+'<small class="sc-sub">'+esc(x.stage)+'</small>'+(x.followupNote?'<p class="sc-progress-note">'+esc(x.followupNote)+'</p>':'')+'</div>'}
function scEditSnapshot(x){return {tags:[...x.tags],group:x.group,followupStatus:x.followupStatus,followupNote:x.followupNote,owner:x.owner,doctor:x.doctor,ecgGrade:x.ecgGrade,ecgScope:x.ecgScope||'',ecgEvidence:x.ecgEvidence,risk:x.risk,evidence:x.evidence}}
function scEditHistory(x){const entries=x.raw.centerEdits||[];return entries.length?'<details class="sc-edit-history"><summary>信息修改记录 · '+entries.length+' 次</summary><ol>'+entries.slice().reverse().map(e=>'<li><strong>'+esc(e.by)+'</strong><small>'+esc(e.at)+'</small><p>'+esc(e.reason)+'</p><ul>'+e.changes.map(t=>'<li>'+esc(t)+'</li>').join('')+'</ul></li>').join('')+'</ol></details>':''}
function scEdit(id){
 const x=scRecords().find(x=>x.id===Number(id));if(!x)return toast('无权编辑该对象。');
 const clinical=account.role==='DOCTOR'&&account.id===x.doctor;
 if(!canOperate()&&!clinical)return toast('无编辑权限。');
 const list=(name,items)=>'<datalist id="'+name+'">'+items.map(v=>'<option value="'+esc(v)+'"></option>').join('')+'</datalist>';
 const group='<label>分组<input name="group" list="sc-group-options" maxlength="40" value="'+esc(x.group)+'" placeholder="选择已有分组，或输入新分组" autocomplete="off"></label>'+list('sc-group-options',scOptions(scRecords(),'group'));
 const assignment=manager()&&x.raw.stage!=='ENROLLED'?field('owner','执行负责人','select',x.owner,demo.accounts.filter(a=>a.active&&['MANAGER','OPERATOR','NURSE'].includes(a.role)).map(a=>({value:a.id,label:a.name})))+field('doctor','责任医生','select',x.doctor,demo.accounts.filter(a=>a.active&&a.role==='DOCTOR').map(a=>({value:a.id,label:a.name}))):'<div class="sc-readonly"><span>执行负责人</span><strong>'+esc(person(x.owner)?.name||'待分配')+'</strong></div><div class="sc-readonly"><span>责任医生</span><strong>'+esc(person(x.doctor)?.name||'待分配')+'</strong></div>';
 const clinicalFields=clinical?field('ecgGrade','本次心电图分级','select',x.ecgGrade,Object.entries(scEcgGrades).map(([value,label])=>({value,label})))+field('risk','患者风险','select',x.risk,['待复核','危急','高危','中危','低危'])+field('ecgScope','本次报告适用范围','select',x.ecgScope||'',[{value:'',label:'待核实'},{value:'REST_12_LEAD',label:'10 秒有效静息、12 导联及以上远程心电图'},{value:'ARRHYTHMIA_REFERENCE',label:'其他导联仅心律失常参照'}],false)+field('ecgEvidence','报告编号与分级依据','textarea',x.ecgEvidence,[],false)+field('riskEvidence','患者风险复核依据','textarea',x.evidence,[],false):'<div class="sc-clinical-readonly">'+scEcgBadge(x)+'<span>患者风险：'+esc(x.risk)+'</span><p>由责任医生本人登录后编辑分级与风险，并记录依据。</p></div>';
 $('#dialog').classList.remove('sc-detail-dialog');$('#dialog').classList.add('sc-edit-dialog');
 $('#dialog-content').innerHTML='<div class="sc-detail-heading"><div><span class="sc-eyebrow">编辑筛查信息</span><h2>'+esc(x.name)+'</h2><p>'+esc(scSources[x.source])+' · '+esc(x.org)+'</p></div>'+button('关闭','sc-close')+'</div><form data-form="sc-edit" data-id="'+x.id+'">'+
 '<section class="sc-edit-section"><h3>标签与分组</h3><div class="form-grid">'+field('tags','标签（多个标签用逗号分隔）','text',x.tags.join('，'),[],false).replace('maxlength="200"','maxlength="260"')+group+'</div><p class="sc-help">支持自定义标签，最多 10 个、每个 24 字；分组可留空。</p></section>'+
 '<section class="sc-edit-section"><h3>跟进信息</h3><div class="form-grid">'+field('followupStatus','跟进状态','select',x.followupStatus,[{value:'',label:'跟随业务阶段（当前：'+x.status+'）'},...scFollowupStatuses],false)+field('followupNote','进度说明 / 下一步安排','textarea',x.followupNote,[],false)+'</div><p class="sc-help">业务阶段：'+esc(x.stage)+'。到诊、承接和入组通过「查看与处理」登记。</p></section>'+
 '<section class="sc-edit-section"><h3>责任人员</h3><div class="form-grid">'+assignment+'</div>'+(manager()?'<p class="sc-help">更换责任医生后，医学分级与风险需由新责任医生重新核实；入组后的分派在患者档案处理。</p>':'')+'</section>'+
 '<section class="sc-edit-section"><h3>本次心电图 / 患者风险</h3><div class="form-grid">'+clinicalFields+'</div></section>'+
 '<section class="sc-edit-section">'+field('reason','修改说明','textarea','',[],true)+'</section><p class="sc-help">仅保存当前页面演示，刷新后恢复；修改记录可在详情中查看。</p><div class="form-actions">'+button('取消','sc-close')+'<button type="submit" class="primary">保存修改</button></div></form>';
 $('#dialog').showModal();
}
function scSaveEdit(id,values){
 const x=scRecords().find(x=>x.id===Number(id));if(!x)return toast('无权编辑该对象。');
 const clinical=account.role==='DOCTOR'&&account.id===x.doctor;
 if(!canOperate()&&!clinical)return toast('无编辑权限。');
 const v=Object.fromEntries(Object.entries(values).map(([k,val])=>[k,String(val??'').trim()]));
 if(!v.reason||v.reason.length>1000)return toast('请填写修改说明，最多 1000 字。');
 const tags=[...new Set((v.tags||'').split(/[,，、;；\n]/).map(t=>t.trim()).filter(Boolean))],group=v.group||'',status=v.followupStatus||'',note=v.followupNote||'';
 if(tags.length>10||tags.some(t=>t.length>24)||group.length>40||note.length>1000)return toast('标签最多 10 个且每个 24 字，分组最多 40 字，进度说明最多 1000 字。');
 if(status&&!scFollowupStatuses.includes(status))return toast('请选择有效的跟进状态。');
 const owner=v.owner===undefined?x.owner:Number(v.owner),doctor=v.doctor===undefined?x.doctor:Number(v.doctor),reassigned=doctor!==x.doctor;
 if((owner!==x.owner||reassigned)&&(!manager()||x.raw.stage==='ENROLLED'))return toast('仅运营主管可在入组前调整责任人员。');
 if(!person(owner)?.active||!['MANAGER','NURSE','OPERATOR'].includes(person(owner)?.role)||!person(doctor)?.active||person(doctor)?.role!=='DOCTOR')return toast('请选择有效的执行负责人和责任医生。');
 const grade=v.ecgGrade??x.ecgGrade,risk=v.risk??x.risk,scope=v.ecgScope??x.ecgScope??'',ecgEvidence=v.ecgEvidence??x.ecgEvidence,riskEvidence=v.riskEvidence??x.evidence;
 const gradeChanged=grade!==x.ecgGrade||scope!==(x.ecgScope||'')||ecgEvidence!==x.ecgEvidence,riskChanged=risk!==x.risk||riskEvidence!==(x.evidence);
 if((gradeChanged||riskChanged)&&!clinical)return toast('仅责任医生本人可修改本次分级与患者风险。');
 if(!Object.hasOwn(scEcgGrades,grade)||!['待复核','危急','高危','中危','低危'].includes(risk))return toast('请选择有效的分级与风险。');
 if(gradeChanged&&grade!=='UNASSESSED'&&(!['REST_12_LEAD','ARRHYTHMIA_REFERENCE'].includes(scope)||!ecgEvidence))return toast('请核实报告适用范围，并填写报告编号与分级依据。');
 if(riskChanged&&risk!=='待复核'&&!riskEvidence)return toast('请填写患者风险复核依据。');
 if(ecgEvidence.length>4000||riskEvidence.length>4000)return toast('医学依据最多 4000 字。');
 const before=scEditSnapshot(x),raw=x.raw,at=new Date().toISOString();
 Object.assign(raw,{tags,group,followupStatus:status,followupNote:note,owner,doctor});
 if(gradeChanged)Object.assign(raw,{ecgGrade:grade,ecgScope:grade==='UNASSESSED'?null:scope,ecgEvidence:grade==='UNASSESSED'?'':ecgEvidence,ecgReviewedBy:account.id,ecgReviewedAt:at});
 if(riskChanged){
  if(x.kind==='sheet')raw.centerRisk=risk;
  else {raw.level=({危急:'RED',高危:'RED',中危:'YELLOW',低危:'BLUE',待复核:'PENDING'})[risk];raw.critical=risk==='危急';raw.review=risk==='待复核'?'':riskEvidence;if(!['ENROLLED','EXCLUDED'].includes(raw.stage)&&(raw.stage==='REVIEW'||risk==='待复核'))raw.stage=risk==='待复核'?'REVIEW':risk==='低危'?'MONITOR':'INTERVENE'}
  raw.centerRiskEvidence=risk==='待复核'?'':riskEvidence;raw.centerRiskReviewedBy=account.id;raw.centerRiskReviewedAt=at;
 }
 if(reassigned){
  Object.assign(raw,{ecgGrade:null,ecgScope:null,ecgEvidence:'',ecgReviewedBy:null,ecgReviewedAt:null,centerRiskEvidence:'',centerRiskReviewedBy:null,centerRiskReviewedAt:null});
  if(x.kind==='sheet')raw.centerRisk='待复核';else Object.assign(raw,{level:'PENDING',critical:false,review:'',stage:'REVIEW'});
 }
 const updated=scRecords().find(r=>r.id===x.id),after=scEditSnapshot(updated),labels={tags:'标签',group:'分组',followupStatus:'跟进状态',followupNote:'进度说明',owner:'执行负责人',doctor:'责任医生',ecgGrade:'本次心电图',ecgScope:'适用范围',ecgEvidence:'分级依据',risk:'患者风险',evidence:'风险依据'};
 const display=(key,value)=>key==='owner'||key==='doctor'?person(value)?.name||'待分配':key==='ecgGrade'?scEcgGrades[value]:Array.isArray(value)?value.join('、')||'未设置':value||'未填写';
 const changes=Object.keys(before).filter(k=>JSON.stringify(before[k])!==JSON.stringify(after[k])).map(k=>labels[k]+'：'+display(k,before[k])+' → '+display(k,after[k]));
 const entry={at,by:account.name,reason:v.reason,before,after,changes:changes.length?changes:['记录补充说明，字段未改变']};
 (raw.centerEdits??=[]).push(entry);
 if(x.kind==='cycle')screeningLog(raw,'修改筛查信息：'+v.reason+'；'+entry.changes.join('；'));
 else sheetState().logs.push({id:x.id,section:'screening-info',...entry});
 $('#dialog').close();$('#dialog').classList.remove('sc-edit-dialog');render();
 toast('已保存修改'+(reassigned?'，待新责任医生复核':'')+'；'+(scFilter(scRecords(),scTab()).some(r=>r.id===x.id)?'列表与详情已更新。':'该记录已不符合当前筛选条件，可重置筛选后查看。'));
}
document.addEventListener('close',event=>{if(event.target.id==='dialog')event.target.classList.remove('sc-edit-dialog','sc-detail-dialog')},true);
if(document.body.dataset.demoEntry==='screening-center'){account=person(1);if(!location.hash||location.hash==='#/login')location.hash='/screening'}
render();
