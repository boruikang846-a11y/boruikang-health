(() => {
  'use strict';
  const catalog = window.AECG_CATALOG;
  const root = document.body.dataset.root || '';
  const key = document.body.dataset.page;
  const app = document.getElementById('app');
  const entries = Object.fromEntries(catalog.map(p => [p.key, p]));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const url = page => root + entries[page].html;
  const link = (page, text, cls = '') => `<a class="${cls}" href="${url(page)}">${esc(text)}</a>`;
  const icon = name => {
    const shapes = {
      home: '<path d="m3 10 9-7 9 7v10H7V10m10 10V10"/>',
      screening: '<path d="M3 5h7l2 3h9v12H3zM3 5V3h7l2 2"/><circle cx="16" cy="15" r="3"/><path d="m18 17 3 3"/>',
      follow: '<path d="M12 3v15M5 20c-5-4 1-6 2-6m10 0c5 2 7 4 2 6-4 2-10 2-14 0M9 9l3-4 3 4"/><circle cx="12" cy="2" r="1"/>',
      refinement: '<path d="M3 3h12l6 6v12H3zM15 3v6h6M7 13h10M12 10v8"/>',
      person: '<circle cx="12" cy="7" r="4"/><path d="M5 22v-4a7 7 0 0 1 14 0v4"/>',
    };
    return `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">${shapes[name] || shapes.screening}</svg>`;
  };
  const logo = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="m20 1 18 10v19L20 40 2 30V11z" fill="#10b9f5"/><path d="m20 1 18 10v19L20 40z" fill="#1677ff"/><circle cx="20" cy="11" r="5" fill="white"/><path d="M17 23c-12 4-16-10-5-9l8 6c11-9 21 3 7 9l-5-2v7c0 7-6 7-6 0z" fill="white"/></svg>';
  const modules = {screening:'筛查干预','follow-up':'随访管理',refinement:'精细化管理',system:'系统菜单'};
  const firstPages = {screening:'home','follow-up':'all-patients',refinement:'service-package-activation'};
  const empty = (cls = '') => `<div class="empty ${cls}"><svg viewBox="0 0 80 56" aria-hidden="true"><ellipse cx="40" cy="48" rx="36" ry="5" fill="#f5f5f5"/><path d="m14 25 12-17h28l12 17v19a4 4 0 0 1-4 4H18a4 4 0 0 1-4-4z" fill="#fafafa" stroke="#ddd"/><path d="M14 25h15l4 7h14l4-7h15" fill="none" stroke="#ddd"/></svg><span>暂无数据</span></div>`;
  const button = (text, action = 'demo', cls = '', extra = '') => `<button type="button" class="${cls}" data-action="${action}" ${extra}>${text}</button>`;
  const tabs = (items, active, cls = 'tab-bar') => `<div class="${cls}">${items.map(([page,text]) => link(page,text,page === active ? 'tab-link active' : 'tab-link')).join('')}</div>`;
  const patients = Array.from({length:12}, (_,i) => ({
    name:`演示患者${String(i+1).padStart(2,'0')}`, sex:i % 2 ? '男':'女', age:27+i*4,
    id:`DEMO-${String(i+1).padStart(6,'0')}`, phone:`演示号码 ${String(i+1).padStart(4,'0')}`,
    label:'--', group:'未分组', date:'2026-09-18 09:21', status:'未预约',
  }));
  const patientName = p => `${p.name}（${p.sex}，${p.age} 岁）`;
  const filteredPatients = () => patients;
  const baseMap = {
    'screening-home':'home','high-risk-screening':'home','follow-up-overview':'all-patients','refinement-overview':'service-package-activation',
    'organization-combobox':'home','user-menu':'home','activity-effect-detail':'home',
    'emergency-warning-patient-detail':'critical-alert','one-network-coronary-heart-disease':'one-network-coronary-tab',
    'group-management-dialog':'one-network-detection','new-activity-form':'activity-management',
    'referral-management':'referral-records-received','referral-received-empty':'referral-records-received','referral-initiated-empty':'referral-records-initiated',
    'new-education-category-form':'education-categories','new-education-article-form':'education-articles',
    'service-task-transfer-dialog':'service-package-tasks','follow-up-form-distribution-dialog':'follow-up-form-pending-tab',
  };
  const patientKeys = ['patient-detail-overview','patient-inspection-tab','patient-vitals-tab','patient-follow-up-assessment-tab','patient-service-tasks-tab'];
  const base = patientKeys.includes(key) ? 'all-patients' : (baseMap[key] || key);
  const activeModule = entries[base]?.module === 'system' ? 'screening' : entries[base]?.module;
  const menus = {
    screening:[
      ['','首页',[['home','首页']]],
      ['高危筛查','高危筛查',[['critical-alert','危急预警'],['one-network-detection','一张网检出'],['physical-exam-detection','体检检出'],['health-screening','健康筛查'],['stroke-screening','卒中筛查'],['high-risk-patients','高危患者'],['invitation-records','邀约记录'],['appointment-records','预约记录']]],
      ['活动管理','活动管理',[['activity-management','活动管理'],['project-management','项目管理']]],
      ['转诊管理','转诊管理',[['referral-records-received','转诊记录']]],
    ],
    'follow-up':[
      ['患者管理','患者管理',[['all-patients','全部患者'],['my-patients','我的患者'],['focus-patients','重点关注'],['patient-blacklist','患者黑名单']]],
      ['随访管理','随访管理',[['follow-up-plans','随访方案'],['follow-up-forms','随访表单']]],
      ['宣教管理','宣教管理',[['education-categories','宣教分类'],['education-articles','宣教文章']]],
    ],
    refinement:[['疾病精细化管理','疾病精细化管理',[['service-package-activation','服务包激活'],['service-package-tasks','服务包任务']]]],
  };
  const navActive = base.startsWith('follow-up-form-') ? 'follow-up-forms'
    : base.startsWith('one-network-') ? 'one-network-detection'
    : base === 'invitation-by-patient' ? 'invitation-records'
    : base.startsWith('referral-') ? 'referral-records-received' : base;
  const sidebar = () => menus[activeModule].map(([group,title,items]) => {
    if (!group) return link('home', '⌂　首页', 'nav-item' + (navActive === 'home' ? ' active':''));
    const selected = items.some(([p]) => p === navActive);
    const open = selected || activeModule === 'refinement' || group === '高危筛查';
    return `<details class="nav-group ${selected ? 'has-active':''}" ${open ? 'open':''}><summary>${icon(group === '患者管理' ? 'person':'screening')}${esc(title)}</summary>${items.map(([p,t]) => link(p,t,'nav-item sub'+(p === navActive ? ' active':''))).join('')}</details>`;
  }).join('');
  function header() {
    return `<header class="app-header"><a class="brand" href="${root}index.html" style="color:white">${logo}<span>全病程管理</span></a>${Object.entries(firstPages).map(([m,p])=>`<a href="${url(p)}" class="module-link ${activeModule === m ? 'active':''}">${icon(m === 'follow-up'?'follow':m)}${modules[m]}</a>`).join('')}<div class="header-right"><select class="org-select" aria-label="切换组织"><option>演示医院心血管内科</option><option>医院 A · 演示组织</option><option>医院 B · 演示组织</option></select>${button('演示医生 ▾','user-menu','user-button')}</div></header>`;
  }
  function filters(fields, expanded = true) {
    return `<form class="filters" data-filter>${fields.map(([label,type = 'text',options]) => `<label>${esc(label)}：${type === 'select' ? `<select name="${esc(label)}"><option value="">请选择${esc(label)}</option>${(options || ['全部','男','女']).map(v=>`<option>${esc(v)}</option>`).join('')}</select>` : `<input type="${type}" name="${esc(label)}" placeholder="请输入${esc(label)}" aria-label="${esc(label)}">`}</label>`).join('')}<div class="actions"><button class="primary" type="submit">⌕ 查询</button><button type="reset">⟳ 重置</button>${expanded ? button('展开 ⌄','expand-filters','link-button'):''}</div>${expanded ? '<div class="extra-filters"><label>标签：<select name="标签"><option value="">全部标签</option><option>演示标签</option></select></label><label>分组：<select name="分组"><option value="">全部分组</option><option>未分组</option></select></label></div>':''}</form>`;
  }
  function table(headers, rows = [], attrs = '') {
    return `<div class="table-wrap"><table ${attrs}><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((row,i)=>`<tr data-row="${i}">${row.map(cell=>`<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table>${rows.length ? '' : empty()}</div>`;
  }
  function pagination(total) {
    return `<div class="pagination"><span data-total>共 ${total} 条记录</span>${button('‹','page')}<button type="button" class="current" data-action="page">1</button>${[2,3,4,5].map(n=>button(n,'page')).join('')}<span>…</span>${button('›','page')}<select aria-label="每页数量" data-page-size><option value="10">10 条/页</option><option value="20" selected>20 条/页</option></select><span>跳至</span><input type="number" min="1" max="5" value="1" aria-label="页码" data-page-input><span>页</span></div>`;
  }
  function listPanel(headers, rows = [], opts = {}) {
    return `<section class="panel pad">${opts.toolbar ? `<div class="table-toolbar">${opts.toolbar}</div>`:''}${table(headers,rows,opts.attrs || '')}${rows.length ? pagination(rows.length):''}</section>`;
  }
  const nameLink = p => link('patient-detail-overview',patientName(p));
  const dateFilters = [['检出时间','date'],['姓名'],['手机号'],['身份证号']];
  const commonFields = [['姓名'],['手机号'],['身份证号']];
  function funnel(detail = false) {
    const labels = detail ? ['邀约患者量','愿意就诊量','门诊预约量','实际到诊量','入院治疗量','手术治疗量'] : ['总筛查量','高危识别量','邀约患者量','愿意就诊量','门诊预约量','实际到诊量','入院治疗量','手术治疗量'];
    const values = detail ? ['21人 / 24次','8人','0人','0人','0人','0人'] : ['16243人 / 17367次','3655人','21人 / 24次','8人','0人','0人','0人','0人'];
    const rates = detail ? [38.1,0,0,0,0] : [22.5,38.1,0,0,0,0];
    const rateLabels = detail ? ['愿意就诊率','门诊预约率','实际到诊率','入院转化率','手术转化率'] : ['高危识别率','愿意就诊率','门诊预约率','实际到诊率','入院转化率','手术转化率'];
    const definitions = detail ? ['愿意就诊量/邀约患者量','门诊预约量/邀约患者量','实际到诊量/邀约患者量','入院治疗量/邀约患者量','手术治疗量/邀约患者量'] : ['高危识别量/总筛查量','愿意就诊量/邀约患者量','门诊预约量/邀约患者量','实际到诊量/邀约患者量','入院治疗量/邀约患者量','手术治疗量/邀约患者量'];
    return `<div class="charts"><div><h3>筛查转化情况漏斗图</h3><div class="funnel">${labels.map((label,i)=>`<div class="funnel-row" style="width:${100-i*8}%;background:hsl(219,85%,${46+i*5.5}%)"><span>${label}</span><span>${values[i]}</span></div>`).join('')}</div></div><div><h3>各环节转化率分析</h3>${rates.map((rate,i)=>`<div class="conversion-row"><span>${rateLabels[i]}</span><div class="bar ${rate ? 'filled':''}"><span style="width:${rate}%"></span><b>${rate}%</b></div><small>${definitions[i]}</small></div>`).join('')}</div></div>`;
  }
  function dashboard() {
    return `<section class="panel"><div class="panel-heading"><span>统计</span>${button('↗ 导出报告','export','primary')}</div><div class="chart-card"><div class="chart-heading"><h3><span style="color:#1677ff">▽</span> 筛查流程转化分析</h3><form data-chart-filter><span>统计日期：</span><input type="date" aria-label="开始日期"><span>→</span><input type="date" aria-label="结束日期"><button class="primary" type="submit">⌕ 查询</button><button type="reset">⟳ 重置</button></form></div>${funnel()}</div><div class="activity-effect"><h3>活动成效分析</h3><div class="effect-card"><strong>演示筛查活动</strong><span>邀约患者：21 人</span><span>愿意就诊：8 人</span>${link('activity-effect-detail','活动成效详情 →')}</div></div></section>`;
  }
  function patientList(page) {
    const populated = ['all-patients','my-patients'].includes(page);
    const headers = ['序号','姓名','身份证号','手机号',page === 'patient-blacklist' ? '分组':'所在地',...(populated ? [] : [page === 'focus-patients' ? '就诊状态':'标签']),...(page === 'focus-patients' ? ['随访方案'] : ['操作'])];
    const rows = populated ? filteredPatients().map((p,i)=>[i+1,nameLink(p),p.id,p.phone,'--',`${link('group-management-dialog','加入服务包','danger-link')}${button('退出工作室','demo','link-button danger-link')}`]) : [];
    return filters([['关键字'],['性别','select',['男','女']],...(!populated ? [['年龄','number']] : [['标签','select',['演示标签']]])])+listPanel(headers,rows,{attrs:'data-patient-table'});
  }
  function network(coronary) {
    const choices = coronary ? [['全部',1456],['异常Q波',541],['ST段压低',514],['T波倒置',318],['R波递增不良',293]] : [['全部',2319],['房颤',438],['房扑',60],['频发室早、室速',451],['高度或三度房室传导阻滞',1389],['预激综合征',33]];
    const rows = patients.slice(0,7).map((p,i)=>[i+1,nameLink(p),p.phone,p.id,`${link('patient-detail-overview','已入组')}${button('标记非高危','demo','link-button')}${link('group-management-dialog','入组管理')}`]);
    return filters(dateFilters)+`<div class="split-layout"><div class="disease-list"><div class="tab-bar">${link('one-network-detection','心律失常','tab-link'+(!coronary?' active':''))}${link('one-network-coronary-tab','冠心病','tab-link'+(coronary?' active':''))}</div>${choices.map(([t,n],i)=>`<button class="disease-option link-button ${i===0?'active':''}" style="width:100%" data-action="disease-filter">${t}<span class="badge">${n}</span></button>`).join('')}<a class="non-emergency" href="#" data-action="non-emergency">非高危患者（0）</a></div>${listPanel(['序号','姓名','手机号','身份证号','操作'],rows,{toolbar:button('↗ 导出','export','primary'),attrs:'data-patient-table'})}</div>`;
  }
  const referralTabs = [['referral-records-received','接收的转诊'],['referral-records-initiated','发起的转诊']];
  const invitationTabs = [['invitation-records','按记录展示'],['invitation-by-patient','按患者展示']];
  const followTabs = [['follow-up-form-pending-tab','待处理'],['follow-up-form-in-progress-tab','进行中'],['follow-up-form-completed-tab','已完成'],['follow-up-form-statistics-tab','统计']];
  function followForms() {
    const names = ['测试表单-患者填报','测试表单-医生填报','高危患者专业随访表','术后症状评估','H2FPEF舒张性心衰评估','EHRA房颤症状分级','APPLE评分','用药调查'];
    return filters([['表单名称']],false)+`<div class="forms-grid">${names.map((name,i)=>`<article class="form-card" data-form-name="${esc(name)}"><h2 title="${name}">${name}</h2><p>表单分类：默认</p><p>填写对象：${i === 0 || i === 3 ? '患者':i===2?'医生，患者':'医生'}</p><div class="card-actions">${link('follow-up-form-pending-tab','进入','primary-link')}${[0,2,3].includes(i)?link('follow-up-form-distribution-dialog','发放','primary-link'):button('发放','demo','','disabled')}</div></article>`).join('')}</div>`;
  }
  function followDetail(page) {
    const top = tabs(followTabs,page).replace('</div>',`${page === 'follow-up-form-statistics-tab' ? '' : link('follow-up-form-distribution-dialog','发放','primary-link')}</div>`);
    if (page === 'follow-up-form-statistics-tab') {
      const questions = ['您是否有时忘记服药？','在过去的2周内，是否有一天或几天忘记服药？','您是否曾自行停止服药？'];
      return `<section class="panel pad">${top}${filters([['完成时间','date']],false)}<p>表单名称：测试表单-患者填报　　有效填报数：0</p>${questions.map((q,i)=>`<div class="stat-question"><h4>${i+1}. ${q}</h4>${table(['选项','小计','比例'],['是','否'].map(a=>[a,0,'<div class="bar"></div> 0%']))}<p style="text-align:right">本题有效填写次数：0</p></div>`).join('')}</section>`;
    }
    const headers = page.endsWith('completed-tab') ? ['序号','姓名','手机号','完成时间','完成人员','最新随访时间','操作'] : page.endsWith('in-progress-tab') ? ['序号','姓名','手机号','上次操作时间','操作'] : ['序号','姓名','手机号','分配时间','操作'];
    return `<section class="panel pad">${top}${filters([['姓名'],['来源','select',['患者','医生']],['关联时间','date']],false)}${table(headers)}</section>`;
  }
  function pageContent(page) {
    if (page === 'home') return dashboard();
    if (['all-patients','my-patients','focus-patients','patient-blacklist'].includes(page)) return patientList(page);
    if (page.startsWith('one-network-')) return network(page !== 'one-network-detection');
    if (page === 'follow-up-plans') return empty('large');
    if (page === 'follow-up-forms') return followForms();
    if (page.startsWith('follow-up-form-')) return followDetail(page);
    if (page === 'critical-alert') return filters(dateFilters)+listPanel(['序号','姓名','手机号','身份证号','紧急联系人','检出机构','预警时间'],patients.slice(0,7).map((p,i)=>[i+1,link('emergency-warning-patient-detail',patientName(p)),p.phone,p.id,'--','演示医院',p.date]),{toolbar:button('↗ 导出','export','primary'),attrs:'data-patient-table'});
    if (page === 'high-risk-patients') return filters([...commonFields,['年龄','number']])+listPanel(['序号','姓名','手机号','身份证号','最新邀约情况','计划邀约方案','操作'],patients.slice(0,8).map((p,i)=>[i+1,nameLink(p),p.phone,p.id,i%3===0?'已治疗':'未邀约','--',`${button('邀约管理','demo','link-button')}${link('patient-detail-overview','就诊记录')}`]),{toolbar:button('↗ 导出','export','primary'),attrs:'data-patient-table'});
    if (page.startsWith('invitation-')) return tabs(invitationTabs,page)+filters([...commonFields,['邀约日期','date']])+listPanel(['序号','姓名','手机号','身份证号',...(page==='invitation-records'?['邀约结果','邀约时间']:['科室','最新邀约时间','邀约次数']),'操作'],patients.slice(0,7).map((p,i)=>[i+1,nameLink(p),p.phone,p.id,...(page==='invitation-records'?['--',p.date]:['--',p.date,2]),link('patient-detail-overview','邀约详情')]),{toolbar:button('↗ 导出','export','primary'),attrs:'data-patient-table'});
    if (page.startsWith('referral-records-')) return tabs(referralTabs,page)+filters([...commonFields,['转诊类型','select',['门诊','住院']]])+listPanel(['序号','姓名','手机号','身份证号','紧急联系人','转诊类型',...(page.endsWith('initiated')?['转诊至']:[]),'操作']);
    if (page === 'activity-management') return filters([['活动类型','select',['日常邀约','筛查干预']],['活动名称'],['状态','select',['进行中','已结束']]],false)+listPanel(['序号','活动名称','活动类型','活动时间','活动负责人','操作'],[],{toolbar:link('new-activity-form','新增活动','primary-link')});
    if (page === 'project-management') return filters([['项目名称'],['状态','select',['进行中','已结束']]],false)+listPanel(['序号','项目名称','创建时间','操作'],[],{toolbar:button('新增项目','new-project','primary')});
    if (page === 'education-categories') return filters([['分类名称']],false)+listPanel(['序号','分类名称','关联宣教文章数','创建时间','操作'],[],{toolbar:link('new-education-category-form','新增','primary-link')});
    if (page === 'education-articles') return filters([['关键字'],['来源','select',['默认','科普视频']],['启用状态','select',['已启用','未启用']],['宣教分类','select',['默认']]],false)+listPanel(['<input type="checkbox" aria-label="全选宣教文章" data-select-all>','序号','标题','内容介绍','操作'],['健康生活习惯指南','出院后的日常自我管理','了解常见检查项目','合理安排运动与休息','健康饮食知识','居家健康记录方法'].map((t,i)=>['<input type="checkbox" aria-label="选择宣教文章">',i+1,button(t,'demo','link-button'),i%2?'科普视频':'健康知识',`${button('启用','toggle','link-button')}${button('定时发送','demo','link-button')}${button('宣教详情','demo','link-button')}${button('上移','move-up','link-button')}${button('下移','move-down','link-button')}`]),{toolbar:`${button('启用选定','demo','primary')}${link('new-education-article-form','新增','primary-link')}`});
    if (page === 'service-package-activation') return filters([['分组','select',['未分组']],['服务包','select',['演示服务包']],['关键字']])+listPanel(['序号','患者','身份证号','手机号','分组','所属地址','服务包名称','操作']);
    if (page === 'service-package-tasks') return filters([['分组','select',['未分组']],['关键字']],false)+listPanel(['序号','姓名','手机号','分组','待处理事项','已处理','操作'],patients.slice(0,8).map((p,i)=>[i+1,p.name,p.phone,p.group,0,0,link('service-task-transfer-dialog','转交任务')]),{toolbar:`<span class="toolbar-text">统计信息　已激活服务包：0个　已分配患者：0人</span>${button('筛选','demo','primary')}`,attrs:'data-patient-table'});
    const specs = {
      'physical-exam-detection':[['序号','姓名','手机号','身份证号','紧急联系人','检出机构','检出时间','微信绑定','未处理原因','标记状态','已入组','操作'],button('导入体检数据','demo','primary')],
      'health-screening':[['序号','姓名','手机号','身份证号','高危类型','最新筛查时间','健康指标','检查状态','标记状态','已入组','操作'],''],
      'stroke-screening':[['序号','姓名','手机号','身份证号','筛查结论','入组状态','操作'],''],
      'appointment-records':[['序号','姓名','手机号','身份证号','紧急联系人','科室','预约情况','预约时间','操作'],''],
    };
    if (specs[page]) return filters([...commonFields,['检出时间','date']])+listPanel(specs[page][0],[],{toolbar:specs[page][1]});
    throw new Error(`Missing page renderer: ${page}`);
  }
  const formLine = (label,field,required = false) => `<div class="form-line"><span class="${required?'required':''}">${label}：</span><div class="field">${field}</div></div>`;
  const textField = (placeholder, required = false) => `<input placeholder="${placeholder}" aria-label="${placeholder}" ${required?'required':''}>`;
  const selectField = (label,options,required = false) => `<select aria-label="${label}" ${required?'required':''}><option value="">请选择${label}</option>${options.map(t=>`<option>${t}</option>`).join('')}</select>`;
  function modalShell(title,body,size = '',footer = true) {
    const tag = body.includes('data-filter') ? 'div' : 'form';
    return `<div class="modal-mask"><section class="modal ${size}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-header"><span>${title}</span>${button('×','close-modal','close-modal','aria-label="关闭弹窗"')}</div><${tag} ${tag==='form'?'data-preview-form':''}><div class="modal-body">${body}</div>${footer?`<div class="modal-footer">${button('取消','close-modal')}<button class="primary" ${tag==='form'?'type="submit"':'type="button" data-action="validate-dialog"'}>确定</button></div>`:''}</${tag}></section></div>`;
  }
  function patientDetail(page) {
    const p = patients[0];
    const patientTabs = [['patient-detail-overview','病程事件'],['patient-inspection-tab','检查检验'],['#','用药记录'],['patient-vitals-tab','体征参数'],['patient-follow-up-assessment-tab','随访评估'],['patient-service-tasks-tab','服务任务'],['#','预约记录']];
    const bar = `<div class="patient-tabs">${patientTabs.map(([k,t])=>k === '#' ? `<a href="#" data-action="patient-empty-tab">${t}</a>`:link(k,t,k===page?'active':'')).join('')}</div>`;
    let content;
    if (page === 'patient-detail-overview') content = `<div class="patient-split"><div><div class="tab-bar">${['全部','门诊','急诊','住院','出院'].map((t,i)=>`<a class="tab-link ${!i?'active':''}" href="#" data-action="patient-event-tab">${t}</a>`).join('')}</div>${empty()}</div><div><strong>病程事件详情</strong><div style="margin-top:14px">${empty('blue')}</div></div></div>`;
    if (page === 'patient-inspection-tab') content = `<div class="patient-split"><div><div class="tab-bar">${['全部','检验类','影像类','功能类','病理类'].map((t,i)=>`<a class="tab-link ${!i?'active':''}" href="#" data-action="patient-event-tab">${t}</a>`).join('')}</div><div class="inspection-item">检查类型：演示检查<br>检查时间：2026-09-18 09:26</div></div><div><strong>检查检验详情</strong><div class="inspection-item" style="margin-top:14px;min-height:260px">检查类型：演示检查<br>内容：<br>此处为检查检验内容示意。<br>图片：--<br>文件：--</div></div></div>`;
    if (page === 'patient-service-tasks-tab') content = table(['序号','服务包名称','服务周期','服务状态','来源类型','是否需要激活','激活时间','激活操作员','创建时间']);
    if (page === 'patient-vitals-tab') content = filters([['来源ID'],['数据来源','select',['演示数据']],['指标类型','select',['身高','体重']],['测量时间','date']],false)+table(['序号','测量时间','数据来源','来源类型','测量状态','诊断状态','分析状态','解读状态','测量时长'],[[1,'2026-09-18 09:26','演示数据','体征','--','--','--','--','--']]);
    if (page === 'patient-follow-up-assessment-tab') content = `<div class="patient-split"><div><div class="tab-bar"><a href="#" class="tab-link active" data-action="patient-event-tab">全部</a></div>${empty()}${button('填写','demo','primary','style="width:100%"')}</div><div>${table(['序号','状态','关联类型','完成时间','完成人员','最新随访时间','操作'])}</div></div>`;
    return `<div class="modal-mask"><section class="modal full patient-modal" role="dialog" aria-modal="true" aria-label="患者详情"><div class="modal-header"><span>【${patientName(p)}】　<span style="color:#1677ff">✎</span>　${button('设为重点关注','toggle','link-button')}</span>${button('×','close-modal','close-modal','aria-label="关闭弹窗"')}</div><div class="modal-body"><div class="patient-header"><div class="patient-info"><span>身份证号：${p.id}</span><span>手机号：${p.phone}</span><span>出生日期：演示日期</span><span>身高：--</span><span>体重：--</span><span>BMI：--</span><span style="grid-column:1/-1">家庭地址：--</span></div><div class="patient-info white"><span>标签：<a href="#" data-action="demo">✎</a></span><span>分组：<a href="#" data-action="demo">✎</a></span><span>诊断：--</span><span>随访方案：--</span><span>主管医生：--</span><span>主管护士：--</span><span>邀请接入医生：演示医生</span><span>入组时间：2026-09-18</span><span>接入时间：--</span></div></div>${bar}<div class="patient-content">${content}</div></div></section></div>`;
  }
  function modalFor(page) {
    if (patientKeys.includes(page)) return patientDetail(page);
    if (page === 'activity-effect-detail') return modalShell('【演示筛查活动】活动成效详情',`<h3 style="margin:0">▽ 筛查流程转化分析</h3>${funnel(true)}`,'medium');
    if (page === 'group-management-dialog') return modalShell('入组管理',formLine('标签',selectField('标签',['演示标签']))+formLine('分组',selectField('分组',['未分组','演示分组']))+formLine('重点关注','<label><input type="checkbox">重点关注</label>'),'small');
    if (page === 'new-education-category-form') return modalShell('新增',formLine('分类名称',textField('请输入分类名称',true),true),'small');
    if (page === 'new-education-article-form') return modalShell('新增',formLine('标题',textField('请输入标题',true),true)+formLine('分类',selectField('分类',['默认']))+formLine('文章内容','<div class="editor-toolbar"><span>B</span><span><i>I</i></span><span>段落 ▾</span><span>≡</span><span>↗</span></div><div class="editor" contenteditable="true" role="textbox" aria-label="文章内容"></div>'),'medium');
    if (page === 'new-activity-form') return modalShell('新增活动','<h4 style="margin-top:0">基础信息</h4>'+formLine('活动类型','<label><input name="activity-type" type="radio" value="邀约" checked>日常邀约</label><label><input name="activity-type" type="radio" value="干预">筛查干预</label>',true)+formLine('活动名称',textField('请输入活动名称',true),true)+formLine('活动时间','<input type="datetime-local" aria-label="活动开始时间" required>　至　<input type="datetime-local" aria-label="活动结束时间" required>',true)+'<h4>人员配置</h4>'+formLine('活动负责人',selectField('活动负责人',['演示医生','演示护士'],true),true),'medium');
    if (page === 'service-task-transfer-dialog') return modalShell('转交任务 · 演示人员',formLine('服务角色',selectField('服务角色',['医生','护士'],true)+'<small>备注：每个服务角色需分别转交，一次只能转交一个服务角色的任务。</small>',true)+formLine('转交给',selectField('接续服务医护',['演示医生 A','演示护士 B'],true),true)+formLine('任务列表',button('添加任务','demo','','disabled')+' '+button('批量移除','demo','','disabled')+table(['<input type="checkbox" aria-label="全选任务">','序号','患者','身份证号','手机号','任务名称','任务计划完成时间']),true),'full');
    if (page === 'follow-up-form-distribution-dialog') return modalShell('发放表单',filters([['关键字'],['标签','select',['演示标签']],['分组','select',['未分组']],['性别','select',['男','女']]],false)+table(['<input type="checkbox" aria-label="全选患者" data-select-all>','序号','姓名','身份证号','手机号','标签','分组'],patients.slice(0,7).map((p,i)=>[`<input type="checkbox" aria-label="选择${p.name}">`,i+1,patientName(p),p.id,p.phone,'--','未分组']),'data-patient-table')+pagination(7),'medium');
    if (page === 'emergency-warning-patient-detail') {
      const wave = Array.from({length:8},(_,i)=>`${i*140},62 ${i*140+20},62 ${i*140+25},58 ${i*140+32},62 ${i*140+47},62 ${i*140+52},66 ${i*140+56},18 ${i*140+61},85 ${i*140+67},62 ${i*140+86},62 ${i*140+98},53 ${i*140+113},62 ${i*140+139},62`).join(' ');
      return modalShell('危急预警详情','<h4 style="margin-top:0">预警信息详情</h4><div class="warning-info"><span>姓名：演示患者01（女，27岁）</span><span>预警时间：2026-09-18 09:21</span><span>预警项目：演示预警</span><span>手机号：演示号码 0001</span><span>检出机构：演示医院</span><span>检查部门：演示检查室</span><span>身份证号：DEMO-000001</span><span>检查类型：演示检查</span><span>检查名称：示意波形</span></div><svg class="ecg-chart" viewBox="0 0 1120 240" preserveAspectRatio="none" aria-label="心电图布局示意，非真实检查数据">'+[0,65,130].map(y=>`<polyline transform="translate(0 ${y})" points="${wave}" fill="none" stroke="#664949" stroke-width="1"/>`).join('')+'</svg><p style="color:#999">示意波形，仅用于还原截图布局。</p>','full',false);
    }
    return '';
  }
  function indexPage() {
    const state = {module:'all',query:''};
    app.innerHTML = `<header class="catalog-header"><a class="catalog-logo" href="index.html">${logo}<span>AECG 医生工作站</span></a><span>截图还原 · 本地 HTML 预览</span></header><main class="catalog-main"><section class="catalog-hero"><div><span class="eyebrow">INTERFACE PREVIEW / CDTX</span><h1>从这里，浏览每一个页面。</h1><p>筛查干预、随访管理与精细化管理的页面预览。<br>按原截图还原界面布局，点击菜单、页签和弹窗，查看页面之间的关系。</p><div class="hero-actions">${link('home','开始预览　→','primary-link')}<a href="#page-directory" class="secondary-link">浏览页面目录</a></div></div><div class="catalog-stats"><div><strong>${catalog.length}</strong><span>截图 / HTML 入口</span></div><div><strong>3</strong><span>业务模块</span></div><div><strong>离线</strong><span>双击即可打开</span></div></div></section><div class="catalog-controls" id="page-directory"><div class="catalog-tabs" role="group" aria-label="筛选模块">${[['all','全部页面'],...Object.entries(modules)].map(([m,t])=>`<button type="button" data-module="${m}" class="${m==='all'?'active':''}">${t}</button>`).join('')}</div><label class="catalog-search"><span class="visually-hidden">搜索页面</span><input type="search" placeholder="搜索页面名称或英文文件名" aria-label="搜索页面"></label></div><div id="catalog-results"></div><div class="catalog-note">使用方式：打开任意页面后，可从左侧菜单继续浏览；底部「查看截图」可对照对应截图。<br>HTML 中的个人信息为虚构演示数据；截图由本页虚构演示数据生成。表单和操作仅在本地预览，不连接业务系统。原始参考截图仅保留本地。</div></main>${button('↑','scroll-top','catalog-top','aria-label="回到顶部"')}`;
    const render = () => {
      const matches = catalog.filter(p=>(state.module==='all'||p.module===state.module)&&`${p.title} ${p.key} ${p.image}`.toLowerCase().includes(state.query));
      document.getElementById('catalog-results').innerHTML = Object.entries(modules).map(([m,title])=> {
        const pages = matches.filter(p=>p.module === m);
        if (!pages.length) return '';
        return `<section class="catalog-section"><div class="section-label"><h2>${title}</h2><span>${pages.length} 个预览入口</span></div><div class="catalog-grid">${pages.map(p=>`<article class="catalog-card"><a class="thumbnail" href="${url(p.key)}" aria-label="预览${esc(p.title)}"><img src="${root+p.image}" loading="lazy" alt="${esc(p.title)}预览截图"><span class="kind-label">${p.kind}</span></a><div class="card-body"><h3>${esc(p.title)}</h3><p title="${esc(p.html)}">${esc(p.html)}</p><footer>${link(p.key,'打开 HTML　↗')}<a href="${root+p.image}" data-original="${p.key}">查看截图</a></footer></div></article>`).join('')}</div></section>`;
      }).join('') || '<div class="catalog-no-results">没有找到相关页面，请换一个关键词。</div>';
      document.querySelectorAll('[data-module]').forEach(b=>b.classList.toggle('active',b.dataset.module===state.module));
    };
    app.addEventListener('click', e=> { const b=e.target.closest('[data-module]');if(b){state.module=b.dataset.module;render();} });
    app.querySelector('input[type=search]').addEventListener('input',e=>{state.query=e.target.value.trim().toLowerCase();render();});
    render();
  }
  function prototypePage() {
    const title = entries[base].title;
    const crumb = base.startsWith('follow-up-') ? `<div class="breadcrumb"><span style="color:#1677ff">◆</span>${modules[activeModule]} / <strong>${esc(title)}</strong></div>` : '';
    app.innerHTML = header()+`<aside class="side-nav">${sidebar()}</aside>${button('‹','collapse','collapse-side','aria-label="收起侧栏"')}<main class="main-view">${crumb}${pageContent(base)}</main><footer class="preview-footer"><span>本地 HTML 原型 · 虚构演示数据</span><nav><a href="${root}index.html">返回引导页</a>${button('查看截图','original','link-button')}<a href="${root+entries[key].image}" target="_blank" rel="noopener">截图文件 ↗</a></nav></footer>`+modalFor(key);
    if (key === 'organization-combobox') app.insertAdjacentHTML('beforeend','<div class="org-popover">'+['演示医院心血管内科','医院 A · 演示组织','医院 B · 演示组织'].map(t=>button(t,'select-org')).join('')+'</div>');
    if (key === 'user-menu') showUserMenu();
    if (document.querySelector('.modal-mask')) focusModal();
  }
  let timer;
  function toast(message = '此操作仅用于界面预览，不连接业务系统。') {
    let t = document.querySelector('.toast');
    if (!t) {t=document.createElement('div');t.className='toast';t.setAttribute('role','status');document.body.append(t);}
    t.textContent=message;t.classList.add('visible');clearTimeout(timer);timer=setTimeout(()=>t.classList.remove('visible'),2800);
  }
  let originalKey;
  function showOriginal(page) {
    originalKey=page;
    document.querySelector('.original-dialog')?.remove();
    const p=entries[page];
    document.body.insertAdjacentHTML('beforeend',`<section class="original-dialog" role="dialog" aria-modal="true" aria-label="预览截图"><header><span>${esc(p.title)} · 预览截图（${catalog.findIndex(p=>p.key===page)+1}/${catalog.length}）</span><div class="original-controls">${button('上一张','original-prev')}${button('下一张','original-next')}${button('原始尺寸','original-size')}${button('关闭 ×','close-original')}</div></header><img src="${root+p.image}" alt="${esc(p.title)}预览截图"></section>`);
    document.querySelector('.original-dialog button').focus();
  }
  function showUserMenu() {
    if (document.querySelector('.user-popover')) {document.querySelector('.user-popover').remove();return;}
    app.insertAdjacentHTML('beforeend',`<div class="user-popover">${button('⟳ 退出登录','demo')}</div>`);
  }
  function focusModal() {
    const m=document.querySelector('.modal-mask');
    m?.querySelector('input,select,button,a')?.focus({preventScroll:true});
  }
  function closeModal() {
    const m=document.querySelector('.modal-mask');
    if(m?.dataset.dynamic==='true'){m.remove();return;}
    location.href=url(base);
  }
  function applyFilters(form,reset = false) {
    const scope = form.closest('.modal-body') || document.querySelector('.main-view');
    const fields = reset ? [] : Array.from(form.querySelectorAll('input:not([type=date]),select')).filter(f=>f.name&&f.value);
    const rowEls = Array.from(scope.querySelectorAll('[data-patient-table] tbody tr'));
    let visible=0;
    rowEls.forEach(row=>{
      const p = patients[Number(row.dataset.row)];
      const show = fields.every(f=> f.name==='性别' ? p.sex===f.value : ['分组','标签','来源'].includes(f.name) ? true : f.name==='年龄' ? p.age===Number(f.value) : row.textContent.toLowerCase().includes(f.value.toLowerCase()));
      row.dataset.filtered=show?'false':'true';row.hidden=!show;if(show)visible++;
    });
    scope.querySelectorAll('.form-card').forEach(card=>{card.hidden=!reset&&fields.some(f=>!card.dataset.formName.includes(f.value));});
    const total=scope.querySelector('[data-total]');if(total)total.textContent=`共 ${visible} 条记录`;
    const wrap=scope.querySelector('[data-patient-table]')?.parentElement;
    wrap?.querySelector('.filter-empty')?.remove();
    if(rowEls.length&&!visible)wrap.insertAdjacentHTML('beforeend',`<div class="filter-empty">${empty()}</div>`);
    const paginationEl=scope.querySelector('.pagination');
    if(paginationEl){paginationEl.dataset.current='1';updatePagination(paginationEl);}
  }
  function updatePagination(el,page = Number(el.dataset.current || 1)) {
    const section=el.closest('.modal-body') || el.closest('.panel');
    const rows=Array.from(section.querySelectorAll('[data-patient-table] tbody tr')).filter(row=>row.dataset.filtered!=='true');
    const size=Number(el.querySelector('[data-page-size]').value);
    const totalPages=Math.max(1,Math.ceil(rows.length/size));
    page=Math.max(1,Math.min(page,totalPages));el.dataset.current=page;
    rows.forEach((row,i)=>row.hidden=i<(page-1)*size||i>=page*size);
    el.querySelectorAll('button').forEach(b=>{
      const n=Number(b.textContent);
      if(n){b.hidden=n>totalPages;b.classList.toggle('current',n===page);}else b.disabled=b.textContent==='‹'?page===1:page===totalPages;
    });
    el.querySelector('[data-page-input]').value=page;
    el.querySelector('[data-page-input]').max=totalPages;
    el.querySelectorAll('span').forEach(s=>{if(s.textContent==='…')s.hidden=totalPages<=5;});
  }
  function exportPreview() {
    const rows=Array.from(document.querySelectorAll('.main-view table tr')).filter(row=>!row.hidden).map(row=>Array.from(row.children).map(c=>'"'+c.textContent.replaceAll('"','""')+'"').join(','));
    const content=rows.length?rows.join('\r\n'):'指标,数量\r\n总筛查量,16243\r\n高危识别量,3655\r\n邀约患者量,21\r\n愿意就诊量,8';
    const blob=new Blob(['\ufeff'+content],{type:'text/csv;charset=utf-8'});
    const href=URL.createObjectURL(blob);const a=document.createElement('a');a.href=href;a.download='AECG-本地演示数据.csv';a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);
    toast('已导出本地演示数据。');
  }
  document.addEventListener('click',e=>{
    const original=e.target.closest('[data-original]');if(original){e.preventDefault();showOriginal(original.dataset.original);return;}
    const b=e.target.closest('[data-action]');if(!b)return;
    e.preventDefault();
    const action=b.dataset.action;
    if(action==='original')showOriginal(key);
    else if(action==='close-original'){document.querySelector('.original-dialog').remove();document.querySelector('[data-action=original]')?.focus();}
    else if(action==='original-size'){const d=document.querySelector('.original-dialog');d.classList.toggle('actual');b.textContent=d.classList.contains('actual')?'适应窗口':'原始尺寸';}
    else if(action==='original-prev'||action==='original-next'){const i=catalog.findIndex(p=>p.key===originalKey);showOriginal(catalog[(i+(action==='original-next'?1:-1)+catalog.length)%catalog.length].key);}
    else if(action==='collapse'){document.body.classList.toggle('collapsed');b.textContent=document.body.classList.contains('collapsed')?'›':'‹';b.setAttribute('aria-label',document.body.classList.contains('collapsed')?'展开侧栏':'收起侧栏');}
    else if(action==='expand-filters'){const f=b.closest('.filters');f.classList.toggle('expanded');b.textContent=f.classList.contains('expanded')?'收起 ⌃':'展开 ⌄';}
    else if(action==='close-modal')closeModal();
    else if(action==='user-menu')showUserMenu();
    else if(action==='select-org'){document.querySelector('.org-select').value=b.textContent;document.querySelector('.org-popover').remove();toast('已切换本地演示组织。');}
    else if(action==='scroll-top')window.scrollTo({top:0,behavior:'smooth'});
    else if(action==='toggle'){const on=b.dataset.on==='true';b.dataset.on=String(!on);b.textContent=on?(b.dataset.initial || '启用'):(b.textContent.includes('关注')?'取消重点关注':'已启用');if(!b.dataset.initial)b.dataset.initial=b.textContent.includes('关注')?'设为重点关注':'启用';}
    else if(action==='export')exportPreview();
    else if(action==='validate-dialog')toast('选择已确认，仅本地预览。');
    else if(action==='disease-filter'){b.parentElement.querySelectorAll('.disease-option').forEach(t=>t.classList.remove('active'));b.classList.add('active');document.querySelector('.filter-empty')?.remove();document.querySelectorAll('[data-patient-table] tbody tr').forEach(row=>{row.hidden=false;row.dataset.filtered='false';});const total=document.querySelector('[data-total]');if(total)total.textContent='共 7 条记录';toast('已选择 '+b.childNodes[0].textContent+'（本地演示）。');}
    else if(action==='non-emergency'){document.querySelectorAll('[data-patient-table] tbody tr').forEach(row=>row.hidden=true);const wrap=document.querySelector('[data-patient-table]').parentElement;wrap.querySelector('.filter-empty')?.remove();wrap.insertAdjacentHTML('beforeend',`<div class="filter-empty">${empty()}</div>`);const total=document.querySelector('[data-total]');if(total)total.textContent='共 0 条记录';}
    else if(action==='patient-event-tab'){b.closest('.tab-bar').querySelectorAll('a').forEach(a=>a.classList.remove('active'));b.classList.add('active');}
    else if(action==='patient-empty-tab'){b.closest('.patient-tabs').querySelectorAll('a').forEach(a=>a.classList.remove('active'));b.classList.add('active');document.querySelector('.patient-content').innerHTML=empty();}
    else if(action==='move-up'||action==='move-down'){const row=b.closest('tr');if(action==='move-up'&&row.previousElementSibling)row.previousElementSibling.before(row);if(action==='move-down'&&row.nextElementSibling)row.nextElementSibling.after(row);}
    else if(action==='page'){const el=b.closest('.pagination');let n=Number(b.textContent);if(!n)n=Number(el.dataset.current||1)+(b.textContent==='›'?1:-1);updatePagination(el,n);}
    else if(action==='new-project'){app.insertAdjacentHTML('beforeend',modalShell('新增项目',formLine('项目名称',textField('请输入项目名称',true),true),'small'));document.querySelector('.modal-mask').dataset.dynamic='true';focusModal();}
    else toast();
  });
  document.addEventListener('submit',e=>{
    if(e.target.matches('[data-filter]')){e.preventDefault();applyFilters(e.target);toast('已应用本地筛选条件。');}
    else if(e.target.matches('[data-chart-filter]')){e.preventDefault();toast('已应用日期条件，图表展示截图中的演示统计。');}
    else if(e.target.matches('[data-preview-form]')){e.preventDefault();toast('表单校验完成，仅本地预览。');}
  });
  document.addEventListener('reset',e=>{if(e.target.matches('[data-filter]'))setTimeout(()=>applyFilters(e.target,true),0);});
  document.addEventListener('change',e=>{
    if(e.target.matches('[data-select-all]'))e.target.closest('table').querySelectorAll('tbody input[type=checkbox]').forEach(c=>c.checked=e.target.checked);
    if(e.target.matches('[data-page-size]'))updatePagination(e.target.closest('.pagination'),1);
    if(e.target.matches('[data-page-input]'))updatePagination(e.target.closest('.pagination'),Number(e.target.value));
    if(e.target.matches('.org-select'))toast('已切换本地演示组织。');
  });
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){
      if(document.querySelector('.original-dialog')){document.querySelector('.original-dialog').remove();return;}
      if(document.querySelector('.modal-mask')){closeModal();return;}
      document.querySelector('.user-popover')?.remove();document.querySelector('.org-popover')?.remove();
    }
    if(e.key==='Tab'){
      const modal=document.querySelector('.original-dialog') || document.querySelector('.modal-mask');if(!modal)return;
      const focusables=Array.from(modal.querySelectorAll('button:not([disabled]),input,select,a[href],textarea,[contenteditable]')).filter(el=>el.getClientRects().length);
      const first=focusables[0],last=focusables.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
    }
  });
  if(key==='index')indexPage();else prototypePage();
  document.querySelectorAll('.pagination').forEach(el=>updatePagination(el));
})();
