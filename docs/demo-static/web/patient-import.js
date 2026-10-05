'use strict';

// UI-only demonstration. Files stay in this browser; records live in demo memory.
let patientImportState = null, lastPatientImport = null;
const importScenes = [['MANUAL','人工补充'],['ECG_NETWORK','心电网络'],['EXAM','体检'],['COMMUNITY_SCREENING','社区筛查'],['PRIMARY_REFERRAL','基层转介'],['OUTPATIENT','门诊'],['INPATIENT','住院'],['DISCHARGE','出院'],['CAMPAIGN','活动']];
const importTypes = [['UNKNOWN','未指定'],['OUTPATIENT','门诊患者'],['INPATIENT','住院患者'],['DISCHARGED','出院患者']];
const importSample = [
  {line:2,cells:['虚构导入患者甲','女','62','00000000011','心血管内科','虚构管理原因 A','DEMO-IMPORT-001']},
  {line:3,cells:['虚构导入患者乙','男','54','00000000012','全科','虚构管理原因 B','DEMO-IMPORT-002']},
  {line:4,cells:['虚构导入患者甲','女','62','00000000011','心血管内科','虚构管理原因 A','DEMO-IMPORT-001']},
];
function importStatus(text, kind=''){return '<span class="import-status '+kind+'">'+esc(text)+'</span>'}
function importButton(label, action, cls='', disabled=false){return '<button type="button" class="'+cls+'" data-action="patient-import-'+action+'"'+(disabled?' disabled':'')+'>'+label+'</button>'}
function importDownload(content, filename, type){
  const url=URL.createObjectURL(new Blob([content],{type})), a=document.createElement('a');
  a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function importCsv(records){return '\uFEFF'+records.map(row=>row.map(value=>'"'+String(value??'').replace(/^[=+@-]/,"'$&").replace(/"/g,'""')+'"').join(',')).join('\r\n')}
function classifyPatientImport(){
  if(!patientImportState?.preview)return [];
  const external=new Set(demo.patients.filter(p=>p.source==='FILE_IMPORT'&&p.external).map(p=>p.external));
  const cards=new Set(demo.patients.filter(p=>p.id_card).map(p=>p.id_card.toUpperCase()));
  return patientImportState.preview.entries.map(entry=>{
    const row=entry.row;let duplicate='';
    if(!entry.errors.length){
      if(row.external_id&&external.has(row.external_id))duplicate='来源编号重复';
      else if(row.id_card&&cards.has(row.id_card.toUpperCase()))duplicate='证件号重复';
      if(!duplicate){
        if(row.external_id)external.add(row.external_id);
        if(row.id_card)cards.add(row.id_card.toUpperCase());
      }
    }
    return {...entry,duplicate};
  });
}
function patientImportResultCard(){
  const r=lastPatientImport;if(!r||r.actor!==account.id)return '';
  return '<section class="card import-result-card"><div class="row between"><div><span class="eyebrow">最近一次文件导入</span><h2>新增 '+r.created+' 位患者'+(r.skipped?'，跳过 '+r.skipped+' 条重复记录':'')+'</h2><p>批次 '+esc(r.batch)+' · '+r.taskCount+' 项首次联系任务</p></div><div class="row">'+(r.created?link('查看本次新增','/patients?batch='+r.batch,'btn'):'')+importButton('查看结果','result')+'</div></div></section>';
}
function openPatientImport(){
  if(!canOperate())return;
  patientImportState={step:1,preview:null,file:null,error:'',busy:false,filter:'all',batch:'B'+Date.now()+'-'+crypto.randomUUID().slice(0,8),settings:{doctor_id:'',owner_id:String(account.id),patient_type:implementationContract.patientCentre.types.includes(current.query.get('category'))?current.query.get('category'):'UNKNOWN',source_scene:'MANUAL',org_id:'',outreach:true}};
  renderPatientImport();$('#dialog').showModal();
}
function renderPatientImport(){
  const s=patientImportState;if(!s)return;
  $('#dialog').classList.add('patient-import-dialog');$('#dialog').setAttribute('aria-labelledby','patient-import-title');
  const steps=['上传文件','校验与分配','导入结果'];
  let body='<div class="import-modal-head"><div><span class="eyebrow">患者中心 / 批量建档</span><h2 id="patient-import-title">上传患者信息</h2><p>上传门诊、住院或出院患者资料，校验后建档，再核验身份、服务授权与交接。</p></div>'+importButton('关闭','close','import-close',s.busy)+'</div><ol class="import-steps">'+steps.map((label,i)=>'<li class="'+(i+1===s.step?'current':i+1<s.step?'done':'')+'"'+(i+1===s.step?' aria-current="step"':'')+'><span>'+(i+1)+'</span>'+label+'</li>').join('')+'</ol><div class="import-body">';
  if(s.step===1)body+=patientImportUpload();
  if(s.step===2)body+=patientImportReview();
  if(s.step===3)body+=patientImportFinished(s.result);
  body+='</div><div class="import-footer"><span class="muted">原型演示 · 文件在本地读取，记录仅保留在当前页面</span><div class="row">';
  if(s.step===1)body+=importButton('取消','close','',s.busy)+importButton(s.busy?'正在读取…':'下一步：校验与分配','next','primary',s.busy||!s.preview);
  if(s.step===2){
    const entries=classifyPatientImport(),errors=entries.filter(e=>e.errors.length).length,newCount=entries.filter(e=>!e.errors.length&&!e.duplicate).length;
    body+=importButton('上一步','back','',s.busy)+importButton(s.busy?'正在导入…':'确认新增 '+newCount+' 位患者','submit','primary',s.busy||!!errors||!s.settings.doctor_id||!s.settings.owner_id);
  }
  if(s.step===3)body+=importButton('继续导入','again')+importButton('完成，返回患者中心','finish','primary');
  $('#dialog-content').innerHTML=body+'</div></div>';
}
function patientImportUpload(){
  const s=patientImportState;
  return '<div class="import-template"><div><h3>1. 按模板整理患者信息</h3><p>必填：姓名、年龄、联系电话、科室、病种 / 管理原因。适用于门诊名单、住院名单及出院患者名单。</p></div>'+importButton('下载 Excel 空白模板','template')+'</div><label class="import-dropzone'+(s.busy?' is-busy':'')+'" id="patient-import-drop"><span class="file-mark">表格</span><strong>拖拽文件到这里，或点击选择文件</strong><span>Excel（.xlsx）或 CSV · 单文件不超过 5 MiB · 最多 500 条</span><span class="btn">选择文件</span><input aria-label="上传患者信息文件" id="patient-import-file" type="file" accept=".xlsx,.csv"'+(s.busy?' disabled':'')+'></label>'+(s.file?'<div class="import-file"><div><strong>'+esc(s.file.name)+'</strong><p>'+(s.busy?'正在读取与校验…':s.preview?s.preview.entries.length+' 条患者记录 · '+(s.preview.sheetName?'工作表：'+esc(s.preview.sheetName):'CSV / 虚构样例'):'请重新选择文件')+'</p></div>'+importButton('重新选择','reselect','',s.busy)+'</div>':'')+(s.error?'<div class="import-alert error" role="alert"><strong>文件无法读取</strong><p>'+esc(s.error)+'</p></div>':'')+(s.preview?'<div class="import-alert '+(s.preview.errors.length?'error':'success')+'" role="status"><strong>'+ (s.preview.errors.length?s.preview.errors.length+' 条记录需要修正，请进入下一步查看错误':'文件读取完成，可以进入下一步')+'</strong></div>':'')+'<details class="import-rules"><summary>填写要求与重复处理规则</summary><p>首行保留模板表头，电话与编号按文本填写；性别、证件号、出生日期、住址等可选。出生日期填写 YYYY-MM-DD 或 Excel 日期。</p><p>建议填写来源编号或证件号：重复记录跳过，不覆盖已有档案；手机号可能属于家属，不作为合并依据。未填写这两项时，跨批次导入可能重复建档。</p><p>本入口导入结构化患者资料；体检报告、门诊病历、出院小结正文请在建档后关联，不将表格中的管理原因当作已确认诊断。</p><p>任意一行格式错误会阻止整批导入，请修正文件后重新上传。风险分层保持“待评估”。</p></details><div class="import-samples"><span>没有准备文件？用虚构样例体验</span>'+importButton('正确与重复样例','sample')+importButton('错误样例','invalid')+'</div>';
}
function importSelect(name,label,items,value,required=false,disabled=false){
  return '<label>'+label+(required?'<em>必填</em>':'')+'<select name="'+name+'"'+(disabled?' disabled':'')+'>'+items.map(([v,l])=>'<option value="'+v+'"'+(v===value?' selected':'')+'>'+esc(l)+'</option>').join('')+'</select></label>';
}
function patientImportReview(){
  const s=patientImportState,entries=classifyPatientImport(),errors=entries.filter(e=>e.errors.length).length,duplicates=entries.filter(e=>e.duplicate).length,valid=entries.length-errors-duplicates,v=s.settings;
  const doctors=demo.accounts.filter(a=>a.role==='DOCTOR'&&a.active).map(a=>[String(a.id),a.name]);
  const owners=demo.accounts.filter(a=>['MANAGER','OPERATOR','NURSE'].includes(a.role)&&a.active).map(a=>[String(a.id),a.name]);
  return '<div class="row between"><div><h3>'+esc(s.file.name)+'</h3><span class="muted">请核对患者信息，并为本批次指定责任医生和负责人。</span></div>'+importButton('更换文件','back')+'</div><div class="import-counts">'+[['总记录',entries.length,''],['预计新增',valid,'success'],['重复待跳过',duplicates,'warning'],['错误待修正',errors,'error']].map(([l,n,c])=>'<div class="'+c+'"><span>'+l+'</span><strong>'+n+'</strong></div>').join('')+'</div>'+(errors?'<div class="import-alert error" role="alert"><strong>有 '+errors+' 条错误记录，整批暂不能导入</strong><p>下载问题清单，对照原文件行号修正后重新上传。重复记录无需删除，确认时自动跳过。</p>'+importButton('下载问题清单','issues')+'</div>':'<div class="import-alert '+(duplicates?'warning':'success')+'"><strong>'+(duplicates?'校验通过，'+duplicates+' 条重复记录将在确认时跳过':'全部记录校验通过')+'</strong><p>查重基于当前虚构演示档案；正式页面由后台进行最终查重。</p></div>')+(s.preview.ignoredColumns.length?'<p class="muted">未识别列将忽略：'+s.preview.ignoredColumns.map(esc).join('、')+'</p>':'')+'<div class="import-preview-tools"><div class="row">'+[['all','全部记录'],['errors','仅错误'],['duplicates','仅重复']].map(([k,l])=>'<button type="button" data-action="patient-import-filter" data-id="'+k+'" class="'+(s.filter===k?'active':'')+'" aria-pressed="'+(s.filter===k)+'">'+l+'</button>').join('')+'</div><span class="muted">行号与原文件一致</span></div><div id="patient-import-preview">'+patientImportPreview()+'</div><section class="import-assignment"><h3>统一分配与建档设置</h3><div class="form-grid">'+importSelect('doctor_id','责任医生',[['','请选择责任医生'],...doctors],v.doctor_id,true)+importSelect('owner_id','负责人',owners,v.owner_id,true,!manager())+importSelect('patient_type','患者类型',importTypes,v.patient_type)+importSelect('source_scene','来源场景',importScenes,v.source_scene)+importSelect('org_id','来源机构',[['','不指定'],['1','虚构示范医院']],v.org_id)+'</div>'+(!manager()?'<p class="muted">本批患者由您本人负责，责任医生仍需选择。</p>':'')+'<label class="import-outreach"><input type="checkbox" name="outreach"'+(v.outreach?' checked':'')+'><span><strong>建档后创建首次联系任务</strong><small>仅为实际新增患者创建待办，后续由负责人跟进；不自动发送消息。</small></span></label><p class="muted">首次联系截止时间按医院 SLA 配置计算，导入页面无需手填。首次联系用于核验身份与服务说明，不代表医生已批准医疗随访。</p><p class="muted">档案来源为“文件导入”，生命周期为“已建档（ENROLLED）”，授权待核验，服务授权未取得，风险为“待评估”。</p></section>';
}
function patientImportPreview(){
  const s=patientImportState,entries=classifyPatientImport().filter(e=>s.filter==='errors'?e.errors.length:s.filter==='duplicates'?e.duplicate:true);
  return table(['文件行号','姓名 / 性别','年龄','联系电话','科室 / 管理原因','来源编号','校验结果'],entries.map(e=>[esc(e.line),'<strong>'+esc(e.values.name||'未填写')+'</strong><br><small class="muted">'+esc({MALE:'男',FEMALE:'女',UNKNOWN:'未知'}[e.row.gender]||e.values.gender||'未知')+'</small>',esc(e.values.age),esc(e.values.phone),esc(e.values.department)+'<br><small class="muted">'+esc(e.values.disease)+'</small>',esc(e.values.external_id||'—'),e.errors.length?importStatus('需修正','error')+'<div class="import-row-errors">'+e.errors.map(esc).join('<br>')+'</div>':e.duplicate?importStatus('将跳过','warning')+'<div class="muted">'+esc(e.duplicate)+'</div>':importStatus('通过','success')]));
}
function patientImportFinished(r){
  return '<div class="import-complete"><span class="import-complete-label">导入完成</span><h3>'+r.created+' 位患者已建档</h3><p>'+r.skipped+' 条重复记录已跳过'+(r.taskCount?'，已创建 '+r.taskCount+' 项首次联系任务':'')+'。患者清单已更新。</p><div class="import-result-meta"><span>责任医生：'+esc(person(r.doctor).name)+'</span><span>负责人：'+esc(person(r.owner).name)+'</span><span>批次：'+esc(r.batch)+'</span></div></div>'+(r.skipped?'<section><h3>跳过记录与原因</h3>'+table(['文件行号','原因'],r.messages.map(m=>[esc(m.line),esc(m.reason)+'；保留已有档案，不重新分配']))+'</section>':'')+'<div class="import-next"><strong>接下来</strong><p>先核验身份、确认服务用途授权并完成管家交接；再补充原报告、建立对应就诊事件的服务旅程。'+(r.taskCount?'首次联系任务由负责人继续处理。':'本批次未创建首次联系任务。')+'</p>'+(r.created?importButton('查看本次新增患者','view','primary')+link('登记授权与责任分工','/patients','btn')+link('建立门诊 / 出院旅程','/journeys','btn'):'')+'</div>';
}
async function readPatientImportFile(file){
  const s=patientImportState;if(!s||s.busy||!file)return;
  s.file={name:file.name};s.preview=null;s.error='';s.busy=true;renderPatientImport();
  try{s.preview=await PatientImportFiles.parsePatientFile(file)}catch(error){s.error=error.message}
  if(patientImportState!==s)return;s.busy=false;renderPatientImport();
}
function loadPatientImportSample(invalid=false){
  const s=patientImportState;if(!s||s.busy)return;
  const records=structuredClone(importSample);if(invalid){records[1].cells[2]='150';records[1].cells[3]='错误电话'}
  s.preview=PatientImportFiles.normalizePatientRows([{line:1,cells:['姓名','性别','年龄','联系电话','科室','病种/管理原因','来源编号']},...records]);
  s.file={name:invalid?'虚构患者_错误样例.csv':'虚构患者_正确与重复样例.csv'};s.error='';s.filter='all';renderPatientImport();
}
async function submitPatientImport(){
  const s=patientImportState;if(!s||s.busy||!canOperate()||!s.preview||s.step!==2)return;
  const entries=classifyPatientImport(),v=s.settings;
  if(entries.some(e=>e.errors.length)||!demo.accounts.some(a=>a.id===Number(v.doctor_id)&&a.role==='DOCTOR'&&a.active)||!demo.accounts.some(a=>a.id===Number(v.owner_id)&&['MANAGER','OPERATOR','NURSE'].includes(a.role)&&a.active)||(!manager()&&Number(v.owner_id)!==account.id))return;
  if(!importTypes.some(([k])=>k===v.patient_type)||!importScenes.some(([k])=>k===v.source_scene)||!['','1'].includes(v.org_id))return toast('建档设置无效，请重新选择。');const actor=account.id;s.busy=true;renderPatientImport();await Promise.resolve();if(patientImportState!==s||account?.id!==actor){s.busy=false;return}
  const r={batch:s.batch,actor:account.id,doctor:Number(v.doctor_id),owner:Number(v.owner_id),created:0,skipped:0,taskCount:0,messages:[]};
  let patientId=Math.max(0,...demo.patients.map(p=>p.id)),taskId=Math.max(0,...demo.tasks.map(t=>t.id));
  for(const e of entries){
    if(e.duplicate){r.skipped++;r.messages.push({line:e.line,reason:e.duplicate});continue}
    const p={...e.row,id:++patientId,doctor:r.doctor,owner:r.owner,source:'FILE_IMPORT',external:e.row.external_id||'',batch:s.batch,risk:'待评估',lifecycle:implementationContract.patientImport.lifecycle,identity_status:'PENDING',service_consent:false,patient_type:v.patient_type,source_scene:v.source_scene,org_id:v.org_id};
    demo.patients.push(p);r.created++;
    if(v.outreach){demo.tasks.push({id:++taskId,patient:p.id,record:null,title:'文件建档后首次联系',type:'OUTREACH',status:'PENDING',due:patientImportDeadline(),draft:'',approved:'',version:1});r.taskCount++}
    audit('文件导入建档；批次 '+s.batch,p.id);
  }
  audit('文件导入批次 '+s.batch+'：新增 '+r.created+'，跳过 '+r.skipped);
  lastPatientImport=r;s.result=r;s.step=3;s.busy=false;render();renderPatientImport();
}
document.addEventListener('click',async event=>{
  const b=event.target.closest('[data-action^="patient-import-"]');if(!b||b.disabled||!canOperate())return;
  const action=b.dataset.action.slice('patient-import-'.length),s=patientImportState;
  if(action==='open'){openPatientImport();return}
  if(action==='result'&&lastPatientImport?.actor===account.id){patientImportState={step:3,result:lastPatientImport};renderPatientImport();$('#dialog').showModal();return}
  if(action==='template'){
    b.disabled=true;b.textContent='正在生成…';
    try{importDownload(await PatientImportFiles.createPatientTemplate(),'患者中心导入模板.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
    catch{toast('模板生成失败，请重试。')}
    finally{b.disabled=false;b.textContent='下载 Excel 空白模板'}return;
  }
  if(!s||s.busy)return;
  if(['close','finish','view'].includes(action)){
    const batch=s.result?.batch;$('#dialog').close();
    if(action==='view')go('/patients?batch='+batch);else if(action==='finish')go('/patients');return;
  }
  if(action==='again'){patientImportState=null;openPatientImport();return}
  if(action==='sample'||action==='invalid'){loadPatientImportSample(action==='invalid');return}
  if(action==='reselect'){$('#patient-import-file').click();return}
  if(action==='next'&&s.preview){s.step=2;renderPatientImport();$('#dialog').scrollTop=0;return}
  if(action==='back'){s.step=1;renderPatientImport();$('#dialog').scrollTop=0;return}
  if(action==='filter'){s.filter=b.dataset.id;renderPatientImport();return}
  if(action==='issues'){
    const rows=s.preview.entries.filter(e=>e.errors.length).map(e=>[e.line,e.errors.join('；')]);
    importDownload(importCsv([['原文件行号','修正原因'],...rows]),'患者导入问题清单.csv','text/csv;charset=utf-8');return;
  }
  if(action==='submit')await submitPatientImport();
});
document.addEventListener('change',event=>{
  if(event.target.id==='patient-import-file'){readPatientImportFile(event.target.files[0]);return}
  if(!event.target.closest('.import-assignment')||!patientImportState||patientImportState.busy)return;
  const input=event.target;patientImportState.settings[input.name]=input.type==='checkbox'?input.checked:input.value;
  const submit=$('[data-action="patient-import-submit"]');if(submit)submit.disabled=!!patientImportState.preview.errors.length||!patientImportState.settings.doctor_id||!patientImportState.settings.owner_id;
});
document.addEventListener('dragover',event=>{const drop=event.target.closest('#patient-import-drop');if(drop){event.preventDefault();drop.classList.add('dragging')}});
document.addEventListener('dragleave',event=>{const drop=event.target.closest('#patient-import-drop');if(drop&&!drop.contains(event.relatedTarget))drop.classList.remove('dragging')});
document.addEventListener('drop',event=>{
  const drop=event.target.closest('#patient-import-drop');if(!drop)return;event.preventDefault();drop.classList.remove('dragging');
  if(!patientImportState||patientImportState.busy)return;
  if(event.dataTransfer.files.length!==1){patientImportState.preview=null;patientImportState.file=null;patientImportState.error='每次请选择一个文件';renderPatientImport();return}
  readPatientImportFile(event.dataTransfer.files[0]);
});
document.addEventListener('DOMContentLoaded',()=>{
  $('#dialog').addEventListener('cancel',event=>{if(patientImportState?.busy)event.preventDefault()});
  $('#dialog').addEventListener('close',()=>{patientImportState=null;$('#dialog').classList.remove('patient-import-dialog');$('#dialog').removeAttribute('aria-labelledby')});
});

function patientImportDeadline(){const at=new Date();at.setHours(at.getHours()+implementationContract.patientImport.defaultFirstContactHours);return at.toISOString().slice(0,16)}
