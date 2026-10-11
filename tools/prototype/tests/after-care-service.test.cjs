const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const h=require('./prototype-harness.cjs')(),run=h.run;
const act=(a,id,v)=>run(`acAction(${JSON.stringify(a)},${JSON.stringify(String(id))},${JSON.stringify(v)})`);
const role=id=>run(`account=person(${id})`);
const get=(id,expr)=>run(`(()=>{const c=acCases().find(c=>c.id===${id});return ${expr}})()`);
const values=()=>{const v={result:'APPROVED',note:'虚构本人审核依据'};for(let i=0;i<4;i++){for(const k of [1,2,3])v[`p${i}_${k}`]='每周核对原医嘱';for(const k of ['problem','goal','measure','feedback','escalation'])v[`n${i}_${k}`]='医生确认的个体要求';v[`n${i}_reviewDate`]='2026-10-20'}return v};
const step=(id,record)=>act('ac-step',id,{record,date:'2026-10-01',missing:'无待补项',consent:'YES',relation:'SELF',source:'虚构渠道扫码记录',purpose:'本次服务授权',materials:'虚构出院资料',home:'虚构居家协助',revisit:'原医嘱复诊安排',note:'虚构核验与交接凭据'});
const visit=(id,node,result='SUCCESS')=>act('ac-visit',id,{node,occurred_at:'2026-10-08T09:00',result,symptoms:'虚构患者反馈',adherence:'已核实执行',note:'实际记录与下一步动作',retry_at:'2099-10-10T10:00'});
const prepare=id=>{const did=id===1003?6:2,record=id-900;role(1);while(get(id,'c.stage')<get(id,"acPaths[c.kind].roles.indexOf('ai')")){role(get(id,"acPaths[c.kind].roles[c.stage]")==='doctor'?did:1);step(id,record)}role(1);act('ac-generate',id,{goal:'个体服务目标'});if(id===1001)step(id,record);role(did);act('ac-review',id,values());assert.equal(get(id,'c.plan.status'),'APPROVED')};
role(1);assert.equal(run('acVisible().length'),3);
// Unauthorized clinical approval and incomplete approval must leave the plan unchanged.
step(1002,102);assert.equal(get(1002,'c.stage'),0);
for(const id of [1001,1002,1003]){
 prepare(id);role(1);act('ac-finish-follow',id);assert.equal(get(id,'c.stage'),get(id,"acPaths[c.kind].steps.findIndex(s=>s.includes('医生反馈'))"));
 visit(id,0,'FAILED');assert.equal(get(id,'c.visits.length'),1);
 act('ac-visit',id,{node:0,occurred_at:'2026-10-08T09:00',result:'FAILED',symptoms:'记录',adherence:'记录',note:'未接通'});assert.equal(get(id,'c.visits.length'),1,'failure requires retry date');
 for(let n=0;n<4;n++)visit(id,n);
 role(id===1003?6:2);act('ac-feedback',id,{note:'当前全部反馈已查收'});role(1);
 act('ac-issue',id,{kind:'CLINICAL',due:'2026-10-10T10:00',note:'待医生处理的反馈'});
 act('ac-resolve',`${id}:0`,{note:'冒充医生'});assert.equal(get(id,'c.issues[0].resolution'),undefined);
 act('ac-finish-follow',id);assert.equal(get(id,'c.stage'),get(id,"acPaths[c.kind].steps.findIndex(s=>s.includes('医生反馈'))"));
 role(id===1003?6:2);act('ac-accept',`${id}:0`,{note:'本人接单'});act('ac-resolve',`${id}:0`,{note:'本人医学处理意见'});role(1);act('ac-resolve',`${id}:0`,{note:'患者已获反馈的核验'});act('ac-finish-follow',id);
 const close={outcome:'NONE',resultDate:'2026-10-08',doctorNote:'医生后续意见',handoff:'后续交接对象和安排',patientReceipt:'患者确认凭据',satisfaction:'DECLINED',note:'独立结果凭据'};
 act('ac-step',id,close);assert.equal(get(id,'c.closed'),false,'no revisit needs doctor decision');role(id===1003?6:2);act('ac-no-revisit',id,{note:'独立医学确认依据'});role(1);act('ac-step',id,close);assert.equal(get(id,'c.closed'),true);
 assert(run(`acDetail(acCases().find(c=>c.id===${id}))`).includes('结案结果'));
}
// A new cycle cannot reuse the old event or medical report.
role(1);act('ac-create','',{patient:'1002',kind:'OUTPATIENT',eventKey:'NEXT-1',note:'新一轮服务需求'});const next=run('acCases().at(-1).id');
act('ac-create','',{patient:'1002',kind:'OUTPATIENT',eventKey:'NEXT-1',note:'重复'});assert.equal(run('acCases().at(-1).id'),next);
role(2);step(next,102);assert.equal(get(next,'c.stage'),0,'cannot reuse report from closed case');
// Reset mock cases to test revision, pause and withdrawal independently.
run('demo.afterCareCases=undefined');prepare(1002);role(1);visit(1002,0);act('ac-revise',1002,{note:'根据医生反馈调整'});act('ac-generate',1002,{goal:'调整后的目标'});assert.equal(get(1002,'c.planHistory.length'),1);assert.equal(get(1002,'c.planHistory[0].status'),'APPROVED');
role(2);const incomplete=values();delete incomplete.n0_measure;act('ac-review',1002,incomplete);assert.equal(get(1002,'c.plan.status'),'DRAFT');
act('ac-review',1002,values());assert.equal(get(1002,'c.planHistory[0].status'),'SUPERSEDED');role(1);act('ac-finish-follow',1002);assert.equal(get(1002,'c.stage'),4,'old visits do not complete revised plan');
act('ac-state','1002:PAUSED',{note:'患者暂时无法服务'});visit(1002,1);assert.equal(get(1002,'c.visits.length'),1);act('ac-state','1002:ACTIVE',{note:'重新核验服务'});assert.equal(get(1002,'c.status'),'ACTIVE');
act('ac-data',1002,{kind:'监测数据',at:'2026-10-08T09:00',value:'虚构监测数据',source:'患者反馈'});role(2);act('ac-verify-data','1002:0',{note:'已核实来源'});assert.equal(get(1002,'c.data[0].verified'),true);
role(1);act('ac-state','1002:WITHDRAWN',{note:'患者撤回授权凭据'});visit(1002,1);assert.equal(get(1002,'c.visits.length'),1);assert.equal(run('patient(1002).service_consent'),false);
console.log('PASS: all 3 paths, complete plan fields, task completion, retry, clinical ownership, no-revisit evidence, new event/report, revision, pause, data verification and withdrawal.');
