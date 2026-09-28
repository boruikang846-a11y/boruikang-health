import React from 'react'
import { Link } from 'react-router-dom'
import { ApartmentOutlined, ArrowRightOutlined, FileTextOutlined, HeartOutlined, ReadOutlined, TeamOutlined } from '@ant-design/icons'
import { Button, Tag } from 'antd'
import './SystemOverview.css'

export default function SystemOverview({ account }) {
  const destination = !account ? '/login' : account.role_code === 'PLATFORM_ADMIN' ? '/settings' : '/workbench'
  return <div className="overview-page">
    <header className="overview-header"><Link className="brand" to="/overview"><HeartOutlined /> BGSSAI <b>Health</b></Link><Link to={destination}><Button type="primary">{account ? '返回工作空间' : '医护与运营登录'} <ArrowRightOutlined /></Button></Link></header>
    <main className="overview-main">
      <section className="overview-hero"><div><span className="overview-kicker">医患运营管理系统 / SYSTEM OVERVIEW</span><h1>让出院后的服务<br /><em>有人负责，有据可循。</em></h1><p>帮助运营团队、医生和健康管家共同管理患者档案、随访、异常与复诊，把一次就诊延续为有记录、可跟踪的服务。</p><nav aria-label="系统介绍导航"><a href="#system">系统全貌</a><a href="#roles">团队分工</a><a href="#basis">随访依据</a><a href="#journey">服务流程</a></nav></div><aside className="overview-summary"><HeartOutlined /><h2>以患者为中心</h2><p>出院报告提供个体依据<br />业务流程指导团队协作<br />医生把关个案建议</p><Tag color="blue">后台 MVP · 持续建设中</Tag></aside></section>
      <section id="system" className="overview-section"><div className="overview-section-title"><span>01 / SYSTEM</span><h2>一个服务体系，两个工作入口</h2><p>后台先支持团队的日常随访工作，患者入口按需求分阶段建设。</p></div>
        <div className="overview-ends"><article className="overview-card"><div className="overview-card-top"><ApartmentOutlined /><Tag color="blue">后台 MVP</Tag></div><small>HEALTH-ADMIN</small><h3>团队协作与运营管理</h3><p>服务运营人员、医生和护理团队，明确每位患者由谁负责、下一步做什么。</p><div className="overview-chips">{['患者档案', '报告记录', '随访审核', '异常处理', '复诊跟踪', '运营周报'].map(x => <span key={x}>{x}</span>)}</div></article>
          <article className="overview-card overview-planned"><div className="overview-card-top"><TeamOutlined /><Tag>当前仅介绍</Tag></div><small>HEALTH-USER</small><h3>患者服务入口规划</h3><p>围绕患者熟悉的使用习惯，计划以三种入口连接同一服务团队。</p><div className="overview-chips"><span>企业微信 · 规划中</span><span>微信小程序 · 规划中</span><span>Web · 介绍页面</span></div><p className="overview-note">患者功能尚未开放，图示不表示渠道已经接通。</p></article></div>
      </section>
      <section className="overview-scope"><h2>数据从哪里来</h2><p>患者信息、门诊记录和出院报告主要由医院接口提供，人工录入作为补充。</p><p><strong>当前：医院 Mock → 模拟报告导入 → 关联随访任务。</strong>仅使用虚构样例，真实医院接口尚未接通。</p></section>
      <section id="roles" className="overview-section"><div className="overview-section-title"><span>02 / PEOPLE</span><h2>谁负责哪一步，一眼看清</h2></div><div className="overview-roles">{[
        ['我们 · 运营团队', '制定业务流程，组织培训', '由我们的运营团队制定如何使用系统开展业务的流程，并在线下培训医生；系统记录任务、执行结果与复盘。'],
        ['医生', '按流程协作，负责医学判断', '接受业务流程培训，审核患者个案建议，处理需要医学判断的问题。'],
        ['健康管家 / 护理团队', '落实随访，持续跟进', '核对报告、准备随访、按审核内容人工联系，记录反馈并升级异常。'],
      ].map(([role,title,description],i) => <article className="overview-card" key={role}><span className="overview-role-number">0{i+1}</span><small>{role}</small><h3>{title}</h3><p>{description}</p></article>)}</div></section>
      <section id="basis" className="overview-section overview-basis"><div className="overview-section-title"><span>03 / FOLLOW-UP BASIS</span><h2>随访内容，从患者的实际情况出发</h2><p>很多随访内容根据出院报告制定；门诊、体检等原始记录也可以提供依据。</p></div><div className="overview-equation">
        <article className="overview-card"><FileTextOutlined /><small>患者的个体依据</small><h3>出院报告 / 就诊记录</h3><ul><li>出院诊断与原医嘱</li><li>注意事项与随访重点</li><li>原记录用药周期、复诊日期</li></ul></article><span className="overview-plus" aria-hidden="true">＋</span>
        <article className="overview-card"><ReadOutlined /><small>团队的统一流程</small><h3>团队业务流程（SOP）</h3><ul><li>如何联系、如何问询</li><li>怎样记录反馈和跟进</li><li>何时升级医生、如何协作</li><li>正式流程待业务确认，非系统配置功能</li></ul></article></div><div className="overview-result"><span aria-hidden="true">↓</span><strong>团队准备个体随访内容 → 责任医生审核 → 人工联系</strong><p>本期从医院 Mock 导入报告，支持人工补充并核对摘要；模板带入已有的周期、复诊日期，团队对照原报告补充内容。</p></div>
      </section>
      <section id="journey" className="overview-section"><div className="overview-section-title"><span>04 / CARE JOURNEY</span><h2>一次随访，怎样走到有结果</h2></div><ol className="overview-journey">{[
        ['核对与建档', '录入出院报告等原记录，明确责任医生与服务人员。'],
        ['准备随访', '关联报告，确认 D3、D7、D30 等日期，补充患者的具体问询重点。'],
        ['审核与联系', '医生审核建议；团队核实身份后联系，未接通则记录原因与下次计划。'],
        ['反馈与复诊', '完成后交责任医生查收，核验复诊，按日归档并按周复盘。'],
      ].map(([title,description],i) => <li key={title}><span>0{i+1}</span><h3>{title}</h3><p>{description}</p></li>)}</ol></section>
      <section className="overview-scope"><h2>当前版本，做到哪一步</h2><p><strong>本期：</strong>患者与报告、人工确认的随访节点、联系记录、医生审核与查收、护士随访率、运营归档，以及产品公开介绍。</p><p><strong>后续：</strong>筛查干预、转诊与完整服务包履约仍待迭代；患者需求确认后再建设企业微信、小程序与 Web 业务。医院与微信接口均未接通。</p><p>出院报告目前由模拟医院接口提供，支持团队人工补充，未提供报告上传、OCR 或自动诊疗计划。</p></section>
    </main><footer className="overview-footer">BGSSAI Health · 医患运营管理系统 / MVP</footer>
  </div>
}
