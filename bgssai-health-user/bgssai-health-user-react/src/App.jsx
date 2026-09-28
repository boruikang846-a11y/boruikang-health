import React, { useEffect, useState } from 'react'
import SystemIntro from './SystemIntro'
import { Button, Collapse, Tag } from 'antd'
import { ArrowRightOutlined, CheckOutlined, DesktopOutlined, GlobalOutlined, HeartOutlined,
  MessageOutlined, MobileOutlined, SafetyCertificateOutlined, TeamOutlined } from '@ant-design/icons'

export default function App() {
  const [lang, setLang] = useState(localStorage.getItem('bgssai.lang') === 'en' ? 'en' : 'zh-CN')
  const t = (zh, en) => lang === 'en' ? en : zh
  useEffect(() => {
    localStorage.setItem('bgssai.lang', lang)
    document.documentElement.lang = lang
    document.title = t('BGSSAI Health 医患运营管理系统与患者端介绍', 'BGSSAI Health | Connected care')
  }, [lang])
  const modes = [
    [MessageOutlined, 'wecom', t('企业微信', 'WeCom'), t('让日常联系，更有温度', 'A closer connection to your care team'),
      t('计划通过医院服务团队，承接日常沟通、服务提醒与随访协作，让患者找到明确的联系人。', 'Planned to connect patients with the hospital service team for everyday communication, reminders and follow-up coordination.'),
      t('待医院授权与接口对接', 'Hospital authorization and integration pending')],
    [MobileOutlined, 'mini', t('微信小程序', 'WeChat Mini Program'), t('轻量入口，连接持续服务', 'A lightweight entry to continuing care'),
      t('计划提供便捷的患者服务入口。具体内容将在患者需求与医院流程明确后设计，无需现在安装应用。', 'A planned lightweight entry to patient services. Features will be designed after patient needs and hospital workflows are confirmed.'),
      t('患者需求确认后开发', 'Development follows requirements confirmation')],
    [DesktopOutlined, 'web', t('Web 服务', 'Web experience'), t('跨越设备，了解与连接', 'Accessible across your devices'),
      t('当前提供患者服务介绍，适配手机与电脑。账号、咨询、健康记录等业务将待需求明确后分阶段建设。', 'This introduction works on phones and computers. Accounts, consultations and health records are planned for later phases after requirements are defined.'),
      t('当前仅开放介绍页面', 'Introduction available now')],
  ]
  return <div className="site"><header className="site-header"><a className="brand" href="/"><span className="brand-icon"><HeartOutlined /></span><span>BGSSAI <b>Health</b></span></a>
    <nav aria-label={t('页面导航', 'Page navigation')}><a href="#overview">{t('系统全貌', 'System')}</a><a href="#modes">{t('服务模式', 'Channels')}</a><a href="#journey">{t('服务流程', 'Care journey')}</a><a href="#roadmap">{t('上线规划', 'Roadmap')}</a></nav>
    <Button type="text" icon={<GlobalOutlined />} onClick={() => setLang(lang === 'en' ? 'zh-CN' : 'en')}>{lang === 'en' ? '中文' : 'English'}</Button>
  </header>
  <main><section className="hero"><div className="hero-copy"><div className="eyebrow"><span /> {t('医患运营管理系统 · 关怀延续', 'PATIENT RELATIONSHIPS & CARE OPERATIONS')}</div>
    <h1>{t('让每一次关怀', 'Care that stays')}<br /><em>{t('延续到日常生活', 'with you.')}</em></h1>
    <p className="hero-description">{t('连接患者、医生与健康管理团队。让就诊之后的沟通、随访与复诊，成为有记录、有回应的连续服务。', 'Connecting patients, clinicians and care coordinators. Bringing continuity to communication, follow-ups and return visits beyond the hospital.')}</p>
    <div className="hero-actions"><Button type="primary" size="large" href="#overview">{t('一图看懂整个系统', 'Explore the system')} <ArrowRightOutlined /></Button><a href="#roadmap">{t('查看建设进展', 'View the roadmap')}</a></div>
    <div className="availability"><span className="availability-dot" />{t('当前为规划介绍，患者业务尚未开放', 'Introduction only. Patient services are not yet available.')}</div>
  </div><div className="hero-art" aria-label={t('患者与健康管理团队协作示意', 'Illustration of patients connected to a care team')}>
    <div className="orbit outer" /><div className="orbit inner" /><div className="center-heart"><HeartOutlined /><span>{t('以患者为中心', 'Patient centered')}</span></div>
    <div className="care-card top"><span className="small-icon"><TeamOutlined /></span><div><b>{t('医院服务团队', 'Hospital care team')}</b><small>{t('明确责任，持续跟进', 'Assigned care and continued support')}</small></div></div>
    <div className="care-card bottom"><span className="small-icon warm"><SafetyCertificateOutlined /></span><div><b>{t('医生审核 · 人工负责', 'Doctor reviewed, human led')}</b><small>{t('每一步服务都有依据', 'Care grounded in clinical review')}</small></div></div>
    <div className="art-caption">BGSSAI HEALTH / CONTINUOUS CARE</div>
  </div></section>
  <div className="principles">{[[TeamOutlined,t('明确的服务团队','A dedicated care team')],[SafetyCertificateOutlined,t('医生审核与人工跟进','Clinical review and human follow-up')],[HeartOutlined,t('从就诊到日常的连接','Connected beyond the visit')]].map(([Icon,title]) => <div key={title}><Icon /><span>{title}</span></div>)}</div>
  <SystemIntro t={t} />
  <section id="modes" className="section"><div className="section-intro"><div className="eyebrow">THREE WAYS TO CONNECT</div><h2>{t('一个服务体系，三种连接方式', 'One care experience. Three ways to connect.')}</h2><p>{t('围绕患者熟悉的使用习惯，规划企业微信、小程序与 Web 协同服务。', 'Planned around familiar ways of connecting, across WeCom, a Mini Program and the web.')}</p></div>
    <div className="mode-grid">{modes.map(([Icon,key,title,subtitle,description,status]) => <article className={'mode-card ' + key} key={key}><div className="mode-top"><span className="mode-icon"><Icon /></span><Tag bordered={false} color={key === 'web' ? 'cyan' : 'default'}>{key === 'web' ? t('介绍已上线','Introduction') : t('规划中','Planned')}</Tag></div><h3>{title}</h3><h4>{subtitle}</h4><p>{description}</p><div className="mode-status"><span />{status}</div></article>)}</div>
  </section>
  <section id="journey" className="journey-section"><div className="section-intro"><div className="eyebrow">CARE WITH CONTINUITY</div><h2>{t('围绕患者，形成连续的服务', 'A continuous journey around the patient')}</h2><p>{t('医护后台先行建设，逐步连接患者服务入口。', 'Building the care team workspace first, then connecting patient channels.')}</p></div>
    <div className="journey-grid">{[
      [t('建立健康档案','Create a care profile'), t('医院团队核对信息，明确服务归属与责任人员。','The hospital verifies information and assigns the responsible care team.')],
      [t('准备随访服务','Prepare follow-up care'), t('根据出院报告等原始记录，准备个体随访问询内容。','The team prepares individual follow-up questions using discharge or other clinical records.')],
      [t('医生审核，人工联系','Review and personal contact'), t('建议由责任医生审核，团队人工联系并记录依据。','A responsible doctor reviews guidance, and the team records personal contact with evidence.')],
      [t('跟踪反馈与复诊','Track outcomes and visits'), t('记录处理结果，核实复诊安排，让服务有始有终。','The team records outcomes and verifies return visits to complete the care process.')],
    ].map(([title,description],index) => <article key={title}><span className="step-number">0{index+1}</span><h3>{title}</h3><p>{description}</p></article>)}</div>
  </section>
  <section id="roadmap" className="section roadmap"><div className="roadmap-heading"><div className="eyebrow">STEP BY STEP</div><h2>{t('把每一步', 'Each step,')}<br />{t('都做清楚', 'clearly defined.')}</h2><p>{t('当前聚焦医护团队的工作闭环。患者端功能，将在需求和医院流程确认后逐步建设。', 'The current focus is the care team workflow. Patient features will follow confirmed needs and hospital processes.')}</p><a href="#faq">{t('还有疑问？', 'Questions?')} <ArrowRightOutlined /></a></div>
    <div className="roadmap-list">{[
      [t('当前阶段','Current phase'),t('医护后台与患者服务介绍','Care workspace and patient introduction'),t('实现后台患者运营、随访审核、异常与复诊跟踪；患者端公开展示整体模式。','Building patient operations, follow-up review, alerts and return-visit tracking for staff, with this public patient introduction.')],
      [t('下一阶段','Next phase'),t('确认患者需求与医院流程','Confirm patient needs and hospital workflows'),t('明确患者使用场景、授权说明、医院联系人与服务范围，确认各渠道的接入条件。','Define patient scenarios, consent, hospital contacts and service scope, then confirm integration requirements.')],
      [t('后续规划','Later phases'),t('分阶段开放患者服务','Open patient services in phases'),t('按确认的需求建设企业微信、小程序和 Web 功能，完成医院接口联调后再开放。','Develop the agreed WeCom, Mini Program and web features, and launch after hospital integrations are validated.')],
    ].map(([phase,title,description],index) => <article key={phase}><div className={'phase-mark ' + (index === 0 ? 'current' : '')}>{index === 0 ? <CheckOutlined /> : index+1}</div><div><small>{phase}</small><h3>{title}</h3><p>{description}</p></div></article>)}</div>
  </section>
  <section id="faq" className="faq-section"><div className="section-intro"><div className="eyebrow">GOOD TO KNOW</div><h2>{t('关于当前服务', 'About the current service')}</h2></div>
    <Collapse ghost expandIconPosition="end" items={[
      { key:'1',label:t('现在可以注册、咨询或提交健康指标吗？','Can I register, ask questions or submit health measurements now?'),children:<p>{t('暂时不可以。当前 HEALTH-USER 仅为介绍页面，不开放注册、登录、健康填报、在线咨询或自助入组，也不收集这些个人信息。','Not yet. HEALTH-USER is currently an introduction only. Registration, sign-in, measurements, consultations and self-enrollment are unavailable, and this page does not collect that personal information.')}</p> },
      { key:'2',label:t('企业微信和小程序已经可以使用了吗？','Are WeCom and the Mini Program available?'),children:<p>{t('目前均处于规划阶段。需要确认医院授权、患者需求及接口条件后再开发、联调和开放。这里的展示不代表渠道已经接通。','Both are planned. Hospital authorization, patient needs and interface requirements must be confirmed before development, integration testing and launch. Their presence here does not imply a connected service.')}</p> },
      { key:'3',label:t('系统会自动诊断或自动回复患者吗？','Will the system diagnose or automatically reply to patients?'),children:<p>{t('当前后台按医生审核、人工负责的方式设计。系统不独立诊断、开药或调整治疗方案；人工触达记录也不等同于系统已向患者自动发送消息。','The staff workspace is designed around clinical review and human responsibility. It does not independently diagnose, prescribe or change treatment. A manual contact record does not mean an automated message was sent.')}</p> },
      { key:'4',label:t('如何了解后续开放进展？','How can I learn about future availability?'),children:<p>{t('后续以本页面的建设进展与医院服务团队正式通知为准。当前没有预约名额或资料收集入口。','Refer to this roadmap and official announcements from your hospital care team. No waitlist or information collection form is available at this stage.')}</p> },
    ]} />
  </section></main><footer className="site-footer"><a className="brand" href="/"><span className="brand-icon"><HeartOutlined /></span><span>BGSSAI <b>Health</b></span></a><p>{t('医患运营管理系统 · 系统与患者端介绍','Patient relationship and care operations · Patient introduction')}</p><span>HEALTH MVP / {t('持续建设中','In development')}</span></footer></div>
}
