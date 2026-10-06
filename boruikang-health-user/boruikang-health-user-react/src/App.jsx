import React, { useEffect, useState } from 'react'
import SystemIntro from './SystemIntro'
import WechatDemo from './WechatDemo'
import { Button, Collapse, Tag } from 'antd'
import { ArrowRightOutlined, CheckOutlined, DesktopOutlined, GlobalOutlined, HeartOutlined,
  MessageOutlined, MobileOutlined, SafetyCertificateOutlined, TeamOutlined } from '@ant-design/icons'

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
export default function App() {
  const [lang, setLang] = useState(localStorage.getItem('boruikang.lang') === 'en' ? 'en' : 'zh-CN')
  const t = (zh, en) => lang === 'en' ? en : zh
  useEffect(() => {
    localStorage.setItem('boruikang.lang', lang)
    document.documentElement.lang = lang
    document.title = t('博瑞康 Health 医患运营管理系统与患者端介绍', 'Boruikang Health | Connected care')
  }, [lang])
  useReveal([lang])
  useEffect(() => {
    const onScroll = () => document.body.classList.toggle('scrolled', window.scrollY > 24)
    onScroll(); window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  const modes = [
    [MessageOutlined, 'wecom', t('企业微信', 'WeCom'), t('让日常联系，更有温度', 'A closer connection to your care team'),
      t('医院服务团队通过企业微信和公众号承接日常沟通、服务提醒与随访协作，让患者找到明确的联系人。下方有互动演示。', 'The hospital service team uses WeCom and the Official Account for everyday communication, reminders and follow-up coordination. See the walk-through below.'),
      t('后台已具备，待医院提供接入参数后开通', 'Built in the workspace; opens once the hospital provides its credentials')],
    [MobileOutlined, 'mini', t('微信小程序', 'WeChat Mini Program'), t('轻量入口，连接持续服务', 'A lightweight entry to continuing care'),
      t('计划提供便捷的患者服务入口。具体内容将在患者需求与医院流程明确后设计，无需现在安装应用。', 'A planned lightweight entry to patient services. Features will be designed after patient needs and hospital workflows are confirmed.'),
      t('患者需求确认后开发', 'Development follows requirements confirmation')],
    [DesktopOutlined, 'web', t('Web 服务', 'Web experience'), t('跨越设备，了解与连接', 'Accessible across your devices'),
      t('当前提供患者服务介绍，适配手机与电脑。账号、咨询、健康记录等业务将待需求明确后分阶段建设。', 'This introduction works on phones and computers. Accounts, consultations and health records are planned for later phases after requirements are defined.'),
      t('当前仅开放介绍页面', 'Introduction available now')],
  ]
  return <div className="site"><header className="site-header"><a className="brand" href="/"><span className="brand-icon"><HeartOutlined /></span><span>{t('博瑞康', 'Boruikang')} <b>Health</b></span></a>
    <nav aria-label={t('页面导航', 'Page navigation')}><a href="#overview">{t('系统全貌', 'System')}</a><a href="#modes">{t('服务模式', 'Channels')}</a><a href="#wechat">{t('微信互动', 'WeChat demo')}</a><a href="#journey">{t('服务流程', 'Care journey')}</a><a href="#roadmap">{t('上线规划', 'Roadmap')}</a></nav>
    <Button type="text" icon={<GlobalOutlined />} onClick={() => setLang(lang === 'en' ? 'zh-CN' : 'en')}>{lang === 'en' ? '中文' : 'English'}</Button>
  </header>
  <main><section className="hero"><div className="hero-copy"><div className="eyebrow"><span /> {t('医患运营管理系统 · 关怀延续', 'PATIENT RELATIONSHIPS & CARE OPERATIONS')}</div>
    <h1>{t('让每一次关怀', 'Care that stays')}<br /><em>{t('延续到日常生活', 'with you.')}</em></h1>
    <p className="hero-description">{t('医院委托我们持续运营患者服务。院方负责医学判断，我们负责沟通、随访、复诊跟踪与结果反馈。', 'The hospital entrusts our team with ongoing patient services. Clinicians make medical decisions; we manage follow-ups, visit tracking and feedback.')}</p>
    <div className="hero-actions"><Button type="primary" size="large" href="#overview">{t('一图看懂整个系统', 'Explore the system')} <ArrowRightOutlined /></Button><a href="#roadmap">{t('查看建设进展', 'View the roadmap')}</a></div>
    <div className="availability"><span className="availability-dot" />{t('当前为规划介绍，患者业务尚未开放', 'Introduction only. Patient services are not yet available.')}</div>
  </div><div className="hero-art" aria-label={t('患者与健康管理团队协作示意', 'Illustration of patients connected to a care team')}>
    <div className="orbit outer" /><div className="orbit inner" /><div className="center-heart"><HeartOutlined /><span>{t('以患者为中心', 'Patient centered')}</span></div>
    <div className="care-card top"><span className="small-icon"><TeamOutlined /></span><div><b>{t('受托运营团队', 'Managed operations team')}</b><small>{t('明确责任，持续跟进', 'Assigned care and continued support')}</small></div></div>
    <div className="care-card bottom"><span className="small-icon warm"><SafetyCertificateOutlined /></span><div><b>{t('医生审核 · 人工负责', 'Doctor reviewed, human led')}</b><small>{t('每一步服务都有依据', 'Care grounded in clinical review')}</small></div></div>
    <div className="art-caption">BORUIKANG HEALTH / CONTINUOUS CARE</div>
  </div></section>
  <div className="principles" data-reveal="stagger">{[[TeamOutlined,t('明确的服务团队','A dedicated care team')],[SafetyCertificateOutlined,t('医生审核与人工跟进','Clinical review and human follow-up')],[HeartOutlined,t('从就诊到日常的连接','Connected beyond the visit')]].map(([Icon,title]) => <div key={title}><Icon /><span>{title}</span></div>)}</div>
  <SystemIntro t={t} />
  <section id="modes" className="section"><div className="section-intro" data-reveal><div className="eyebrow">THREE WAYS TO CONNECT</div><h2>{t('一个服务体系，三种连接方式', 'One care experience. Three ways to connect.')}</h2><p>{t('围绕患者熟悉的使用习惯，规划企业微信、小程序与 Web 协同服务。', 'Planned around familiar ways of connecting, across WeCom, a Mini Program and the web.')}</p></div>
    <div className="mode-grid" data-reveal="stagger">{modes.map(([Icon,key,title,subtitle,description,status]) => <article className={'mode-card ' + key} key={key}><div className="mode-top"><span className="mode-icon"><Icon /></span><Tag bordered={false} color={key === 'web' ? 'cyan' : key === 'wecom' ? 'gold' : 'default'}>{key === 'web' ? t('介绍已上线','Introduction') : key === 'wecom' ? t('待接入','Pending launch') : t('规划中','Planned')}</Tag></div><h3>{title}</h3><h4>{subtitle}</h4><p>{description}</p><div className="mode-status"><span />{status}</div></article>)}</div>
  </section>
  <WechatDemo t={t} />
  <section id="journey" className="journey-section"><div className="section-intro" data-reveal><div className="eyebrow">CARE WITH CONTINUITY</div><h2>{t('围绕患者，形成连续的服务', 'A continuous journey around the patient')}</h2><p>{t('受托运营后台先行建设，逐步连接患者服务入口。', 'Building the managed operations workspace first, then connecting patient channels.')}</p></div>
    <div className="journey-grid" data-reveal="stagger">{[
      [t('建立健康档案','Create a care profile'), t('医院提供原始资料，我们核对信息并明确责任医生和随访负责人。','The hospital provides source records; our team verifies them and assigns a responsible doctor and a follow-up owner.')],
      [t('准备随访服务','Prepare follow-up care'), t('根据出院报告等原始记录，准备个体随访问询内容。','The team prepares individual follow-up questions using discharge or other clinical records.')],
      [t('医生审核，人工联系','Review and personal contact'), t('责任医生在系统里查看报告、审核个案随访意见，通过后我们人工联系并记录。','The responsible doctor reads the reports and reviews patient-specific guidance in the system; once approved, our team contacts the patient and records it.')],
      [t('跟踪反馈与复诊','Track outcomes and visits'), t('记录处理结果，核实复诊安排，让服务有始有终。','The team records outcomes and verifies return visits to complete the care process.')],
    ].map(([title,description],index) => <article key={title}><span className="step-number">0{index+1}</span><h3>{title}</h3><p>{description}</p></article>)}</div>
  </section>
  <section id="roadmap" className="section roadmap"><div className="roadmap-heading" data-reveal><div className="eyebrow">STEP BY STEP</div><h2>{t('把每一步', 'Each step,')}<br />{t('都做清楚', 'clearly defined.')}</h2><p>{t('当前聚焦受托运营团队的工作闭环。患者端功能，将在需求和医院流程确认后逐步建设。', 'The current focus is the managed operations workflow. Patient features will follow confirmed needs and hospital processes.')}</p><a href="#faq">{t('还有疑问？', 'Questions?')} <ArrowRightOutlined /></a></div>
    <div className="roadmap-list" data-reveal="stagger">{[
      [t('当前阶段','Current phase'),t('受托运营后台与患者服务介绍','Managed operations and patient introduction'),t('医生、护士与运营团队在后台协作完成报告查看、随访审核、异常与复诊跟踪；患者端公开展示整体模式。','Doctors, nurses and our team work together in the workspace on reports, reviewed follow-ups, alerts and return visits, with this public introduction for patients.')],
      [t('下一阶段','Next phase'),t('确认患者需求与医院流程','Confirm patient needs and hospital workflows'),t('明确患者使用场景、授权说明、医院联系人与服务范围，确认各渠道的接入条件。','Define patient scenarios, consent, hospital contacts and service scope, then confirm integration requirements.')],
      [t('后续规划','Later phases'),t('分阶段开放患者服务','Open patient services in phases'),t('企业微信与公众号在医院提供接入参数、完成联调后开通；小程序和 Web 功能按确认的需求建设。','WeCom and the Official Account open once the hospital provides credentials and integration is validated; Mini Program and web features follow confirmed needs.')],
    ].map(([phase,title,description],index) => <article key={phase}><div className={'phase-mark ' + (index === 0 ? 'current' : '')}>{index === 0 ? <CheckOutlined /> : index+1}</div><div><small>{phase}</small><h3>{title}</h3><p>{description}</p></div></article>)}</div>
  </section>
  <section id="faq" className="faq-section"><div className="section-intro" data-reveal><div className="eyebrow">GOOD TO KNOW</div><h2>{t('关于当前服务', 'About the current service')}</h2></div>
    <Collapse ghost expandIconPosition="end" className="faq-list" items={[
      { key:'1',label:t('现在可以注册、咨询或提交健康指标吗？','Can I register, ask questions or submit health measurements now?'),children:<p>{t('暂时不可以。当前 HEALTH-USER 仅为介绍页面，不开放注册、登录、健康填报、在线咨询或自助入组，也不收集这些个人信息。','Not yet. HEALTH-USER is currently an introduction only. Registration, sign-in, measurements, consultations and self-enrollment are unavailable, and this page does not collect that personal information.')}</p> },
      { key:'2',label:t('企业微信、公众号和小程序已经可以使用了吗？','Are WeCom, the Official Account and the Mini Program available?'),children:<p>{t('后台已经具备企业微信和公众号的沟通功能，上方的演示展示了互动方式；真实通道要等医院提供接入参数并完成联调后才开通。小程序仍在规划。这里的展示不代表渠道已经接通。','The staff workspace already supports WeCom and Official Account communication, as the walk-through above shows; the real channels open only after the hospital provides credentials and integration testing is complete. The Mini Program is still planned. Their presence here does not imply a connected service.')}</p> },
      { key:'3',label:t('系统会自动诊断或自动回复患者吗？','Will the system diagnose or automatically reply to patients?'),children:<p>{t('不会。后台按医生审核、人工负责的方式设计：系统不独立诊断、开药或调整治疗方案，也不自动回复。微信消息只在工作人员点击发送时发出，涉及病情的内容须经责任医生审核。','No. The staff workspace is built around clinical review and human responsibility: it does not diagnose, prescribe, change treatment or reply automatically. WeChat messages go out only when a staff member clicks send, and clinical content requires the responsible doctor’s review.')}</p> },
      { key:'4',label:t('如何了解后续开放进展？','How can I learn about future availability?'),children:<p>{t('后续以本页面的建设进展与医院服务团队正式通知为准。当前没有预约名额或资料收集入口。','Refer to this roadmap and official announcements from your hospital care team. No waitlist or information collection form is available at this stage.')}</p> },
    ]} />
  </section></main><footer className="site-footer"><a className="brand" href="/"><span className="brand-icon"><HeartOutlined /></span><span>{t('博瑞康', 'Boruikang')} <b>Health</b></span></a><p>{t('苏州博瑞康医疗科技有限公司 · 医患运营管理系统', '苏州博瑞康医疗科技有限公司 · Patient relationship and care operations')}</p><span>HEALTH MVP / {t('持续建设中','In development')}</span></footer></div>
}
