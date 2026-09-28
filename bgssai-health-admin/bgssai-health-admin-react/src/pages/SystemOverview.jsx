import React from 'react'
import { Link } from 'react-router-dom'
import { ApartmentOutlined, ArrowRightOutlined, FileTextOutlined, HeartOutlined, ReadOutlined, TeamOutlined } from '@ant-design/icons'
import { Button, Tag } from 'antd'
import './SystemOverview.css'

export default function SystemOverview({ account }) {
  const destination = !account ? '/login' : account.role_code === 'PLATFORM_ADMIN' ? '/settings' : '/workbench'
  return <div className="overview-page">
    <header className="overview-header"><Link className="brand" to="/overview"><HeartOutlined /> BGSSAI <b>Health</b></Link><Link to={destination}><Button type="primary">{account ? '返回工作空间' : '受托运营登录'} <ArrowRightOutlined /></Button></Link></header>
    <main className="overview-main">
      <section className="overview-hero"><div><span className="overview-kicker">医患运营管理系统 / SYSTEM OVERVIEW</span><h1>医院托管患者运营<br /><em>我们负责执行与复盘。</em></h1><p>医院提供授权与患者、就诊数据；受托运营团队管理档案、随访、联系和复诊。院方医生负责医学判断，实际审核结果由团队登记凭证。</p><nav aria-label="系统介绍导航"><a href="#system">系统全貌</a><a href="#roles">双方分工</a><a href="#basis">随访依据</a><a href="#journey">服务流程</a></nav></div><aside className="overview-summary"><HeartOutlined /><h2>以患者为中心</h2><p>医院提供原始报告<br />我们执行院外服务<br />院方把关医学建议</p><Tag color="blue">全托管运营 · 后台 MVP</Tag></aside></section>
      <section id="system" className="overview-section"><div className="overview-section-title"><span>01 / SYSTEM</span><h2>一个服务体系，两个工作入口</h2><p>后台先支持团队的日常随访工作，患者入口按需求分阶段建设。</p></div>
        <div className="overview-ends"><article className="overview-card"><div className="overview-card-top"><ApartmentOutlined /><Tag color="blue">后台 MVP</Tag></div><small>HEALTH-ADMIN</small><h3>受托运营工作台</h3><p>由我们的运营人员登录，负责患者档案、随访、异常、复诊核对和报告交付；院方医护无需日常操作后台。</p><div className="overview-chips">{['患者档案', '报告记录', '院方审核回执', '异常处理', '复诊跟踪', '运营周报'].map(x => <span key={x}>{x}</span>)}</div></article>
          <article className="overview-card overview-planned"><div className="overview-card-top"><TeamOutlined /><Tag>当前仅介绍</Tag></div><small>HEALTH-USER</small><h3>患者服务入口规划</h3><p>围绕患者熟悉的使用习惯，计划以三种入口连接同一服务团队。</p><div className="overview-chips"><span>企业微信 · 规划中</span><span>微信小程序 · 规划中</span><span>Web · 介绍页面</span></div><p className="overview-note">患者功能尚未开放，图示不表示渠道已经接通。</p></article></div>
      </section>
      <section className="overview-scope"><h2>数据从哪里来</h2><p>患者信息、门诊记录和出院报告主要由医院接口提供，人工录入作为补充。</p><p><strong>当前：医院 Mock → 模拟报告导入 → 关联随访任务。</strong>仅使用虚构样例，真实医院接口尚未接通。</p></section>
      <section id="roles" className="overview-section"><div className="overview-section-title"><span>02 / PEOPLE</span><h2>谁负责哪一步，一眼看清</h2></div><div className="overview-roles">{[
        ['医院', '提供数据与临床资源', '提供患者及就诊数据、授权和院方联系人；医生负责个案医学审核、异常处置与诊疗决定，护士可接收服务报告。'],
        ['我们 · 运营团队', '负责全程托管执行', '制定如何使用系统完成业务的流程，建档、准备问询、人工随访、追踪复诊、记录凭证并生成报告。'],
        ['院方协作', '审核与结果反馈', '需要医学判断时向院方医生取得意见；运营人员登记实际审核凭证，并把随访和统计结果交付院方。院方医护不需要后台账号。'],
      ].map(([role,title,description],i) => <article className="overview-card" key={role}><span className="overview-role-number">0{i+1}</span><small>{role}</small><h3>{title}</h3><p>{description}</p></article>)}</div></section>
      <section id="basis" className="overview-section overview-basis"><div className="overview-section-title"><span>03 / FOLLOW-UP BASIS</span><h2>随访内容，从患者的实际情况出发</h2><p>很多随访内容根据出院报告制定；门诊、体检等原始记录也可以提供依据。</p></div><div className="overview-equation">
        <article className="overview-card"><FileTextOutlined /><small>患者的个体依据</small><h3>出院报告 / 就诊记录</h3><ul><li>出院诊断与原医嘱</li><li>注意事项与随访重点</li><li>原记录用药周期、复诊日期</li></ul></article><span className="overview-plus" aria-hidden="true">＋</span>
        <article className="overview-card"><ReadOutlined /><small>团队的统一流程</small><h3>团队业务流程（SOP）</h3><ul><li>如何联系、如何问询</li><li>怎样记录反馈和跟进</li><li>何时升级院方医生、如何协作</li><li>正式流程待业务确认，非系统配置功能</li></ul></article></div><div className="overview-result"><span aria-hidden="true">↓</span><strong>运营团队准备内容 → 院方医生审核 → 登记回执 → 人工联系</strong><p>本期从医院 Mock 导入报告，支持人工补充并核对摘要；模板带入已有的周期、复诊日期，团队对照原报告补充内容。</p></div>
      </section>
      <section id="journey" className="overview-section"><div className="overview-section-title"><span>04 / CARE JOURNEY</span><h2>一次随访，怎样走到有结果</h2></div><ol className="overview-journey">{[
        ['核对与建档', '录入出院报告等原记录，明确责任医生与服务人员。'],
        ['准备随访', '关联报告，确认 D3、D7、D30 等日期，补充患者的具体问询重点。'],
        ['审核与联系', '取得院方医生审核回执并记录凭证；团队核实身份后联系，未接通则记录原因与下次计划。'],
        ['反馈与复诊', '向院方交接随访结果并记录实际确认，核验复诊，按日归档并按周复盘。'],
      ].map(([title,description],i) => <li key={title}><span>0{i+1}</span><h3>{title}</h3><p>{description}</p></li>)}</ol></section>
      <section className="overview-scope"><h2>当前版本，做到哪一步</h2><p><strong>本期：</strong>患者与报告、人工确认的随访节点、联系记录、院方审核及查收凭证、我方运营随访率、归档与报告交付，以及产品公开介绍。</p><p><strong>后续：</strong>筛查干预、转诊与完整服务包履约仍待迭代；患者需求确认后再建设企业微信、小程序与 Web 业务。医院与微信接口均未接通。</p><p>出院报告目前由模拟医院接口提供，支持团队人工补充，未提供报告上传、OCR 或自动诊疗计划。</p></section>
    </main><footer className="overview-footer">BGSSAI Health · 医患运营管理系统 / MVP</footer>
  </div>
}
