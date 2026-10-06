package com.boruikang.health.wechat.service;
import com.boruikang.health.audit.service.AuditService;
import com.boruikang.health.auth.service.CurrentAccount;
import com.boruikang.health.common.Checks;
import com.boruikang.health.mapper.*;
import com.boruikang.health.model.*;
import com.boruikang.health.patient.service.PatientAccess;
import com.boruikang.health.task.dto.TaskResponse;
import com.boruikang.health.task.service.TaskService;
import com.boruikang.health.wechat.dto.SendWechatMessageRequest;
import com.github.pagehelper.PageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
/**
 * Short database transactions of the WeChat channels: contacts, the message ledger and the rules a message must pass before it leaves.
 * Network calls stay in the calling services, outside these transactions. Lock order is always contact first, then patient.
 */
@Service
public class WechatLedger {
    /** One callback, already verified and parsed. type: FOLLOW, SCAN, UNFOLLOW, TOUCH or TEXT. */
    public record Inbound(String channel,String type,String externalId,String staffUserId,String scene,String text,String welcomeCode,String key,boolean mock) {}
    public record InboundResult(WechatContact contact,boolean welcome) {}
    /** A message row in SENDING state together with what the gateway needs; replay marks a repeated request key. */
    public record Outbound(WechatMessage message,WechatContact contact,IntegrationConfig config,String templateId,Map<String,String> data,boolean replay) {}
    private static final String SYSTEM="wechat-callback";
    private final WechatContactMapper contacts;private final WechatMessageMapper messages;private final IntakeChannelMapper channels;private final HealthAccountMapper accounts;
    private final MessageTemplateMapper templates;private final CareTaskMapper tasks;private final CareMessageMapper careMessages;private final PatientAccess access;private final AuditService audit;private final WechatConfigService configs;
    public WechatLedger(WechatContactMapper contacts,WechatMessageMapper messages,IntakeChannelMapper channels,HealthAccountMapper accounts,MessageTemplateMapper templates,CareTaskMapper tasks,CareMessageMapper careMessages,PatientAccess access,AuditService audit,WechatConfigService configs) {
        this.contacts=contacts;this.messages=messages;this.channels=channels;this.accounts=accounts;this.templates=templates;this.tasks=tasks;this.careMessages=careMessages;this.access=access;this.audit=audit;this.configs=configs;
    }
    /** A bound contact follows the patient's scope; a contact waiting for binding is open to the operations roles only. */
    public Patient visible(WechatContact c) { if(c.patientId>0)return access.require(c.patientId);access.operations();return null; }
    /** Records one callback exactly once. Returns null when it was a repeat or changed nothing. */
    @Transactional
    public InboundResult recordInbound(Long hospitalId,Inbound e) {
        if(byKey(hospitalId,e.key())!=null)return null;
        LocalDateTime now=LocalDateTime.now().withNano(0);WechatContact c=find(hospitalId,e.channel(),e.externalId());
        boolean wecom=WechatConfigService.WE_COM.equals(e.channel()),created=c==null;
        if(created) {
            if(List.of("UNFOLLOW","TOUCH").contains(e.type()))return null;
            c=new WechatContact();c.hospitalId=hospitalId;c.channel=e.channel();c.externalId=e.externalId();c.relation="ACTIVE";c.pendingCount=0;c.patientId=0L;c.mock=e.mock();c.version=0;c.creator=SYSTEM;
            if("FOLLOW".equals(e.type()))c.followedAt=now;
            contacts.insertSelective(c);
        }
        boolean otherMember=wecom&&Checks.text(c.staffUserId)&&Checks.text(e.staffUserId())&&!c.staffUserId.equals(e.staffUserId());
        IntakeChannel source=channel(hospitalId,e.scene());String suffix=source==null?"":"（渠道："+source.title+"）";
        WechatContact patch=new WechatContact();patch.modifier=SYSTEM;String content,kind="EVENT",status="HANDLED",action=null;boolean welcome=false;
        switch(e.type()) {
            case "FOLLOW" -> {
                boolean rejoined="REMOVED".equals(c.relation);
                if(otherMember&&!rejoined)content="另一位成员也添加了该客户";
                else {
                    content=(wecom?"添加企业微信好友":"关注公众号")+suffix;welcome=created||rejoined;if(welcome)action="WECHAT_CONTACT_ADDED";
                    patch.relation="ACTIVE";if(rejoined) { patch.followedAt=now;patch.version=c.version+1; }
                    if(Checks.text(e.staffUserId())) { patch.staffUserId=e.staffUserId();HealthAccount staff=staff(hospitalId,e.staffUserId());if(staff!=null)patch.staffAccountId=staff.id; }
                    if(Checks.text(e.scene()))patch.scene=e.scene();if(source!=null)patch.intakeChannelId=source.id;
                }
                if(!wecom)patch.lastInboundAt=now;
            }
            case "SCAN" -> { content="扫描渠道二维码"+suffix;patch.relation="ACTIVE";patch.lastInboundAt=now;if(Checks.text(e.scene()))patch.scene=e.scene();if(source!=null)patch.intakeChannelId=source.id; }
            case "UNFOLLOW" -> {
                // Another member's friendship ending does not end the one this contact is served through.
                if(otherMember||"REMOVED".equals(c.relation))return null;
                content=wecom?"企业微信好友关系已解除":"取消关注公众号";action="WECHAT_CONTACT_REMOVED";patch.relation="REMOVED";patch.removedAt=now;patch.version=c.version+1;
            }
            case "TOUCH" -> { patch.lastInboundAt=now;update(c,patch);return new InboundResult(c,false); }
            default -> { kind="TEXT";status="RECEIVED";content=Checks.text(e.text())?limit(e.text().trim(),2000):"[空消息]";patch.relation="ACTIVE";patch.lastInboundAt=now;patch.pendingCount=c.pendingCount+1; }
        }
        patch.lastMessageAt=now;patch.lastMessagePreview=limit(content,120);update(c,patch);
        WechatMessage m=message(c,"INBOUND",kind,content,status,0L,now,e.mock(),e.key());m.creator=SYSTEM;messages.insertSelective(m);
        if(action!=null)audit.appendSystem(hospitalId,c.patientId>0?c.patientId:null,action,c.id,created?null:c.relation,patch.relation,e.channel());
        return new InboundResult(contacts.selectByPrimaryKey(c.id),welcome);
    }
    /** Delivery receipt of an Official Account template message. Only a reported failure changes the stored result. */
    @Transactional
    public void templateResult(Long hospitalId,String msgId,String result) {
        if(!Checks.text(msgId)||result==null||result.startsWith("success"))return;
        WechatMessageExample ex=new WechatMessageExample();ex.eq("hospital_id",hospitalId).eq("channel",WechatConfigService.OFFICIAL).eq("external_msg_id",msgId).eq("status","SENT");
        WechatMessage patch=new WechatMessage();patch.status="FAILED";patch.error=limit("微信回执："+result,300);patch.modifier=SYSTEM;
        if(messages.updateByExampleSelective(patch,ex)>0)audit.appendSystem(hospitalId,null,"WECHAT_MESSAGE_RESULT",null,"SENT","FAILED","template receipt "+msgId);
    }
    /** The enabled WeChat welcome wording; wording that still carries a {placeholder} is never sent automatically. */
    public MessageTemplate welcomeTemplate(Long hospitalId) {
        MessageTemplateExample ex=new MessageTemplateExample();ex.eq("hospital_id",hospitalId).eq("channel","WECHAT").eq("scene","WELCOME").eq("is_active",true);ex.setOrderByClause("id ASC");
        PageHelper.startPage(1,1,false);List<MessageTemplate> rows=templates.selectByExample(ex);
        return rows.isEmpty()||hasPlaceholder(rows.getFirst().content)?null:rows.getFirst();
    }
    @Transactional
    public void recordWelcome(WechatContact c,MessageTemplate t,String status,String externalMsgId,String error,boolean mock) {
        LocalDateTime now=LocalDateTime.now().withNano(0);WechatMessage m=message(c,"OUTBOUND","WELCOME",t.content,status,0L,now,mock,"welcome-"+UUID.randomUUID());
        m.templateCode=t.code;m.externalMsgId=externalMsgId;m.error=error;m.creator=SYSTEM;messages.insertSelective(m);
        WechatContact patch=new WechatContact();patch.lastMessageAt=now;patch.lastMessagePreview=limit(t.content,120);patch.modifier=SYSTEM;update(c,patch);
    }
    /** Adds or refreshes contacts from a manual sync. Bindings, pending counts and messages are left alone. Returns {created, updated}. */
    @Transactional
    public int[] upsert(Long hospitalId,String channel,List<WechatGateway.Profile> profiles,boolean mock) {
        int created=0,updated=0;String actor=CurrentAccount.get().userId().toString();
        for(WechatGateway.Profile p:profiles) {
            WechatContact c=find(hospitalId,channel,p.externalId());IntakeChannel source=channel(hospitalId,p.scene());
            // A customer two members added keeps the member it is already served through.
            String member=c!=null&&"ACTIVE".equals(c.relation)&&Checks.text(c.staffUserId)?c.staffUserId:p.staffUserId();HealthAccount staff=staff(hospitalId,member);
            WechatContact row=new WechatContact();row.unionId=p.unionId();row.nickname=p.nickname();row.staffUserId=member;row.staffAccountId=staff==null?null:staff.id;row.relation="ACTIVE";
            if(Checks.text(p.scene()))row.scene=p.scene();if(source!=null)row.intakeChannelId=source.id;
            if(c==null) { row.hospitalId=hospitalId;row.channel=channel;row.externalId=p.externalId();row.followedAt=p.followedAt();row.pendingCount=0;row.patientId=0L;row.mock=mock;row.version=0;row.creator=actor;contacts.insertSelective(row);created++; }
            else { if(c.followedAt==null)row.followedAt=p.followedAt();if("REMOVED".equals(c.relation))row.version=c.version+1;row.modifier=actor;update(c,row);updated++; }
        }
        return new int[]{created,updated};
    }
    /** Checks every sending rule and stores the message as SENDING. A repeated request key returns the first row and sends nothing. */
    @Transactional
    public Outbound prepareSend(SendWechatMessageRequest req) {
        access.operations();var actor=CurrentAccount.get();WechatMessage previous=byKey(actor.hospitalId(),req.requestKey());
        if(previous!=null) { Checks.conflict(previous.contactId.equals(req.contactId())&&"OUTBOUND".equals(previous.direction));return new Outbound(previous,null,null,null,null,true); }
        WechatContact c=lock(actor.hospitalId(),req.contactId());Patient p=c.patientId>0?access.lock(c.patientId):null;
        Checks.require("ACTIVE".equals(c.relation),"Contact is no longer reachable / 对方已删除好友或取消关注，无法发送");
        IntegrationConfig config=configs.active(actor.hospitalId(),c.channel);boolean official=WechatConfigService.OFFICIAL.equals(c.channel);
        Checks.require(configs.mock(config)==Boolean.TRUE.equals(c.mock),"Simulated and real contacts cannot be mixed / 模拟联系人只能走模拟通道，真实联系人只能走正式通道");
        String content,templateId=null,templateCode=null;Map<String,String> data=null;Long taskId=null;
        switch(req.kind()) {
            case "TEMPLATE" -> {
                Checks.require(official,"WeCom has no template messages / 企业微信没有模板消息，请发送文字");MessageTemplate t=template(actor.hospitalId(),req.templateCode());
                Checks.require(t!=null&&Boolean.TRUE.equals(t.active)&&"MP_TEMPLATE".equals(t.channel)&&Checks.text(t.externalTemplateId),"Choose an enabled Official Account template with its WeChat template id / 请选择已启用并登记了微信模板 ID 的公众号模板");
                Checks.require(Checks.text(req.content())&&!hasPlaceholder(req.content()),"Fill in every {placeholder} / 请先把 {占位} 替换成实际内容");
                data=templateData(req.content());content=String.join("\n",data.entrySet().stream().map(x->x.getKey()+"="+x.getValue()).toList());templateId=t.externalTemplateId;templateCode=t.code;
            }
            case "APPROVED_ADVICE" -> {
                Checks.require(p!=null&&req.taskId()!=null,"Bind the contact and choose the task / 已审核正文只能发给已绑定患者，并需指定任务");CareTask t=tasks.selectByPrimaryKey(req.taskId());
                Checks.require(t!=null&&p.hospitalId.equals(t.hospitalId)&&p.id.equals(t.patientId)&&List.of("FOLLOWUP","CONSULTATION").contains(t.taskType),"Task must belong to this patient / 任务与患者不符");
                Checks.conflict("APPROVED".equals(t.status));
                Checks.require(Checks.text(t.approvedText)&&Objects.equals(t.reviewerId,p.doctorId),"Current responsible doctor approval required / 需责任医生审核通过后才能发送");
                content=t.approvedText;taskId=t.id;
            }
            default -> {
                Checks.require(Checks.text(req.content())&&!hasPlaceholder(req.content()),"Fill in the text and every {placeholder} / 请填写内容，并把 {占位} 替换成实际内容");content=req.content().trim();
                if(Checks.text(req.templateCode())) { MessageTemplate t=template(actor.hospitalId(),req.templateCode());Checks.require(t!=null&&"WECHAT".equals(t.channel),"Unknown template code / 模板编码不存在");templateCode=t.code; }
            }
        }
        if(!"TEMPLATE".equals(req.kind())) {
            int bytes=content.getBytes(StandardCharsets.UTF_8).length;
            if(official) {
                Checks.require(c.lastInboundAt!=null&&c.lastInboundAt.isAfter(LocalDateTime.now().minusHours(48)),"No interaction within 48 hours / 患者 48 小时内没有互动，公众号不能发文字；请改发模板消息或电话联系");
                Checks.require(bytes<=2048,"Text too long for the Official Account / 超过公众号单条文字上限（约 680 个汉字），请精简或改用电话");
            } else {
                Checks.require(Checks.text(c.staffUserId),"No WeCom member is linked to this customer / 该客户没有添加成员记录，无法创建群发任务");
                Checks.require(bytes<=4000,"Text too long for WeCom / 超过企业微信单条文字上限（约 1300 个汉字），请精简或改用电话");
            }
        }
        WechatMessage m=message(c,"OUTBOUND",req.kind(),content,"SENDING",actor.userId(),LocalDateTime.now().withNano(0),configs.mock(config),req.requestKey());
        m.templateCode=templateCode;m.taskId=taskId;m.creator=actor.userId().toString();messages.insertSelective(m);
        return new Outbound(messages.selectByPrimaryKey(m.id),c,config,templateId,data,false);
    }
    /** Stores what the gateway really answered. A message that left also answers the contact's waiting messages. */
    @Transactional
    public WechatMessage completeSend(WechatMessage m,String status,String externalMsgId,String error) {
        var actor=CurrentAccount.get();WechatContact c=lock(m.hospitalId,m.contactId);
        WechatMessage patch=new WechatMessage();patch.status=status;patch.externalMsgId=externalMsgId;patch.error=error;patch.modifier=actor.userId().toString();
        WechatMessageExample ex=new WechatMessageExample();ex.eq("id",m.id).eq("hospital_id",m.hospitalId).eq("status","SENDING");Checks.conflict(messages.updateByExampleSelective(patch,ex)==1);
        if(!"FAILED".equals(status)) {
            LocalDateTime now=LocalDateTime.now().withNano(0);answer(c,actor.userId(),now);
            WechatContact seen=new WechatContact();seen.pendingCount=0;seen.lastMessageAt=now;seen.lastMessagePreview=limit(m.content,120);seen.modifier=patch.modifier;update(c,seen);
        }
        audit.append(c.patientId>0?c.patientId:null,"WECHAT_MESSAGE_SENT",m.id,"SENDING",status,"kind="+m.kind+"; channel="+m.channel+(m.taskId==null?"":"; task="+m.taskId));
        return messages.selectByPrimaryKey(m.id);
    }
    /** Result of a WeCom mass task after the member confirmed or WeCom refused it. */
    @Transactional
    public WechatMessage result(WechatMessage m,String status) {
        WechatMessage patch=new WechatMessage();patch.status=status;patch.modifier=CurrentAccount.get().userId().toString();if("FAILED".equals(status))patch.error="企业微信未发出：客户已不是好友，或当天已收到其他群发";
        WechatMessageExample ex=new WechatMessageExample();ex.eq("id",m.id).eq("hospital_id",m.hospitalId).eq("status","PENDING_CONFIRM");
        if(messages.updateByExampleSelective(patch,ex)==1)audit.append(null,"WECHAT_MESSAGE_RESULT",m.id,"PENDING_CONFIRM",status,"WeCom mass task result");
        return messages.selectByPrimaryKey(m.id);
    }
    @Transactional
    public WechatContact bind(Long id,Integer version,Long patientId) {
        access.operations();var actor=CurrentAccount.get();WechatContact c=lock(actor.hospitalId(),id);Checks.conflict(version.equals(c.version)&&c.patientId==0);Patient p=access.lock(patientId);
        WechatContact patch=new WechatContact();patch.patientId=p.id;patch.boundAt=LocalDateTime.now().withNano(0);patch.boundBy=actor.userId();patch.version=c.version+1;patch.modifier=actor.userId().toString();update(c,patch);
        audit.append(p.id,"WECHAT_CONTACT_BOUND",c.id,"UNBOUND","BOUND","channel="+c.channel);return contacts.selectByPrimaryKey(c.id);
    }
    @Transactional
    public WechatContact unbind(Long id,Integer version,String reason) {
        access.operations();var actor=CurrentAccount.get();WechatContact c=lock(actor.hospitalId(),id);Checks.conflict(version.equals(c.version)&&c.patientId>0);Patient p=access.lock(c.patientId);
        WechatContact patch=new WechatContact();patch.patientId=0L;patch.version=c.version+1;patch.modifier=actor.userId().toString();update(c,patch);
        audit.append(p.id,"WECHAT_CONTACT_UNBOUND",c.id,"BOUND","UNBOUND",limit("channel="+c.channel+"; "+reason.trim(),500));return contacts.selectByPrimaryKey(c.id);
    }
    /** Marks every waiting message of the contact as handled without replying. */
    @Transactional
    public WechatContact handle(Long id) {
        access.operations();var actor=CurrentAccount.get();WechatContact c=lock(actor.hospitalId(),id);visible(c);
        answer(c,actor.userId(),LocalDateTime.now().withNano(0));WechatContact patch=new WechatContact();patch.pendingCount=0;patch.modifier=actor.userId().toString();update(c,patch);
        return contacts.selectByPrimaryKey(c.id);
    }
    /** Turns a bound patient's message into a consultation task that follows the usual draft, doctor review and contact steps. */
    @Transactional
    public TaskResponse consult(Long messageId) {
        access.operations();var actor=CurrentAccount.get();WechatMessage m=messages.selectByPrimaryKey(messageId);Checks.found(m!=null&&actor.hospitalId().equals(m.hospitalId));
        Checks.require("INBOUND".equals(m.direction)&&"TEXT".equals(m.kind),"Only a patient's message can become a consultation / 只有患者来信可以转成咨询任务");
        WechatContact c=lock(actor.hospitalId(),m.contactId);Checks.require(c.patientId>0,"Bind the contact to a patient first / 请先把该微信联系人绑定到患者档案");
        Patient p=access.lock(c.patientId);String key="wechat-consult-"+m.id;
        CareTaskExample duplicate=new CareTaskExample();duplicate.eq("hospital_id",p.hospitalId).eq("request_key",key);PageHelper.startPage(1,1,false);List<CareTask> existing=tasks.selectByExample(duplicate);
        if(!existing.isEmpty())return TaskService.view(existing.getFirst(),p);
        Checks.require(!List.of("PAUSED","CLOSED").contains(p.lifecycle),"Patient management is paused / 患者已暂停或结案");
        CareTask t=new CareTask();t.hospitalId=p.hospitalId;t.patientId=p.id;t.taskType="CONSULTATION";t.title="微信咨询待处理";t.priority="P2";t.status="PENDING";
        t.assigneeId=p.ownerId;t.doctorId=p.doctorId;t.dueAt=LocalDateTime.now().plusDays(1).withNano(0);t.requestKey=key;t.version=0;t.creator=actor.userId().toString();tasks.insertSelective(t);
        CareMessage question=new CareMessage();question.hospitalId=p.hospitalId;question.patientId=p.id;question.taskId=t.id;question.senderId=actor.userId();question.senderRole="WECHAT";
        question.direction="PATIENT_TO_STAFF";question.content=m.content;question.creator=t.creator;careMessages.insertSelective(question);
        WechatMessage handled=new WechatMessage();handled.status="HANDLED";handled.handledAt=LocalDateTime.now().withNano(0);handled.handledBy=actor.userId();handled.modifier=t.creator;
        WechatMessageExample ex=new WechatMessageExample();ex.eq("id",m.id).eq("status","RECEIVED");
        if(messages.updateByExampleSelective(handled,ex)==1) { WechatContact patch=new WechatContact();patch.pendingCount=Math.max(0,c.pendingCount-1);patch.modifier=t.creator;update(c,patch); }
        audit.append(p.id,"CONSULTATION_RECEIVED",t.id,null,"PENDING","WeChat message "+m.id+"; human reply required");
        return TaskService.view(tasks.selectByPrimaryKey(t.id),p);
    }
    /** Template message fields, one "name=value" per line, in the order written. */
    public static Map<String,String> templateData(String content) {
        Map<String,String> data=new LinkedHashMap<>();
        for(String line:content.split("\\R")) {
            if(line.isBlank())continue;int at=line.indexOf('=');String name=at<1?"":line.substring(0,at).trim(),value=at<1?"":line.substring(at+1).trim();
            Checks.require(name.matches("[A-Za-z0-9_]{1,32}")&&Checks.text(value)&&value.length()<=200&&!data.containsKey(name),"Each line must be a unique field=value / 模板消息每行写成「字段=内容」，字段不能重复");
            data.put(name,value);
        }
        Checks.require(!data.isEmpty()&&data.size()<=20,"One to twenty fields required / 模板消息需要 1–20 个字段");return data;
    }
    public static boolean hasPlaceholder(String content) { return content!=null&&content.matches("(?s).*\\{[^{}\\n]{1,30}}.*"); }
    private void answer(WechatContact c,Long actorId,LocalDateTime now) {
        WechatMessage patch=new WechatMessage();patch.status="HANDLED";patch.handledAt=now;patch.handledBy=actorId;patch.modifier=actorId.toString();
        WechatMessageExample ex=new WechatMessageExample();ex.eq("hospital_id",c.hospitalId).eq("contact_id",c.id).eq("direction","INBOUND").eq("status","RECEIVED");messages.updateByExampleSelective(patch,ex);
    }
    private WechatContact find(Long hospitalId,String channel,String externalId) {
        // Unique lookup: pagination would append LIMIT after FOR UPDATE.
        WechatContactExample ex=new WechatContactExample();ex.eq("hospital_id",hospitalId).eq("channel",channel).eq("external_id",externalId);ex.setForUpdate(true);
        List<WechatContact> rows=contacts.selectByExample(ex);return rows.isEmpty()?null:rows.getFirst();
    }
    private WechatContact lock(Long hospitalId,Long id) {
        WechatContactExample ex=new WechatContactExample();ex.eq("id",id).eq("hospital_id",hospitalId);ex.setForUpdate(true);
        List<WechatContact> rows=contacts.selectByExample(ex);Checks.found(!rows.isEmpty());return rows.getFirst();
    }
    private void update(WechatContact c,WechatContact patch) { WechatContactExample ex=new WechatContactExample();ex.eq("id",c.id).eq("hospital_id",c.hospitalId);contacts.updateByExampleSelective(patch,ex); }
    private WechatMessage byKey(Long hospitalId,String key) {
        WechatMessageExample ex=new WechatMessageExample();ex.eq("hospital_id",hospitalId).eq("request_key",key);PageHelper.startPage(1,1,false);
        List<WechatMessage> rows=messages.selectByExample(ex);return rows.isEmpty()?null:rows.getFirst();
    }
    private MessageTemplate template(Long hospitalId,String code) {
        if(!Checks.text(code))return null;MessageTemplateExample ex=new MessageTemplateExample();ex.eq("hospital_id",hospitalId).eq("code",code);PageHelper.startPage(1,1,false);
        List<MessageTemplate> rows=templates.selectByExample(ex);return rows.isEmpty()?null:rows.getFirst();
    }
    /** The intake channel behind a QR parameter of the form ch&lt;id&gt;, when it belongs to this hospital. */
    private IntakeChannel channel(Long hospitalId,String scene) {
        if(scene==null||!scene.matches("ch\\d{1,18}"))return null;IntakeChannel channel=channels.selectByPrimaryKey(Long.valueOf(scene.substring(2)));
        return channel!=null&&hospitalId.equals(channel.hospitalId)?channel:null;
    }
    private HealthAccount staff(Long hospitalId,String wecomUserId) {
        if(!Checks.text(wecomUserId))return null;HealthAccountExample ex=new HealthAccountExample();ex.eq("hospital_id",hospitalId).eq("wecom_user_id",wecomUserId);PageHelper.startPage(1,1,false);
        List<HealthAccount> rows=accounts.selectByExample(ex);return rows.isEmpty()?null:rows.getFirst();
    }
    private static WechatMessage message(WechatContact c,String direction,String kind,String content,String status,Long actorId,LocalDateTime at,boolean mock,String key) {
        WechatMessage m=new WechatMessage();m.hospitalId=c.hospitalId;m.contactId=c.id;m.channel=c.channel;m.direction=direction;m.kind=kind;m.content=content;m.status=status;m.actorId=actorId;m.sentAt=at;m.mock=mock;m.requestKey=key;return m;
    }
    private static String limit(String value,int max) { return value.length()<=max?value:value.substring(0,max); }
}
