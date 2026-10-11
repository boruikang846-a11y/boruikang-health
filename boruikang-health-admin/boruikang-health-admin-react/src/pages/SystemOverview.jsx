import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ApartmentOutlined, ArrowRightOutlined, FileTextOutlined, HeartOutlined, ReadOutlined, TeamOutlined } from '@ant-design/icons'
import { Button, Tag } from 'antd'
import './SystemOverview.css'

/** Adds .is-visible to [data-reveal] blocks as they scroll into view; CSS does the motion. */
function useReveal(deps) {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll('[data-reveal]'))
    if (!('IntersectionObserver' in window) || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { nodes.forEach(node => node.classList.add('is-visible')); return }
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target) } }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' })
    nodes.forEach(node => node.classList.contains('is-visible') || observer.observe(node))
    return () => observer.disconnect()
  }, deps)
}
export default function SystemOverview({ account }) {
  useReveal([])
  const destination = !account ? '/login' : account.role_code === 'PLATFORM_ADMIN' ? '/settings' : account.role_code === 'DOCTOR' ? '/doctor' : '/workbench'
  return <div className="overview-page">
    <header className="overview-header"><Link className="brand" to="/overview"><HeartOutlined /> 博瑞康 <b>Health</b></Link><Link to={destination}><Button type="primary">{account ? '返回工作空间' : '登录工作台'} <ArrowRightOutlined /></Button></Link></header>
    <main className="overview-main">
      <section className="overview-hero"><div><span className="overview-kicker">医患运营管理系统 / SYSTEM OVERVIEW</span><h1>医院托管患者运营<br /><em>我们负责执行与复盘。</em></h1><p>医院提供授权与患者、就诊数据；受托运营团队和院方护士负责档案、随访、联系和复诊。院方医生登录系统查看报告、审核随访意见。</p><nav aria-label="系统介绍导航"><a href="#system">系统全貌</a><a href="#roles">双方分工</a><a href="#basis">随访依据</a><a href="#journey">服务流程</a></nav></div><aside className="overview-summary"><HeartOutlined /><h2>以患者为中心</h2><p>医院提供原始报告<br />医生看报告、审核意见<br />团队与护士执行随访</p><Tag color="blue">全托管运营 · 后台 MVP</Tag></aside></section>
      <section id="system" className="overview-section"><div className="overview-section-title" data-reveal><span>01 / SYSTEM</span><h2>一个服务体系，两个工作入口</h2><p>后台先支持团队的日常随访工作，患者入口按需求分阶段建设。</p></div>
        <div className="overview-ends" data-reveal="stagger"><article className="overview-card"><div className="overview-card-top"><ApartmentOutlined /><Tag color="blue">后台 MVP</Tag></div><small>HEALTH-ADMIN</small><h3>医护与运营工作台</h3><p>运营人员、院方医生和护士各自登录：诊前中心承接筛查、首次联系、邀约与到诊；诊后中心统一患者档案、报告、医生审核、随访执行、异常和复诊。</p><div className="overview-chips">{['医生工作台', '报告已阅与意见', '随访意见审核', '异常处置', '复诊跟踪', '运营周报'].map(x => <span key={x}>{x}</span>)}</div></article>
          <article className="overview-card overview-planned"><div className="overview-card-top"><TeamOutlined /><Tag>当前仅介绍</Tag></div><small>HEALTH-USER</small><h3>患者服务入口规划</h3><p>围绕患者熟悉的使用习惯，以企业微信、公众号、小程序和 Web 连接同一服务团队。</p><div className="overview-chips"><span>企业微信 · 待接入</span><span>公众号 · 待接入</span><span>微信小程序 · 规划中</span><span>Web · 介绍页面</span></div><p className="overview-note">患者功能尚未开放，图示不表示渠道已经接通。</p></article></div>
      </section>
      <section className="overview-scope" data-reveal><h2>数据从哪里来</h2><p>患者信息、门诊记录和出院报告主要由医院接口提供，人工录入作为补充。</p><p><strong>当前：医院 Mock → 模拟报告导入 → 关联随访任务。</strong>仅使用虚构样例，真实医院接口尚未接通。</p></section>
      <section id="roles" className="overview-section"><div className="overview-section-title" data-reveal><span>02 / PEOPLE</span><h2>谁负责哪一步，一眼看清</h2></div><div className="overview-roles" data-reveal="stagger">{[
        ['院方医生', '看报告、审核随访意见', '登录医生工作台：确认报告已阅并写意见，审核团队起草的随访意见（通过或退回），查收随访结果，处置升级的异常。'],
        ['院方护士', '随访执行', '登录后与运营人员同一套随访页面，负责分配给自己的患者：起草随访意见、联系患者、核实复诊。'],
        ['我们 · 运营团队', '托管执行与复盘', '建档、准备问询、人工随访、追踪复诊、登记邀约预约，按日归档并按周复盘；运营主管开通医护账号。'],
      ].map(([role,title,description],i) => <article className="overview-card" key={role}><span className="overview-role-number">0{i+1}</span><small>{role}</small><h3>{title}</h3><p>{description}</p></article>)}</div></section>
      <section id="basis" className="overview-section overview-basis"><div className="overview-section-title" data-reveal><span>03 / FOLLOW-UP BASIS</span><h2>随访内容，从患者的实际情况出发</h2><p>很多随访内容根据出院报告制定；门诊、体检等原始记录也可以提供依据。</p></div><div className="overview-equation" data-reveal="stagger">
        <article className="overview-card"><FileTextOutlined /><small>患者的个体依据</small><h3>出院报告 / 就诊记录</h3><ul><li>出院诊断与原医嘱</li><li>注意事项与随访重点</li><li>原记录用药周期、复诊日期</li></ul></article><span className="overview-plus" aria-hidden="true">＋</span>
        <article className="overview-card"><ReadOutlined /><small>团队的统一流程</small><h3>团队业务流程（SOP）</h3><ul><li>如何联系、如何问询</li><li>怎样记录反馈和跟进</li><li>何时升级责任医生、如何协作</li><li>正式流程待业务确认，非系统配置功能</li></ul></article></div><div className="overview-result" data-reveal><span aria-hidden="true">↓</span><strong>团队或护士起草随访意见 → 责任医生在系统里审核 → 人工联系 → 医生查收结果</strong><p>本期从医院 Mock 导入报告，支持人工补充并核对摘要；模板带入已有的周期、复诊日期，团队对照原报告补充内容。</p></div>
      </section>
      <section id="journey" className="overview-section"><div className="overview-section-title" data-reveal><span>04 / CARE JOURNEY</span><h2>一次随访，怎样走到有结果</h2></div><ol className="overview-journey" data-reveal="stagger">{[
        ['核对与建档', '录入出院报告等原记录，明确责任医生与服务人员。'],
        ['准备随访', '关联报告，确认 D3、D7、D30 等日期，补充患者的具体问询重点。'],
        ['审核与联系', '责任医生在系统里通过或退回随访意见；团队核实身份后按通过的正文联系，未接通则记录原因与下次计划。'],
        ['查收与复诊', '随访完成后由责任医生查收并反馈；团队核验复诊，按日归档并按周复盘。'],
      ].map(([title,description],i) => <li key={title}><span>0{i+1}</span><h3>{title}</h3><p>{description}</p></li>)}</ol></section>
      <section className="overview-scope" data-reveal><h2>当前版本，做到哪一步</h2><p><strong>本期：</strong>医生、护士与运营人员各自登录；医生看报告与写意见、审核随访意见、查收结果、处置异常；诊前高危患者筛查中心、诊后健康服务中心（患者档案、邀约预约、随访、异常、复诊、转诊）、服务包履约、十项指标与归档，企业微信与公众号沟通（联系人绑定、点击发送、来信待处理），以及产品公开介绍。</p><p><strong>后续：</strong>科室级视图、给医生的消息提醒、电子签名待定；小程序与 Web 患者业务待需求确认。真实的企业微信、公众号通道待医院提供接入参数后联调，医院接口尚未接通。</p><p>出院报告目前由模拟医院接口提供，支持团队人工补充，未提供报告上传、OCR 或自动诊疗计划。</p></section>
    </main><footer className="overview-footer">苏州博瑞康医疗科技有限公司 · 医患运营管理系统</footer>
  </div>
}
