const assert=require('node:assert/strict');
const {run,elements,listeners,context}=require('./prototype-harness.cjs')();
const open=(tab='network',role=1)=>{run(`account=person(${role});location.hash='#/screening?tab=${tab}';render()`);return elements['#main'].innerHTML};
const record=id=>JSON.parse(run(`JSON.stringify(scRecords().find(x=>x.id===${id}))`));
const raw=id=>run(`JSON.stringify(screeningState().rows.find(x=>x.id===${id}))`);
const save=(id,values)=>run(`scSaveEdit(${id},${JSON.stringify(values)})`);
const values={tags:'自定义标签，重点关注,自定义标签',group:'十月随访组',followupStatus:'跟进中',followupNote:'周二联系确认预约意向。',reason:'按本轮回访分工补充'};

for(const tab of ['critical','network','exam','health']){
 const html=open(tab);
 assert(html.includes('name="tag"')&&html.includes('全部标签'));
 assert(html.includes('name="group"')&&html.includes('全部分组'));
 assert(html.includes('data-action="sc-edit"'));
 assert(!elements['#nav'].innerHTML.includes('tab=high-risk'));
}
assert.equal(run('scSections.length'),6);
open('high-risk');assert.equal(run('scTab()'),'all');assert(elements['#main'].innerHTML.includes('全部筛查记录'));
assert(run("scFilter(scRecords()).every(x=>['高危','危急'].includes(x.risk))"));
assert(run("scUrl('all',{page:2},true).includes('risk=HIGH_RISK')"));
assert(!open('statistics').includes('tab=high-risk'));

open('network');const original=record(5201),stage=original.raw.stage;
save(5201,values);
assert.deepEqual(record(5201).tags,['自定义标签','重点关注']);
assert.equal(record(5201).group,'十月随访组');assert.equal(record(5201).followupStatus,'跟进中');
assert.equal(record(5201).raw.stage,stage);assert.equal(record(5201).ecgGrade,original.ecgGrade);
assert.equal(record(5201).raw.centerEdits.length,1);
assert.deepEqual(record(5201).raw.centerEdits[0].before.tags,original.tags);
assert.equal(record(5201).raw.centerEdits[0].after.group,'十月随访组');
assert(elements['#main'].innerHTML.includes('自定义标签'));
assert.equal(run("scFilter(scRecords(),'network',new URLSearchParams('tag=自定义标签&group=十月随访组&name=网络演示对象01&from=2026-10-10&to=2026-10-10')).length"),1);
assert.equal(run("scFilter(scRecords(),'network',new URLSearchParams('tag=自定义标签&group=不存在')).length"),0);
assert.equal(run("scFilter(scRecords(),'critical',new URLSearchParams('tag=自定义标签&group=十月随访组&status=跟进中')).length"),1);
run('scDetail(5201)');assert(elements['#dialog-content'].innerHTML.includes('十月随访组'));assert(elements['#dialog-content'].innerHTML.includes('信息修改记录'));
assert(run("scCsv(scRecords()).includes('十月随访组')"));
const beforeCancel=raw(5201);run('scEdit(5201)');assert.equal(raw(5201),beforeCancel);
assert(elements['#dialog-content'].innerHTML.includes('name="doctor"'));assert(!elements['#dialog-content'].innerHTML.includes('name="risk"'));
run('scEdit(5201)');assert.equal(raw(5201),beforeCancel,'opening or cancelling makes no mutation');

for(const [tab,id] of [['exam',5205],['health',5209]]){open(tab);save(id,{...values,group:tab+'自定义组'});assert.equal(record(id).group,tab+'自定义组');assert(elements['#main'].innerHTML.includes(tab+'自定义组'));}
open('network');const beforeInvalid=raw(5201);
for(const changes of [{reason:' '},{tags:'超'.repeat(25)},{tags:Array.from({length:11},(_,i)=>'标签'+i).join(',')},{group:'组'.repeat(41)},{followupStatus:'已入组'},{doctor:'5'},{owner:'2'},{risk:'低危'},{ecgGrade:'NORMAL',ecgScope:'REST_12_LEAD',ecgEvidence:'越权修改'}]){
 save(5201,{...values,...changes});assert.equal(raw(5201),beforeInvalid,'invalid edits must be atomic: '+JSON.stringify(changes));
}
open('network',3);save(5201,values);assert.equal(raw(5201),beforeInvalid,'nurse cannot edit others');
const nurseBefore=raw(5202);save(5202,{...values,owner:'4'});assert.equal(raw(5202),nurseBefore);
save(5202,values);assert.equal(record(5202).group,values.group);
open('network',5);save(5201,values);assert.equal(raw(5201),beforeInvalid);
open('network',6);save(5201,{...values,risk:'低危',riskEvidence:'非本人'});assert.equal(raw(5201),beforeInvalid);

open('network',2);run('scEdit(5202)');assert(elements['#dialog-content'].innerHTML.includes('name="risk"'));assert(!elements['#dialog-content'].innerHTML.includes('name="doctor"'));
const clinicalBefore=raw(5202);
save(5202,{...values,ecgGrade:'WARNING',ecgScope:'',ecgEvidence:'演示报告'});assert.equal(raw(5202),clinicalBefore);
save(5202,{...values,risk:'高危',riskEvidence:''});assert.equal(raw(5202),clinicalBefore);
save(5202,{...values,ecgGrade:'WARNING',ecgScope:'REST_12_LEAD',ecgEvidence:'演示报告 A 已由责任医生核对',risk:'中危',riskEvidence:'虚构风险复核依据'});
assert.equal(record(5202).ecgGrade,'WARNING');assert.equal(record(5202).risk,'中危');assert.equal(record(5202).raw.stage,'INTERVENE');
assert.equal(record(5202).raw.centerEdits.length,2);

const historicalRisk=run('sheetState().records.find(x=>x.id===6102).risk');
const source=run('JSON.stringify(screeningSheetData.records)');
save(6102,{...values,risk:'高危',riskEvidence:'虚构复核结论，保留历史风险',ecgGrade:'NORMAL',ecgScope:'REST_12_LEAD',ecgEvidence:'演示原报告 B'});
assert.equal(record(6102).risk,'高危');assert.equal(record(6102).raw.risk,historicalRisk);
assert.equal(record(6102).evidence,'虚构复核结论，保留历史风险');assert.equal(record(6102).riskHistorical,false);
assert.equal(run('JSON.stringify(screeningSheetData.records)'),source);
open('network',1);run("sheetAction('sheet-edit',6102,{name:'报告修改演示',gender:'男',age:'60',phone:'00000001234',reportConclusion:'新报告正文',note:'重新核对原报告'})");
assert.equal(record(6102).risk,'待复核');assert.equal(record(6102).ecgGrade,'UNASSESSED');

save(5201,{...values,doctor:'6',owner:'3'});
assert.equal(record(5201).doctor,6);assert.equal(record(5201).owner,3);assert.equal(record(5201).risk,'待复核');assert.equal(record(5201).ecgGrade,'UNASSESSED');
assert.equal(record(5201).raw.stage,'REVIEW');assert.equal(record(5201).raw.centerEdits.length,2);
const reassigned=raw(5201);open('network',2);save(5201,{...values,risk:'高危',riskEvidence:'旧医生'});assert.equal(raw(5201),reassigned);
open('network',6);assert.equal(record(5201).doctor,6);
open('network',1);save(5201,{...values,tags:'<img src=x onerror=x>',group:'=SUM(1)',followupNote:'<script>alert(1)</script>'});
assert(elements['#main'].innerHTML.includes('&lt;script&gt;'));assert(!elements['#main'].innerHTML.includes('<script>alert(1)'));
assert(run("scCsv(scRecords()).includes(\"'=SUM(1)\")"));
save(5201,{...values,tags:'',group:'',followupStatus:'',followupNote:''});
assert.deepEqual(record(5201).tags,[]);assert.equal(record(5201).group,'');assert.equal(record(5201).followupStatus,'');
console.log('PASS: four queues, custom tags/groups, combined filters, editing and cancel, audit, role boundaries, clinical evidence, reassignment, legacy risk, CSV and escaped display.');

// Route the actual form payload through document handlers; shared handlers must not
// close an invalid editor before its own validation can preserve the user's input.
context.FormData=class {constructor(form){return new Map(Object.entries(form.values))}};
let closeCount=0;elements['#dialog'].close=()=>closeCount++;
open('network');run('scEdit(5201)');
const form={dataset:{form:'sc-edit',id:'5201'},values:{...values,reason:' '}};
const event={target:{closest(selector){return selector==='[data-form]'||selector==='[data-form^="sc-"]'?form:null}},preventDefault(){},stopImmediatePropagation(){}};
for(const handler of listeners.submit)handler(event);
assert.equal(closeCount,0,'invalid form stays open with entered content');
assert(elements['#notice'].textContent.includes('修改说明'));
const pending=run("scStats(scRecords()).pending");
assert.equal(run("scFilter(scRecords(),'all',new URLSearchParams('review=pending')).length"),pending);
console.log('PASS: form dispatch isolation, validation keeps dialog open, review metrics match underlying workflow.');
