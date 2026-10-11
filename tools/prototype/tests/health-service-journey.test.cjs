const test=require('node:test'),assert=require('node:assert/strict'),harness=require('./prototype-harness.cjs');
const init=`
account=person(1);current={path:'/after-care',query:new URLSearchParams()};
globalThis.c=hjAll().find(c=>c.kind===KIND);globalThis.j=hjEnsure(c);
globalThis.node=k=>hjNodes(c).find(n=>n.key===k);
globalThis.today=acDateTime().slice(0,10);
globalThis.values=k=>{
 const n=node(k),v={version:j.version,intent:'complete',reason:'补充新核验事实'};
 for(const f of n.fields)v[f.key]=f.type==='datetime-local'?acDateTime():f.type==='date'?today:f.type==='record'?demo.records.find(r=>r.patient===c.patient&&r.type===acPaths[c.kind].record).id:f.options?f.options.at(-1):'虚构核对记录与来源';
 Object.assign(v,{consent:'已核实并取得授权',booking:'预约已确认',arrival:'已人工核验到院',read:'已查看并核对原报告',contactResult:'已接通并确认继续服务',revisit:'无需本轮复诊',outcome:'医生确认无需本轮复诊',qualityDecision:'质控通过'});
 if(k==='plan'||k==='review')Object.assign(v,{goal:'核实原医嘱执行与患者疑问',startDate:today,endDate:today,baseline:'本患者原报告及已采集信息',barriers:'家属协助，未核实项另行补采',education:'仅采用原医生意见',uncertainties:'无新增未核实事项',decision:'APPROVED',reviewNote:'本人已核对来源和每项任务'});
 if(k==='plan'||k==='review')for(let i=0;i<3;i++)Object.assign(v,{['task'+i]:'随访任务 '+i,['time'+i]:today+'T10:00',['content'+i]:'核实原医嘱执行与患者反馈',['measure'+i]:'记录实际结果与来源',['escalation'+i]:'医学问题交责任医生'});
 return v;
};
globalThis.submit=(k,patch={})=>{const n=node(k);account=person(hjOwner(c,n));hjSubmit(c,n,{...values(k),...patch,version:j.version})};
globalThis.reach=k=>{for(const n of hjNodes(c)){if(n.key===k)break;if(n.key==='followup'){for(let i=0;i<3;i++)submit('followup',{node:i,result:'SUCCESS',occurred_at:acDateTime(),symptoms:'患者自述反馈',monitoring:'尚无新监测数据',adherence:'原医嘱执行困难已记录',note:'本次任务完成并交医生'});}else submit(n.key)}};
`;
function setup(kind='OUTPATIENT'){const h=harness();h.context.KIND=kind;h.run(init);return h}
test('three centers show one patient journey with distinct nursing fields and editable nodes',()=>{
 for(const [center,kind,copy] of [['OUTPATIENT','OUTPATIENT','就诊资料与需求采集'],['INPATIENT','DISCHARGE','入院资料与照护需求采集'],['EXAM','CHECKUP','检前资料与准备信息收集']]){const h=setup(kind);h.run(`current.query=new URLSearchParams('center=${center}')`);const html=h.run('afterCarePage()');assert.match(html,/诊后健康服务中心/);assert.match(html,/患者服务清单/);assert.ok(html.includes(copy));assert.equal(h.run('hjNodes(c).length'),15);assert.deepEqual(Array.from(h.run('new Set(hjNodes(c).map(n=>n.role))')),['OPERATOR','DOCTOR','NURSE']);}
});
test('all three full journeys require review, each followup, doctor receipt and independent outcome evidence',()=>{
 for(const kind of ['OUTPATIENT','DISCHARGE','CHECKUP']){const h=setup(kind);h.run("reach('outcome')");assert.equal(h.run('hjPending(c).key'),'outcome',h.elements['#notice'].textContent);assert.equal(h.run('hjVisits(c).length'),3);assert.equal(h.run('hjReceipt(c)'),true);h.run("submit('outcome',{outcome:'已预约，尚未到院'})");assert.equal(h.run('c.closed'),false);h.run("submit('outcome')");assert.equal(h.run('c.closed'),true,h.elements['#notice'].textContent);assert.equal(h.run('j.history.length'),17);assert.ok(h.run('c.logs.length')>=17);}
});
test('role boundaries, future step completion, stale writes, cross-patient report and consent reject without writes',()=>{
 const h=setup();h.run("account=person(3);hjSubmit(c,node('intake'),values('intake'))");assert.equal(h.run('j.version'),0);
 h.run("submit('appointment')");assert.equal(h.run('j.version'),0);
 h.run("account=person(4);hjSubmit(c,node('intake'),{...values('intake'),version:22})");assert.equal(h.run('j.version'),0);
 h.run("reach('report');globalThis.before=j.version;submit('report',{record:101})");assert.equal(h.run('j.version'),h.run('before'));
 h.run("submit('report',{read:'尚未核对'})");assert.equal(h.run('j.version'),h.run('before'));
 h.run("patient(c.patient).service_consent=false;submit('report')");assert.equal(h.run('j.version'),h.run('before'));
 h.run('account=person(5)');assert.equal(h.run('hjVisible(c)'),false);
});
test('unfinished contact and followup remain actionable with retry time, completed contact advances',()=>{
 const h=setup();h.run("reach('contact');submit('contact',{contactResult:'未接通，安排重试',retry:''})");assert.equal(h.run("j.nodes.contact.status"),'TODO');
 h.run("submit('contact',{contactResult:'未接通，安排重试',retry:new Date(Date.now()+86400000).toISOString()})");assert.equal(h.run('hjPending(c).key'),'contact');assert.equal(h.run('j.nodes.contact.status'),'DRAFT');
 h.run("submit('contact');submit('followup',{node:0,result:'FAILED',occurred_at:acDateTime(),symptoms:'未采集',monitoring:'未采集',adherence:'未采集',note:'未接通',retry_at:new Date(Date.now()+86400000).toISOString()})");assert.equal(h.run('hjPending(c).key'),'followup');assert.equal(h.run('hjAllVisited(c)'),false);assert.equal(h.run('c.visits.length'),1);
});
test('editing a completed plan preserves history and invalidates all dependent approvals and completion',()=>{
 const h=setup();h.run("reach('outcome');globalThis.oldRevision=c.revision;submit('plan',{intent:'draft',goal:'更新患者目标'})");assert.equal(h.run('c.plan.status'),'DRAFT');assert.equal(h.run('hjApproved(c)'),false);assert.equal(h.run('j.nodes.review.status'),'STALE');assert.equal(h.run('j.nodes.feedback.status'),'STALE');assert.equal(h.run('hjPending(c).key'),'plan');assert.ok(h.run('c.planHistory.length')>=2);assert.equal(h.run('hjVisits(c).length'),0);assert.equal(h.run('c.visits.length'),3);assert.ok(h.run('j.nodes.plan.history.length')>0);
 h.run("globalThis.before=j.version;submit('followup',{node:0,result:'SUCCESS'})");assert.equal(h.run('j.version'),h.run('before'));
});
test('doctor rejection returns plan for correction; physician or authorization changes invalidate execution',()=>{
 const h=setup();h.run("reach('review');submit('review',{decision:'REJECTED',reviewNote:'需补充患者近期记录',goal:''})");assert.equal(h.run('c.plan.status'),'REJECTED');assert.equal(h.run('hjPending(c).key'),'plan');h.run("submit('plan');submit('review');patient(c.patient).doctor=6;globalThis.before=j.version;submit('handoff')");assert.equal(h.run('j.version'),h.run('before'));assert.equal(h.run('hjApproved(c)'),false);
});
test('clinical issue must be accepted and handled by current doctor and patient receipt blocks closure',()=>{
 const h=setup();h.run("reach('outcome');account=person(3);hjAction('issue',c.id,{version:j.version,kind:'CLINICAL',due:acDateTime(),note:'虚构患者医学疑问'});submit('outcome')");assert.equal(h.run('c.closed'),false);
 h.run("account=person(4);hjAction('issue-accept',c.id+':0',{version:j.version,note:'运营不能接医学问题'})");assert.equal(h.run('c.issues[0].accepted'),false);
 h.run("account=person(2);hjAction('issue-accept',c.id+':0',{version:j.version,note:'本人受理'});hjAction('issue-resolve',c.id+':0',{version:j.version,note:'本人记录医学处理结果'});submit('outcome')");assert.equal(h.run('c.closed'),false);
 h.run("account=person(4);hjAction('issue-close',c.id+':0',{version:j.version,note:'患者已获得反馈，核验完成'});submit('outcome')");assert.equal(h.run('c.closed'),true);
});
test('AI planner uses this patient report and supplied goal, generates editable dates, logs input and requires doctor approval',()=>{
 const h=setup();h.run("reach('plan');account=person(4);hjAction('draft',c.id,{version:j.version,goal:'解决本次原医嘱执行困难',baseline:'引用本患者原报告',barriers:'需家属协助记录',education:'遵循本次医生意见',uncertainties:'部分监测尚未采集',startDate:today,endDate:today,reason:'初次规划'})");assert.equal(h.run('c.plan.agent.record'),102);assert.equal(h.run('c.plan.agent.mode'),'LOCAL_DEMO');assert.equal(h.run('c.plan.status'),'DRAFT');assert.equal(h.run('j.nodes.plan.status'),'DRAFT');assert.equal(h.run('c.plan.rows.length'),3);assert.ok(h.run('c.plan.rows[0][2]').includes('解决本次原医嘱执行困难'));assert.ok(h.run('c.plan.rows[0][1]').startsWith(h.run('today')));assert.equal(h.run('hjApproved(c)'),false);assert.match(h.run('hjForm(c,node("plan"))'),/智能体健康计划规划/);
 h.run("submit('plan');submit('review')");assert.equal(h.run('hjApproved(c)'),true);assert.equal(h.run('c.plan.agent.record'),102);
});
test('post-care entry records skipped prerequisites and duplicate event is rejected',()=>{
 const h=setup();h.run("account=person(1);hjAction('create','EXAM',{patient:1003,eventKey:'NEW-EXAM-001',entry:'POST',reason:'检后接入，有原报告待医生核实'});globalThis.created=acCases().at(-1);globalThis.count=acCases().length");assert.equal(h.run('hjEnsure(created).nodes.arrival.status'),'SKIPPED');assert.equal(h.run('created.plan'),null);assert.equal(h.run('created.patient'),1003);h.run("hjAction('create','EXAM',{patient:1003,eventKey:'NEW-EXAM-001',entry:'FULL',reason:'重复'})");assert.equal(h.run('acCases().length'),h.run('count'));
});
test('untrusted user text stays escaped in every page projection and history',()=>{
 const h=setup();h.run("submit('intake',{need:'<img src=x onerror=alert(1)>'});account=person(1);current.query=new URLSearchParams('center=OUTPATIENT&service='+c.id+'&phase=PRE&node=intake')");const html=h.run('afterCarePage()');assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('<img src=x'));
});

test('legacy links return to the same editable journey and reject conflicting patient context',()=>{
 const h=setup();h.run("current.query=new URLSearchParams('case='+c.id+'&patient='+c.patient)");assert.match(h.run('afterCarePage()'),/本阶段办理步骤/);h.run("current.query=new URLSearchParams('case='+c.id+'&patient=1001')");assert.match(h.run('afterCarePage()'),/当前角色无权访问/);h.run("account=person(2);acAction('ac-step',c.id,{})");assert.equal(h.run('j.version'),0);
});

test('operations execute the whole patient service journey; nurses only perform medical quality reviews',()=>{
 const h=setup();assert.deepEqual(Array.from(h.run("hjNodes(c).filter(n=>n.role==='NURSE').map(n=>n.key)")),['quality-pre','quality-post']);assert.deepEqual(Array.from(h.run("hjNodes(c).filter(n=>n.role==='DOCTOR').map(n=>n.key)")),['report','review','feedback']);
 h.run("reach('quality-pre');account=person(4);globalThis.before=j.version;hjSubmit(c,node('quality-pre'),values('quality-pre'))");assert.equal(h.run('j.version'),h.run('before'));
 h.run("account=person(3);globalThis.count=acCases().length;hjAction('create','OUTPATIENT',{patient:1002,eventKey:'NURSE-NOT-OPS',entry:'FULL',reason:'不能代运营建旅程'})");assert.equal(h.run('acCases().length'),h.run('count'));
 assert.match(h.run('journeyPage()'),/医疗与质控工作台/);assert.match(h.run('journeyPage()'),/医疗护理与执行准备质控/);assert.match(h.run('careHubNav()'),/医疗与质控工作台/);
});
test('nursing quality can return a plan to operations and requires doctor review after edits',()=>{
 const h=setup();h.run("reach('quality-pre');submit('quality-pre',{qualityDecision:'退回运营完善',returnTo:'健康计划完善',qualityNote:'监测数据来源要求需写清'})");assert.equal(h.run('hjPending(c).key'),'plan');assert.equal(h.run('hjApproved(c)'),false);assert.equal(h.run('j.nodes.plan.status'),'STALE');h.run("submit('plan');submit('review');submit('quality-pre')");assert.equal(h.run('hjPending(c).key'),'handoff');assert.equal(h.run('hjApproved(c)'),true);
});
