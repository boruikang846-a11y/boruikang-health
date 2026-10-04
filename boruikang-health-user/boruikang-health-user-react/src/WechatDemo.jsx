import React, { useEffect, useRef, useState } from 'react'
import { Button, Segmented, Tag } from 'antd'
import { CaretRightOutlined, LeftOutlined, PauseOutlined, ReloadOutlined, RightOutlined, SafetyCertificateOutlined } from '@ant-design/icons'

/**
 * Scripted walk-through of how the care team talks with a patient on WeCom and on the Official Account.
 * Everything is fictional and lives in this page: no WeChat connection, no request, no personal data.
 */
function scripts(t) {
  const welcome = t('您好，这里是健康管理团队。留言会在服务时间内回复；如遇胸痛、呼吸困难等紧急情况，请立即拨打 120 或前往急诊。', 'Hello, this is the care team. We reply to messages during service hours. For chest pain, trouble breathing or any emergency, call emergency services or go to the emergency department right away.')
  const reviewed = t('医生已审核', 'Doctor reviewed')
  return {
    wecom: { title: t('健康管家（演示）', 'Care coordinator (demo)'), subtitle: t('企业微信 · 一对一沟通', 'WeCom · one-to-one chat'), steps: [
      { role: 'system', bubbles: [{ who: 'event', text: t('患者扫描门诊的渠道二维码，添加「健康管家」为好友', 'The patient scans the clinic QR code and adds the care coordinator') }],
        title: t('生成微信联系人', 'A WeChat contact is created'), body: t('系统收到加好友事件，记下来源渠道和添加的成员，把这位好友放进「待绑定」。', 'The system receives the add-friend event, records the source channel and the staff member, and lists the friend as waiting to be linked.') },
      { role: 'system', bubbles: [{ who: 'team', text: welcome }],
        title: t('发送欢迎语', 'Welcome wording is sent'), body: t('欢迎语由运营主管在模板库里维护，加好友后发送一次。', 'The welcome wording is maintained by the operations manager and sent once after the friend is added.') },
      { role: 'team', bubbles: [{ who: 'patient', text: t('你好，我上周出院，想问随访怎么安排？', 'Hi, I was discharged last week. How will my follow-up work?') }],
        title: t('在企业微信里直接沟通', 'Everyday chat stays in WeCom'), body: t('日常问答由工作人员在企业微信里回复。系统没有开通会话存档，不读取聊天正文。', 'Staff answer everyday questions inside WeCom. Message archiving is not enabled, so the system does not read chat content.') },
      { role: 'team', bubbles: [{ who: 'team', text: t('好的。先和您核对一下：请问是演示患者一本人吗？方便说一下出院日期吗？', 'Sure. Let me confirm first: am I speaking with Demo Patient One? Could you tell me your discharge date?') }, { who: 'patient', text: t('是本人，9 月 26 日出院。', 'Yes, that is me. I was discharged on 26 September.') }],
        title: t('核实身份，绑定档案', 'Identity confirmed, record linked'), body: t('工作人员核实后，在后台把这位微信好友绑定到患者档案。不按手机号或昵称自动匹配。', 'After confirming identity, staff link this WeChat friend to the patient record. Nothing is matched automatically by phone number or nickname.') },
      { role: 'doctor', bubbles: [{ who: 'process', text: t('随访意见 · 责任医生审核通过', 'Follow-up guidance · approved by the responsible doctor') }],
        title: t('医生审核随访意见', 'The doctor reviews the guidance'), body: t('运营人员依据出院报告起草随访意见，责任医生在系统里审核通过后才能发给患者。', 'The team drafts follow-up guidance from the discharge report. It can be sent only after the responsible doctor approves it in the system.') },
      { role: 'team', bubbles: [{ who: 'team', tag: reviewed, text: t('演示患者一您好：出院已满一周，请继续按出院医嘱用药，留意有无不适。原定 10 月 8 日上午复诊，请带上出院小结和近期检查报告。有疑问可以直接在这里留言。', 'Hello Demo Patient One. It has been a week since discharge: please keep taking your medicines as written in the discharge instructions and watch for any discomfort. Your return visit is on the morning of 8 October; bring the discharge summary and recent test reports. You can leave a message here if you have questions.') }],
        title: t('发送已审核正文', 'Approved text is sent'), body: t('工作人员点击发送后，系统创建企业微信群发任务，由成员在企业微信里确认发出，并记录「待成员确认 → 已发出」的真实结果。', 'When staff click send, the system creates a WeCom message task that the member confirms inside WeCom, and records the real result: waiting for confirmation, then sent.') },
      { role: 'team', bubbles: [{ who: 'patient', text: t('收到，谢谢，我会按时去复诊。', 'Got it, thank you. I will come to the visit on time.') }],
        title: t('登记联系结果，医生查收', 'Outcome recorded, doctor informed'), body: t('工作人员登记本次联系结果，责任医生查收。全部过程进入患者时间轴。', 'Staff record the outcome of this contact and the responsible doctor receives it. Every step appears on the patient timeline.') },
    ] },
    official: { title: t('演示医院公众号', 'Demo hospital account'), subtitle: t('微信公众号 · 提醒与答复', 'Official Account · reminders and replies'), steps: [
      { role: 'system', bubbles: [{ who: 'event', text: t('患者扫描带渠道参数的二维码，关注医院公众号', 'The patient scans a QR code that carries the channel and follows the hospital account') }],
        title: t('记录关注与来源', 'Follow and source are recorded'), body: t('系统收到关注事件，生成微信联系人并带上来源渠道；工作人员核实身份后绑定到患者档案。', 'The system receives the follow event and creates a WeChat contact with its source channel. Staff link it to the patient record after confirming identity.') },
      { role: 'system', bubbles: [{ who: 'team', text: welcome }],
        title: t('发送欢迎语', 'Welcome wording is sent'), body: t('关注后发送一次欢迎语，说明服务时间和紧急情况的处理方式。', 'One welcome message explains service hours and what to do in an emergency.') },
      { role: 'team', bubbles: [{ who: 'card', title: t('复诊提醒', 'Return-visit reminder'), rows: [[t('提醒事项', 'Reminder'), t('复诊提醒', 'Return visit')], [t('时间', 'Time'), t('10 月 8 日 上午', '8 October, morning')], [t('备注', 'Note'), t('请按医生安排复诊，改期请联系健康管理团队', 'Please attend as arranged; contact the care team to reschedule')]] }],
        title: t('发送模板消息', 'A template message is sent'), body: t('复诊、随访等提醒用公众号模板消息发送。工作人员在后台选择模板、填写内容后发出，系统保存微信返回的结果，失败会如实显示。', 'Reminders go out as Official Account template messages. Staff choose a template and fill in the fields; the system keeps what WeChat returned and shows a failure as a failure.') },
      { role: 'system', bubbles: [{ who: 'patient', text: t('请问复诊需要带哪些资料？', 'What should I bring to the return visit?') }],
        title: t('来信进入待处理', 'The message waits for staff'), body: t('患者回复进入后台「公众号」页面的待处理，并显示未处理条数。', 'The reply appears in the staff workspace as waiting, with a count of unanswered messages.') },
      { role: 'team', bubbles: [{ who: 'team', text: t('请带身份证、医保卡、出院小结和近期检查报告。', 'Please bring your ID, insurance card, discharge summary and recent test reports.') }],
        title: t('48 小时内文字答复', 'Text reply within 48 hours'), body: t('患者 48 小时内有互动时，可以用文字答复；超过 48 小时只能发模板消息。', 'A text reply is possible while the patient has interacted within 48 hours; after that only template messages can be sent.') },
      { role: 'team', bubbles: [{ who: 'patient', text: t('最近有点头晕，需要调药吗？', 'I have felt a little dizzy lately. Should my medicine change?') }],
        title: t('转成咨询任务', 'Turned into a consultation'), body: t('涉及病情和用药的问题，工作人员不自行答复，转成咨询任务交责任医生。', 'Staff do not answer questions about symptoms or medication themselves; the message becomes a consultation for the responsible doctor.') },
      { role: 'doctor', bubbles: [{ who: 'team', tag: reviewed, text: t('您的问题已请责任医生看过：请继续按原医嘱用药，不要自行调整，并提前到院复查，我们已为您联系预约。如头晕加重或伴有胸闷，请立即就医。', 'Your responsible doctor has reviewed your question: please keep to the original prescription, do not adjust it yourself, and come in earlier for a check; we are arranging the appointment. If the dizziness gets worse or comes with chest tightness, seek care immediately.') }],
        title: t('医生审核后答复', 'Reply after doctor review'), body: t('责任医生在系统里审核答复内容，通过后工作人员才发给患者，并登记联系结果。', 'The responsible doctor reviews the reply in the system. Staff send it only after approval and record the outcome.') },
    ] },
  }
}

export default function WechatDemo({ t }) {
  const [channel, setChannel] = useState('wecom')
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const body = useRef(null)
  const script = scripts(t)[channel]
  const last = script.steps.length - 1
  const roles = { system: t('系统', 'System'), team: t('运营团队', 'Care team'), doctor: t('责任医生', 'Doctor') }
  useEffect(() => {
    if (!playing) return
    if (step >= last) { setPlaying(false); return }
    const timer = setTimeout(() => setStep(value => Math.min(last, value + 1)), 2600)
    return () => clearTimeout(timer)
  }, [playing, step, last])
  useEffect(() => { if (body.current) body.current.scrollTop = body.current.scrollHeight }, [step, channel])
  const go = value => { setPlaying(false); setStep(Math.max(0, Math.min(last, value))) }
  return <section id="wechat" className="section wechat-demo"><div className="section-intro" data-reveal><div className="eyebrow">HOW WE STAY IN TOUCH</div><h2>{t('企业微信与公众号，怎样和患者互动', 'How WeCom and the Official Account connect with patients')}</h2>
    <p>{t('点击「播放演示」，逐步查看一次完整的沟通：左边是患者手机上看到的，右边是系统里同时发生的事。', 'Press play to walk through one complete conversation: on the left, what the patient sees; on the right, what happens in the system at the same moment.')}</p></div>
    <div className="wechat-controls" data-reveal><Segmented value={channel} onChange={value => { setChannel(value); setStep(0); setPlaying(false) }} options={[{ value: 'wecom', label: t('企业微信', 'WeCom') }, { value: 'official', label: t('微信公众号', 'Official Account') }]} />
      <div className="wechat-buttons"><Button icon={<LeftOutlined />} disabled={step === 0} onClick={() => go(step - 1)} aria-label={t('上一步', 'Previous step')} />
        <Button type="primary" icon={playing ? <PauseOutlined /> : <CaretRightOutlined />} onClick={() => { if (!playing && step >= last) setStep(0); setPlaying(!playing) }}>{playing ? t('暂停', 'Pause') : step >= last ? t('重新播放', 'Play again') : t('播放演示', 'Play demo')}</Button>
        <Button icon={<RightOutlined />} disabled={step >= last} onClick={() => go(step + 1)} aria-label={t('下一步', 'Next step')} />
        <Button type="text" icon={<ReloadOutlined />} onClick={() => go(0)}>{t('回到开头', 'Restart')}</Button></div></div>
    <div className="wechat-stage" data-reveal><div className="phone" role="img" aria-label={t('患者手机上的聊天界面示意', 'Illustration of the chat on the patient’s phone')}>
      <div className="phone-notch" /><div className="phone-head"><b>{script.title}</b><small>{script.subtitle}</small></div>
      <div className="phone-body" ref={body}>{script.steps.slice(0, step + 1).map((item, index) => item.bubbles.map((bubble, order) => bubble.who === 'event' || bubble.who === 'process'
        ? <div className={'wx-event ' + bubble.who} key={index + '-' + order}>{bubble.who === 'process' && <SafetyCertificateOutlined />} {bubble.text}</div>
        : bubble.who === 'card' ? <div className="wx-row team" key={index + '-' + order}><div className="wx-card"><b>{bubble.title}</b>{bubble.rows.map(([name, value]) => <p key={name}><span>{name}</span>{value}</p>)}<small>{t('模板消息', 'Template message')}</small></div></div>
        : <div className={'wx-row ' + bubble.who} key={index + '-' + order}><div className="wx-bubble">{bubble.tag && <span className="wx-tag"><SafetyCertificateOutlined /> {bubble.tag}</span>}{bubble.text}</div></div>))}</div>
      <div className="phone-input"><span>{t('演示界面 · 不可输入', 'Demo screen · input disabled')}</span></div></div>
      <ol className="wechat-steps">{script.steps.map((item, index) => <li key={index} className={index === step ? 'current' : index < step ? 'done' : ''}><button type="button" onClick={() => go(index)} aria-current={index === step ? 'step' : undefined}>
        <span className="wechat-step-number">{index + 1}</span><span className="wechat-step-text"><Tag bordered={false} color={item.role === 'doctor' ? 'gold' : item.role === 'team' ? 'cyan' : 'default'}>{roles[item.role]}</Tag><b>{item.title}</b><small>{item.body}</small></span></button></li>)}</ol></div>
    <p className="wechat-note" data-reveal>{t('演示内容为虚构示例，不是真实对话；本页面不连接微信，也不收集任何信息。后台已具备这些沟通功能，真实的企业微信和公众号通道要在医院提供接入参数、完成联调后开通。', 'Everything shown is a fictional example, not a real conversation; this page does not connect to WeChat or collect any information. The staff workspace already supports these steps; real WeCom and Official Account channels open after the hospital provides its credentials and integration testing is complete.')}</p>
  </section>
}
