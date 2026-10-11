const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../../../docs/demo-static/web/user/patient-service-center.html'), 'utf8');
const script = html.match(/<script id="service-prototype">([\s\S]*?)<\/script>/)[1];
const elements = {};
const context = vm.createContext({ console, setTimeout:()=>0, clearTimeout(){}, window:{confirm:()=>true}, document:{addEventListener(){},getElementById(id){return elements[id]??={innerHTML:'',textContent:'',value:'',addEventListener(){}}}} });
const run = code => vm.runInContext(code, context);
vm.runInContext(script, context);
const act = (action, data={}) => run(`transition(${JSON.stringify(action)},${JSON.stringify(data)})`);
const register = relation => act('register', {name:'虚构患者甲',phone:'13800000000',relation,phase:'AFTER_CARE',consent:'on'});
const verify = () => act('verify', {identity:'on',authorization:'on',family:'on',evidence:'虚构核实依据'});
// Registration and family consent never auto-bind; role guards apply to transitions too.
assert.throws(()=>register('SELF'));
act('issue');assert.throws(()=>act('register',{name:'虚构甲',phone:'13800000000',relation:'SELF',phase:'FULL'}));
register('FAMILY');assert.equal(run('state.entry'),'REGISTERED');
assert.throws(()=>act('verify',{identity:'on',authorization:'on',evidence:'虚构'}));
run("role='DOCTOR'");assert.throws(verify);run("role='OPERATOR'");verify();
assert.equal(run('state.journey'),null);assert.throws(()=>act('feedback',{kind:'SERVICE',content:'虚构反馈'}));
act('journey',{kind:'DISCHARGE',handoff:'on'});assert.equal(run('state.journey.phase'),2);
assert.throws(()=>act('journey',{kind:'DISCHARGE',handoff:'on'}));
// Responsibility and human confirmation are separate gates; internal notes never leak.
act('feedback',{kind:'CLINICAL',content:'<img src=x onerror=alert(1)>'});
assert.throws(()=>act('accept',{id:1}));run("role='DOCTOR'");act('accept',{id:1});
assert.throws(()=>act('resolve',{id:1}));act('resolve',{id:1,resolution:'INTERNAL_ONLY_TEST'});
assert.throws(()=>act('close',{id:1,confirmed:'on'}));
assert.ok(!run('patient()').includes('INTERNAL_ONLY_TEST'));
assert.ok(run('patient()').includes('&lt;img'));
run("role='NURSE'");act('close',{id:1,confirmed:'on'});assert.equal(run('state.feedback[0].status'),'CLOSED');
act('feedback',{kind:'SERVICE',content:'虚构服务问题'});run("role='DOCTOR'");assert.throws(()=>act('accept',{id:2}));
run("role='OPERATOR'");act('accept',{id:2});act('withdraw');
assert.ok(!run('patient()').includes('虚构患者甲'));assert.throws(()=>act('feedback',{kind:'SERVICE',content:'拒绝'}));
act('resolve',{id:2,resolution:'撤回后完成既有事项'});act('close',{id:2,confirmed:'on'});
assert.throws(()=>act('issue'));
// Expiry/revocation block portal actions; replacement requires new registration.
act('reset');act('issue');register('SELF');verify();act('expire');
assert.ok(run('patient()').includes('链接已到期'));assert.throws(()=>act('journey',{kind:'OUTPATIENT',handoff:'on'}));
act('issue');assert.equal(run('state.registration'),null);assert.equal(run('state.entry'),'ISSUED');
act('revoke');assert.throws(()=>register('SELF'));assert.ok(run('patient()').includes('入口已撤销'));
run('render()');assert.ok(elements['staff-content'].innerHTML.includes('入口已撤销'));
console.log('Patient service prototype passed: registration/consent, family checks, binding, journey, clinical ownership, closure, private notes, escaping, withdrawal, expiry and replacement.');

act('reset');act('issue');register('SELF');verify();act('journey',{kind:'CHECKUP',handoff:'on'});assert.ok(run('journey()').includes('体检检后服务'));
