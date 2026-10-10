const assert=require('node:assert/strict');
const {run,elements}=require('./prototype-harness.cjs')();
const open=(url,role=1)=>{run(`account=person(${role});location.hash=${JSON.stringify('#'+url)};render()`);return elements['#main'].innerHTML};
const main=()=>elements['#main'].innerHTML;

// Removing first-level entries must not remove any permitted destination.
for(const role of [1,2,3,4,5,6]){
  run(`account=person(${role})`);
  const entries=run('menu().map(x=>x[0])');
  for(const entry of entries)assert(!open(entry,role).includes('<h1>当前角色无权访问</h1>'),`visible menu ${role} ${entry}`);
}
const expected=['患者全旅程服务','企业微信','公众号','诊前高危患者筛查中心','诊后主动干预中心','宣教服务','服务包与方案','渠道管理','统计与复盘','医院数据','医护账号','运营设置','系统介绍'];
open('/journeys');
assert.deepEqual(Array.from(run('menu().map(x=>x[1])')),expected);
assert(main().includes('发现风险，核实到诊'));
assert(main().includes('href="#/workbench"'));
assert(!elements['#nav'].innerHTML.includes('>患者池</a>'));
assert(!elements['#nav'].innerHTML.includes('>患者中心</a>'));

// Old screening objects and the complete source-ledger interactions survive the merge.
assert(open('/screening?tab=pool').includes('虚构筛查对象一'));
assert(main().includes('data-action="enroll-pool"'));
open('/screening?tab=invitations');
assert.equal((main().match(/data-action="sheet-detail"/g)||[]).length,48);
assert(main().includes('全周期管理 · 回访邀约跟踪表'));
open('/screening?tab=queue');
assert(main().includes('href="#/screening?level=RED&amp;tab=queue"'));

// An entered patient stays in scope across a shared ledger, its details and archive tabs.
run("demo.invitations.push({id:6002,patient:1002,status:'待联系',note:'SCOPED-OTHER-INVITATION',at:'2099-01-01'})");
open('/screening?tab=invitations&patient=1001');
assert(main().includes('同一患者的共享台账'));
assert(!main().includes('SCOPED-OTHER-INVITATION'));
assert(main().includes('/invitations/6001?flow=screening&amp;patient=1001'));
assert.equal((main().match(/<h1>/g)||[]).length,1);
open('/invitations/6001?flow=screening&patient=1001');
assert(main().includes('返回诊前筛查环节'));
assert(main().includes('/screening?tab=invitations&amp;view=records&amp;patient=1001&amp;flow=screening'));
assert(elements['#nav'].innerHTML.includes('class="active" href="#/screening"'));
open('/after-care?tab=archive&patient=1001');
assert(main().includes('虚构出院报告 A'));
assert(!main().includes('虚构门诊报告 B'));
assert(main().includes('archiveTab=tasks'));
assert(main().includes('tab=archive'));
open('/after-care?tab=followups&patient=1001');
assert(main().includes('出院后 D7 随访'));
assert(!main().includes('门诊报告后随访'));
assert(main().includes('/after-care?status=APPROVED&amp;tab=followups&amp;flow=after-care&amp;patient=1001'));

// First visits do not silently become revisits merely by entering the follow-up phase.
run("demo.appointments.push({id:7002,patient:1001,appointment_type:'REVISIT',status:'BOOKED',at:'2099-11-01T09:00',note:'REVISIT-ONLY'})");
open('/after-care?tab=revisits&patient=1001');
assert(main().includes('2099-11-01T09:00'));
assert(!main().includes('2026-10-07T10:00'));
assert(main().includes('appointment_type=REVISIT'));

// Existing outpatient, inpatient/discharge and checkup case workflows remain executable.
for(const [scene,id,label] of [['OUTPATIENT',1002,'门诊诊后服务'],['DISCHARGE',1001,'住院与出院服务'],['CHECKUP',1003,'体检检后服务']]){
  open('/after-care?scene='+scene);
  assert(main().includes(label));
  open('/after-care?scene='+scene+'&case='+id);
  assert(main().includes('患者个案'));
  assert(main().includes('个案随访计划表'));
  assert(main().includes('原报告'));
  assert(main().includes('patient='+id));
}
open('/after-care?scene=OUTPATIENT&patient=1002');
assert(main().includes('name="patient" value="1002"'));
assert(main().includes('#AC1002'));
assert(!main().includes('#AC1001'));
assert.equal(run('acVisible().length'),1);
open('/journeys?patient=1001');
assert(main().includes('name="patient" value="1001"'));
assert(!main().includes('/screening?tab=ledger&amp;flow=screening&amp;patient=1001'));
open('/screening?tab=handoff&patient=1001');
assert.equal(run('enrollmentRows().length'),1);

// Scope is not a substitute for authorization. Clinical operations remain doctor-owned.
assert(open('/after-care?tab=archive&patient=1003',2).includes('当前角色无权访问'));
assert(open('/after-care?case=1001&patient=1002').includes('当前角色无权访问'));
assert(open('/followups/2001?patient=1002').includes('当前角色无权访问'));
assert(open('/after-care?tab=followups&patient=invalid').includes('当前角色无权访问'));
open('/after-care?tab=invitations&patient=1001',2);
assert(!main().includes('data-action="new-invitation"'));
open('/doctor/reviews/2002?patient=1002',2);
assert(main().includes('data-action="approve"'));
assert(!main().includes('data-action="contact"'));
open('/followups/2002?patient=1002',1);
assert(!main().includes('data-action="approve"'));
for(const url of ['/journeys','/after-care','/after-care?tab=archive&patient=1001','/screening','/patients/1001','/followups/2001'])assert(open(url,5).includes('当前角色无权访问'),url);
assert(!open('/settings',5).includes('当前角色无权访问'));
console.log('PASS: ordered navigation, merged screening and archives, patient-context links and forms, shared-ledger semantics, three existing case paths, revisit type and role boundaries.');
