// Model and markup smoke checks; not a browser E2E test.
process.chdir(require('path').resolve(__dirname, '../../..'));
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const elements={};const listeners={};
const context=vm.createContext({structuredClone,URLSearchParams,console,setTimeout:()=>0,clearTimeout:()=>{},location:{hash:''},window:{scrollTo(){},addEventListener(){}},document:{body:{dataset:{}},querySelector(s){return elements[s]??=(s==='#main h1'?{textContent:''}:{innerHTML:'',textContent:'',classList:{add(){},remove(){}}})},addEventListener(name,fn){(listeners[name]??=[]).push(fn)}}});
for(const file of ['quality-wecom.js','platform-prototype.js','screening-sheet-data.js','screening-sheet.js','screening-cycle.js','screening-import.js','care-cycle.js','journey.js','patient-import.js','interactive.js'])vm.runInContext(fs.readFileSync('docs/demo-static/web/'+file,'utf8'),context);
let count=0;
for(const role of [1,2,3,4,5])for(const path of ['/wecom','/wecom?tab=access','/wecom?tab=receipts','/quality','/quality?tab=tests','/quality?tab=safety','/quality?tab=issues','/quality?tab=uat']){
vm.runInContext(`account=person(${role});location.hash=${JSON.stringify('#'+path)};render()`,context);
const html=elements['#main'].innerHTML;assert(html.length>0);
if([3,4].includes(role)&&path.startsWith('/quality'))assert(!html.includes('质量保障中心'));
if(role===5&&path.startsWith('/wecom'))assert(!html.includes('演示患者一'));
count++;
}
vm.runInContext("account=person(1);location.hash='#/quality';render()",context);
listeners.click[0]({target:{closest:()=>({dataset:{action:'qa-gate'}})}});
assert(elements['#notice'].textContent.includes('发布阻断'));
vm.runInContext("location.hash='#/wecom?tab=receipts';render()",context);
listeners.click[0]({target:{closest:()=>({dataset:{action:'qa-send',id:'2003'}})}});
assert(elements['#notice'].textContent.includes('已阻断'));
console.log(`${count} role/route renders and 2 safety blocking checks passed`);
for(const role of [1,2,3,4,5])for(const path of ['/ai-reports','/risk-review','/care-plans','/longitudinal','/analytics']){vm.runInContext(`account=person(${role});location.hash=${JSON.stringify('#'+path)};render()`,context);assert(elements['#main'].innerHTML.length);if(role===5)assert(!elements['#main'].innerHTML.includes('虚构出院报告 A'));count++;}
vm.runInContext("account=person(4);location.hash='#/care-plans?patient=1001';render();platformAction('platform-generate',1001)",context);assert(elements['#notice'].textContent.includes('请先'));
elements['#platform-report-note']={value:'核对虚构原报告'};
vm.runInContext("platformAction('platform-report',1001);platformAction('platform-generate',1001)",context);
assert(vm.runInContext('platformState().plans.length',context)===1);
elements['#platform-plan-text']={value:vm.runInContext('platformState().plans[0].text',context)};elements['#platform-review-note']={value:'核对虚构报告，审核演示内容'};
vm.runInContext("platformAction('platform-approve',1001)",context);assert(elements['#notice'].textContent.includes('仅责任医生'));
vm.runInContext("account=person(6);platformAction('platform-approve',1001)",context);assert(vm.runInContext('platformState().plans[0].status',context)==='DRAFT');
vm.runInContext("account=person(2);platformAction('platform-approve',1001)",context);assert(vm.runInContext('platformState().plans[0].status',context)==='APPROVED');
vm.runInContext("location.hash='#/patient-demo?tab=plan';render();platformAction('platform-consent',0)",context);assert(elements['#main'].innerHTML.includes('版本 v1'));
elements['#platform-plan-text'].value+='修订';vm.runInContext("account=person(4);platformAction('platform-save-plan',1001);render()",context);assert(vm.runInContext('platformState().plans[0].status',context)==='DRAFT');assert(elements['#main'].innerHTML.includes('暂无医生审核通过'));
vm.runInContext("platformAction('platform-revoke',0)",context);assert(elements['#main'].innerHTML.includes('欢迎体验'));
console.log('25 additional role/route checks; report prerequisites, owner review, approval visibility, version invalidation and consent revocation passed');
elements['#dialog']={close(){},showModal(){}};
for(const role of [1,2,3,4,5,6])for(const path of ['/screening','/screening?tab=network','/screening?tab=intervention','/screening?tab=review','/screening/5101']){vm.runInContext(`account=person(${role});location.hash=${JSON.stringify('#'+path)};render()`,context);assert(elements['#main'].innerHTML);if([5,6].includes(role))assert(!elements['#main'].innerHTML.includes('虚构筛查对象甲'));}
vm.runInContext("account=person(4);screeningAction('screen-review',5101,{level:'RED',note:'越权尝试'})",context);assert(vm.runInContext("screeningState().rows[0].level",context)==='PENDING');
vm.runInContext("account=person(2);screeningAction('screen-review',5101,{level:'RED',note:'虚构原心电复核依据'})",context);assert(vm.runInContext("screeningState().rows[0].level",context)==='RED');
vm.runInContext("account=person(4);screeningAction('screen-book',5101,{at:'2026-10-05T10:00',note:'不能普通预约代替处置'})",context);assert(vm.runInContext("screeningState().rows[0].stage",context)==='INTERVENE');
vm.runInContext("account=person(2);screeningAction('screen-handoff',5101,{at:'2026-10-02T15:00',note:'虚构医生承接与到诊凭证'})",context);assert(vm.runInContext("screeningState().rows[0].stage",context)==='HANDOFF');
vm.runInContext("account=person(4);screeningAction('screen-arrive',5101,{note:'虚构到诊凭证已核实'})",context);
vm.runInContext("account=person(4);screeningAction('screen-enroll',5101,{due:'2026-10-06T10:00',note:'越权入组'})",context);assert(vm.runInContext("screeningState().rows[0].stage",context)==='ARRIVED');
vm.runInContext("account=person(2);screeningAction('screen-enroll',5101,{due:'2026-10-06T10:00',note:'医生确认虚构管理需求'})",context);
assert(vm.runInContext("screeningState().rows[0].stage",context)==='ENROLLED');
assert(vm.runInContext("demo.tasks.some(t=>t.patient===screeningState().rows[0].patient&&demo.records.some(r=>r.id===t.record&&r.patient===t.patient))",context));
const patientCount=vm.runInContext('demo.patients.length',context);vm.runInContext("screeningAction('screen-enroll',5101,{due:'2026-10-06T10:00',note:'重复提交'})",context);assert(vm.runInContext('demo.patients.length',context)===patientCount);
vm.runInContext("account=person(1);screeningAction('screen-sync');screeningAction('screen-sync')",context);assert(vm.runInContext('screeningState().rows.length',context)===5);
vm.runInContext("account=person(3);screeningAction('screen-contact',5102,{result:'FAILED',note:'虚构未接通'})",context);assert(vm.runInContext("screeningState().rows[1].stage",context)==='INTERVENE');
vm.runInContext("screeningAction('screen-contact',5102,{result:'FAILED',note:'虚构未接通',retry:'2026-10-03T10:00'})",context);assert(vm.runInContext("screeningState().rows[1].stage",context)==='RETRY');
console.log('30 screening role/route checks; clinician stratification, critical handoff, enrollment lineage, idempotency and retry requirements passed');
assert(vm.runInContext('screeningSheetData.records.length',context)===64);
for(const [label,count] of [['高危',18],['危急',4],['中危',16],['低危',26]])assert(vm.runInContext(`screeningSheetData.records.filter(x=>x.risk===${JSON.stringify(label)}).length`,context)===count);
assert(vm.runInContext('screeningSheetData.records.filter(x=>x.arrival===\'已到诊\').length',context)===52);
assert(vm.runInContext('screeningSheetData.records.filter(x=>x.appointmentRecorded).length',context)===14);
for(const role of [1,2,3,4,5,6])for(const path of ['/screening?tab=ledger','/screening?tab=reconcile','/screening/6101']){vm.runInContext(`account=person(${role});location.hash=${JSON.stringify('#'+path)};render()`,context);assert(elements['#main'].innerHTML);if([3,5,6].includes(role)&&path==='/screening/6101')assert(!elements['#main'].innerHTML.includes('演示对象001'));}
vm.runInContext("account=person(1);location.hash='#/screening?tab=reconcile';render()",context);assert(elements['#main'].innerHTML.includes('暂停计算'));assert(elements['#main'].innerHTML.includes('85.94%'));assert(elements['#main'].innerHTML.includes('21.88%'));
vm.runInContext("account=person(4);location.hash='#/screening/6101';render();sheetAction('sheet-contact',6101,{round:'1',result:'FAILED',note:'虚构未接通'})",context);assert(elements['#notice'].textContent.includes('下次联系'));
vm.runInContext("sheetAction('sheet-doctor',6101,{note:'越权复核尝试'})",context);assert(!vm.runInContext('sheetState().records[0].doctorNote',context));
vm.runInContext("sheetAction('sheet-contact',6101,{round:'1',result:'FAILED',note:'虚构未接通',next:'2026-10-07T10:00'})",context);assert(vm.runInContext('sheetState().records[0].notes.length',context)===1);
console.log('18 source-ledger role/route checks; 64-row distribution, KPI discrepancy, physician permission and repeat-contact requirements passed');
vm.runInContext("account=person(1);location.hash='#/screening';render()",context);
for(const label of ['性别 / 年龄','报告结论','电话','虚构号码'])assert(elements['#main'].innerHTML.includes(label));
assert(vm.runInContext("screeningSheetData.records.every(x=>['男','女','未填写'].includes(x.gender)&&/^0000000\\d{4}$/.test(x.phone)&&x.reportConclusion.startsWith('【虚构演示结论】'))",context));
vm.runInContext("location.hash='#/screening/6101';render()",context);assert(elements['#main'].innerHTML.includes('不可用于联系'));assert(elements['#main'].innerHTML.includes('报告结论：'));
console.log('Ledger and detail demographics, fictional phone and report labels passed');
vm.runInContext("account=person(1);location.hash='#/data-ingestion';render();ingestAction('ingest-sample');ingestAction('ingest-confirm')",context);
assert(vm.runInContext('ingestState().batches.at(-1).duplicates',context)===64);
const importedCount=vm.runInContext('sheetState().records.length',context);
vm.runInContext("ingestAction('ingest-external');ingestAction('ingest-confirm');ingestAction('ingest-confirm')",context);
assert(vm.runInContext('sheetState().records.length',context)===importedCount+1);
assert(vm.runInContext('ingestState().batches.at(-1).duplicates',context)===1);
vm.runInContext("ingestAction('ingest-timeout')",context);assert(vm.runInContext('sheetState().records.length',context)===importedCount+1);
const batchCount=vm.runInContext('ingestState().batches.length',context);vm.runInContext("account=person(4);ingestAction('ingest-sample');ingestAction('ingest-confirm')",context);assert(vm.runInContext('ingestState().batches.length',context)===batchCount);
console.log('Preloaded actual Excel batch, 64-row duplicate replay, external Mock idempotency, timeout and import permissions passed');
for(const role of [1,2,3,4,5,6])for(const path of ['/enrollment','/in-care','/in-care?tab=risk','/in-care?tab=plans','/in-care?tab=archive',...['invitations','appointments','packages','referrals','followups','alerts','revisits','knowledge'].map(t=>'/after-care?tab='+t)]){vm.runInContext(`account=person(${role});location.hash=${JSON.stringify('#'+path)};render()`,context);assert(elements['#main'].innerHTML);if(role===5)assert(!elements['#main'].innerHTML.includes('演示患者一'));}
vm.runInContext("account=person(4);location.hash='#/enrollment';render();cycleAction('cycle-handoff',1001)",context);assert(!vm.runInContext('enrollmentRows().find(x=>x.id===1001).assigned',context));
vm.runInContext("cycleAction('cycle-scan-patient',1001);cycleAction('cycle-verify',1001,{note:'虚构本人身份与授权已核实'});cycleAction('cycle-handoff',1001)",context);assert(vm.runInContext('enrollmentRows().find(x=>x.id===1001).assigned',context));
const before=vm.runInContext('demo.patients.length',context);vm.runInContext("cycleAction('cycle-scan-patient',1001);cycleAction('cycle-handoff',1001)",context);assert(vm.runInContext('demo.patients.length',context)===before);
vm.runInContext("cycleAction('cycle-revoke',1001);cycleAction('cycle-handoff',1001)",context);assert(!vm.runInContext('enrollmentRows().find(x=>x.id===1001).assigned',context));
vm.runInContext("account=person(1);cycleAction('cycle-scan-patient',106101);cycleAction('cycle-verify',106101,{note:'虚构导入对象核验与本人授权',target:'NEW'});cycleAction('cycle-handoff',106101)",context);assert(vm.runInContext('enrollmentRows().find(x=>x.id===106101).assigned',context));assert(vm.runInContext("demo.patients.at(-1).risk",context)==='待评估');
console.log('78 combined hub/role renders; service authorization, repeat-scan, revoke and imported-patient onboarding passed');

// Unified intervention hub and service ticket responsibility boundaries.
for(const role of [1,2,3,4,5,6])for(const tab of ['overview','reports','risk','plans','archive','consultations','followups','alerts','appointments','knowledge']){
 vm.runInContext(`account=person(${role});location.hash='#/after-care?tab=${tab}';render()`,context);
 assert(elements['#main'].innerHTML.length);
 if(role===5)assert(!elements['#main'].innerHTML.includes('演示患者一'));
 else assert(elements['#main'].innerHTML.includes('诊后主动干预'));
}
vm.runInContext("account=person(1);render()",context);
assert(!elements['#nav'].innerHTML.includes('诊中患者管理'));
assert(!elements['#nav'].innerHTML.includes('href="#/in-care"'));
vm.runInContext("location.hash='#/in-care?tab=archive&patient=1001';render()",context);
assert(elements['#main'].innerHTML.includes('长期健康档案'));
vm.runInContext("demo.consultations=[];account=person(4);enrollmentState().rows.filter(x=>x.patient===1001).forEach(x=>{x.consent=false});serviceAction('service-create',0,{patient:'1001',title:'演示临床问题',kind:'CLINICAL'})",context);
assert.equal(vm.runInContext('consultationState().length',context),0);
vm.runInContext("enrollmentState().rows.filter(x=>x.patient===1001).forEach(x=>{x.consent=true;x.bound=true;x.assigned=true});serviceAction('service-create',0,{patient:'1001',title:'演示临床问题',kind:'CLINICAL'});serviceAction('service-resolve',1,{result:'运营不能代答'})",context);
assert.equal(vm.runInContext('consultationState()[0].status',context),'WAIT_CLINICAL');
vm.runInContext("account=person(6);serviceAction('service-resolve',1,{result:'无权医生'})",context);
assert.equal(vm.runInContext('consultationState()[0].status',context),'WAIT_CLINICAL');
vm.runInContext("account=person(2);serviceAction('service-resolve',1,{result:'虚构临床反馈，关联既有诊疗渠道'})",context);
assert.equal(vm.runInContext('consultationState()[0].status',context),'RESOLVED');
vm.runInContext("account=person(4);serviceAction('service-close',1,{evidence:''})",context);
assert.equal(vm.runInContext('consultationState()[0].status',context),'RESOLVED');
vm.runInContext("serviceAction('service-close',1,{evidence:'演示患者确认已取得反馈'})",context);
assert.equal(vm.runInContext('consultationState()[0].status',context),'CLOSED');
vm.runInContext("serviceAction('service-resolve',1,{result:'禁止改写已关闭工单'})",context);
assert.equal(vm.runInContext('consultationState()[0].history.length',context),3);
vm.runInContext("serviceAction('service-create',0,{patient:'1002',title:'越权患者',kind:'SERVICE'})",context);
assert.equal(vm.runInContext('consultationState().length',context),1);
vm.runInContext("serviceAction('service-create',0,{patient:'1001',title:'检查资料准备',kind:'SERVICE'});cycleAction('cycle-revoke',1001);serviceAction('service-resolve',2,{result:'撤回后禁止新服务'})",context);
assert.equal(vm.runInContext('consultationState()[1].status',context),'OPEN');
console.log('60 unified hub role/tab renders, legacy route, consultation ownership, consent, clinical escalation, closure evidence and immutable closed-result checks passed');
// Journey tests use synthetic state; real APIs and browser actions are not exercised.
for(const role of [1,2,3,4,5,6]){vm.runInContext(`account=person(${role});location.hash='#/journey';render()`,context);if(role===5)assert(!elements['#main'].innerHTML.includes('门诊全旅程'));else assert(elements['#main'].innerHTML.includes('患者全旅程服务'));}
vm.runInContext("demo.journeys=[];account=person(3);enrollmentState().rows.filter(x=>x.patient===1002).forEach(x=>{x.consent=true;x.bound=true;x.assigned=true});journeyAction('journey-create',0,{patient:'1002',kind:'OUTPATIENT',event:'VISIT-DEMO-B',source:'虚构人工核验'});journeyAction('journey-create',0,{patient:'1002',kind:'OUTPATIENT',event:'VISIT-DEMO-B',source:'重复事件'})",context);
assert.equal(vm.runInContext('journeyState().length',context),1);
vm.runInContext("journeyAction('journey-step',1,{version:'0',evidence:''})",context);
assert.equal(vm.runInContext('journeyState()[0].logs.length',context),0);
vm.runInContext("journeyAction('journey-step',1,{version:'0',evidence:'虚构接入交接'});journeyAction('journey-step',1,{version:'0',evidence:'旧页面重复提交'})",context);
assert.equal(vm.runInContext('journeyState()[0].logs.length',context),1);
vm.runInContext("journeyAction('journey-step',1,{version:'1',evidence:'完成咨询与预约协助'});journeyAction('journey-step',1,{version:'2',evidence:'尚无到院证据',ref:'7001'})",context);
assert.equal(vm.runInContext('journeyState()[0].logs.length',context),2);
vm.runInContext("demo.appointments.push({id:7702,patient:1002,status:'ARRIVED',at:'2026-10-04',note:'虚构核验'});journeyAction('journey-step',1,{version:'2',evidence:'核验就诊记录',ref:'7702'});journeyAction('journey-step',1,{version:'3',evidence:'已帮助完成院内流程'});journeyAction('journey-step',1,{version:'4',evidence:'护士不能代医生确认'})",context);
assert.equal(vm.runInContext('journeyState()[0].logs.length',context),4);
vm.runInContext("account=person(6);journeyAction('journey-step',1,{version:'4',evidence:'无权医生'})",context);
assert.equal(vm.runInContext('journeyState()[0].logs.length',context),4);
vm.runInContext("account=person(2);journeyAction('journey-step',1,{version:'4',evidence:'本人核对虚构门诊医嘱'});journeyAction('journey-step',1,{version:'5',evidence:'无批准计划'})",context);
assert.equal(vm.runInContext('journeyState()[0].logs.length',context),5);
vm.runInContext("platformState().plans.push({patient:1002,status:'APPROVED',reviewer:2,version:1});journeyAction('journey-step',1,{version:'5',evidence:'本人确认计划版本'});account=person(3);journeyAction('journey-step',1,{version:'6',evidence:'仅发送未反馈',ref:'2002'})",context);
assert.equal(vm.runInContext('journeyState()[0].logs.length',context),6);
vm.runInContext("demo.tasks.find(x=>x.id===2002).status='COMPLETED';demo.tasks.find(x=>x.id===2002).reviewer=2;journeyAction('journey-step',1,{version:'6',evidence:'任务执行及反馈已记录',ref:'2002'});journeyAction('journey-step',1,{version:'7',evidence:'未经医生确认无需复诊',outcome:'NONE'})",context);
assert.equal(vm.runInContext('journeyState()[0].logs.length',context),7);
vm.runInContext("account=person(2);journeyAction('journey-no-revisit',1,{evidence:'虚构原医嘱核对：本轮无需复诊'});account=person(3);journeyAction('journey-step',1,{version:'7',evidence:'患者反馈确认服务完成',outcome:'NONE'})",context);
assert.equal(vm.runInContext('journeyState()[0].logs.length',context),8);
vm.runInContext("journeyAction('journey-step',1,{version:'8',evidence:'不得改写结案'})",context);
assert.equal(vm.runInContext('journeyState()[0].logs.length',context),8);
vm.runInContext("account=person(4);journeyAction('journey-create',0,{patient:'1002',kind:'DISCHARGE',event:'越权事件',source:'虚构'})",context);
assert.equal(vm.runInContext('journeyState().length',context),1);
vm.runInContext("enrollmentState().rows.filter(x=>x.patient===1001).forEach(x=>{x.consent=true;x.bound=true;x.assigned=true});journeyAction('journey-create',0,{patient:'1001',kind:'DISCHARGE',event:'DISCHARGE-DEMO-A',source:'虚构出院事件'})",context);
vm.runInContext("journeyAction('journey-step',2,{version:'0',evidence:'接入交接'});journeyAction('journey-step',2,{version:'1',evidence:'住院流程协调'});account=person(2);demo.records.find(r=>r.id===101).status='READ';journeyAction('journey-step',2,{version:'2',evidence:'本人核对出院医嘱'});account=person(4);journeyAction('journey-step',2,{version:'3',evidence:'出院服务交接完成'});account=person(2);platformState().plans.find(x=>x.patient===1001).status='APPROVED';platformState().plans.find(x=>x.patient===1001).reviewer=2;journeyAction('journey-step',2,{version:'4',evidence:'审核本次计划'});account=person(4);journeyAction('journey-step',2,{version:'5',evidence:'居家随访反馈',ref:'2004'});journeyAction('journey-step',2,{version:'6',evidence:'仍有异常不可关闭',outcome:'EXIT'})",context);
assert.equal(vm.runInContext('journeyState()[1].logs.length',context),6);
vm.runInContext("demo.alerts.filter(x=>x.patient===1001).forEach(x=>x.status='CLOSED');demo.consultations.filter(x=>x.patient===1001).forEach(x=>x.status='CLOSED');journeyAction('journey-step',2,{version:'6',evidence:'患者确认退出，既有事项结清',outcome:'EXIT'})",context);
assert.equal(vm.runInContext('journeyState()[1].logs.length',context),7);
vm.runInContext("journeyAction('journey-create',0,{patient:'1001',kind:'DISCHARGE',event:'DISCHARGE-DEMO-A-2',source:'另一次就诊'});cycleAction('cycle-revoke',1001);journeyAction('journey-step',3,{version:'0',evidence:'撤权后不能继续'})",context);
assert.equal(vm.runInContext('journeyState()[2].logs.length',context),0);
console.log('Both journey paths, event deduplication, real-arrival requirement, clinician/plan gates, completed followup linkage, open-case closure blocking, consent withdrawal and stale-step protection passed');

for(const category of ["ALL","OUTPATIENT","INPATIENT","DISCHARGED"]){vm.runInContext(`account=person(1);location.hash="#/patients?category=${category}";render()`,context);assert(elements["#main"].innerHTML.includes("患者中心"));}
console.log("Patient category routes passed");
