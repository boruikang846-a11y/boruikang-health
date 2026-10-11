// Current implementation menu and page render checks; fictional browser state.
const assert=require('node:assert/strict'),harness=require('./prototype-harness.cjs');
const fs=require('node:fs'),path=require('node:path'),admin=path.resolve(__dirname,'../../../docs/demo-static/web/admin');
const {run,elements}=harness();
let count=0;
for(const id of [1,2,3,4,5,6]){
 run(`account=person(${id})`);
 const menu=JSON.parse(run('JSON.stringify(menu())'));
 for(const [route,title] of menu){run(`location.hash=${JSON.stringify('#'+route)};render()`);assert(elements['#main'].innerHTML);assert(!elements['#main'].innerHTML.includes('没有找到这个原型页面'),route);assert(!elements['#main'].innerHTML.includes('当前角色无权访问'),`${id}: ${route} menu entry must be reachable`);assert(!elements['#header'].innerHTML.includes('页面流程'));assert(!/service-role-guide|cs-acceptance/.test(elements['#main'].innerHTML));count++}
 assert(!menu.some(([route])=>['/patient-demo','/enrollment','/quality','/care-plans','/ai-reports','/data-ingestion'].includes(route)));
 if(id===5)assert.deepEqual(menu.map(x=>x[0]),['/settings','/overview']);
 for(const route of ['/journeys','/after-care','/patients']){run(`location.hash=${JSON.stringify('#'+route)};render()`);if(id===5)assert(elements['#main'].innerHTML.includes('当前角色无权访问'));}
}
for(const id of [1,4])for(const route of ['/wecom?tab=contacts','/official-account']){
 run(`account=person(${id});location.hash=${JSON.stringify('#'+route)};render()`);
 const src=elements['#main'].innerHTML.match(/<iframe[^>]+src="([^"]+)"/)?.[1];assert(src,route);
 const url=new URL(src.replaceAll('&amp;','&'),'https://prototype.invalid/');
 assert(fs.existsSync(path.join(admin,url.pathname)),`Missing embedded channel page: ${url.pathname}`);
 assert.equal(url.searchParams.get('role'),id===1?'M':'O');
}
run('account=person(1)');
for(const match of fs.readFileSync(path.join(admin,'PAGE-FLOW.html'),'utf8').matchAll(/href="index.html#([^"]+)"/g)){
 run(`location.hash=${JSON.stringify('#'+match[1].replaceAll('&amp;','&'))};render()`);
 assert(!elements['#main'].innerHTML.includes('页面不存在'),match[1]);
 assert(!elements['#main'].innerHTML.includes('当前角色无权访问'),match[1]);
}
run("account=person(1);location.hash='#/journey';render()");assert(elements['#main'].innerHTML.includes('患者全旅程服务'));
for(const category of ['ALL','OUTPATIENT','INPATIENT','DISCHARGED']){run(`location.hash='#/patients?category=${category}';render()`);assert(elements['#main'].innerHTML.includes('患者档案与接入'));}
run("location.hash='#/patients/1001?tab=journeys';render()");assert(elements['#main'].innerHTML.includes('本患者就诊旅程'));
console.log(`${count} current role/menu renders, legacy journey link, patient categories, patient journey tab and platform isolation passed.`);
