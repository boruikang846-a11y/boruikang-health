package com.boruikang.health.template.service;
import com.boruikang.health.audit.service.AuditService;
import com.boruikang.health.auth.service.CurrentAccount;
import com.boruikang.health.common.*;
import com.boruikang.health.mapper.*;
import com.boruikang.health.model.*;
import com.boruikang.health.patient.service.PatientAccess;
import com.boruikang.health.template.dto.*;
import com.github.pagehelper.PageHelper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
/** SMS, phone-script and WeChat wording templates plus the manual "already sent" ledger. Nothing here transmits a message; WeChat sending lives in the wechat package. */
@Service
public class TemplateService {
    private static final Logger log=LoggerFactory.getLogger(TemplateService.class);
    private final MessageTemplateMapper templates;private final MessageLogMapper logs;private final CareTaskMapper tasks;private final PatientAccess access;private final AuditService audit;
    public TemplateService(MessageTemplateMapper templates,MessageLogMapper logs,CareTaskMapper tasks,PatientAccess access,AuditService audit){this.templates=templates;this.logs=logs;this.tasks=tasks;this.access=access;this.audit=audit;}
    public Paged<TemplateResponse> query(TemplateQueryRequest req){
        log.info("query templates channel={} scene={}",req.channel(),req.scene());access.staff();MessageTemplateExample ex=new MessageTemplateExample();ex.eq("hospital_id",CurrentAccount.get().hospitalId());
        if(Checks.text(req.channel()))ex.eq("channel",req.channel());if(Checks.text(req.scene()))ex.eq("scene",req.scene());if(req.active()!=null)ex.eq("is_active",req.active());
        if(Checks.text(req.keyword()))ex.like("title","%"+req.keyword().trim()+"%");
        ex.setOrderByClause("channel ASC,scene ASC,id ASC");PageHelper.startPage(Paged.number(req.page()),Paged.size(req.size()));
        List<MessageTemplate> rows=templates.selectByExample(ex);return Paged.of(rows,TemplateService::view);
    }
    @Transactional
    public TemplateResponse save(SaveTemplateRequest req){
        log.info("save template id={} code={}",req.id(),req.code());access.manager();Long hospitalId=CurrentAccount.get().hospitalId();
        MessageTemplateExample duplicate=new MessageTemplateExample();duplicate.eq("hospital_id",hospitalId).eq("code",req.code());if(req.id()!=null)duplicate.ne("id",req.id());
        Checks.require(templates.countByExample(duplicate)==0,"Template code already exists / 模板编码重复");
        MessageTemplate row=new MessageTemplate();row.code=req.code();row.channel=req.channel();row.scene=req.scene();row.title=req.title().trim();row.content=req.content().trim();row.active=req.active()==null||req.active();
        boolean official="MP_TEMPLATE".equals(req.channel());row.externalTemplateId=official&&Checks.text(req.externalTemplateId())?req.externalTemplateId():"";
        Checks.require(!official||Checks.text(req.externalTemplateId()),"WeChat template id required / 公众号模板消息请填写微信模板 ID");
        if(official)com.boruikang.health.wechat.service.WechatLedger.templateData(row.content.replaceAll("\\{[^{}\\n]{1,30}}","x"));
        Checks.require(!"WELCOME".equals(req.scene())||("WECHAT".equals(req.channel())&&!com.boruikang.health.wechat.service.WechatLedger.hasPlaceholder(row.content)),"Welcome wording is sent as written / 欢迎语只用于微信渠道，会原样自动发送，不能包含 {占位}");
        if(req.id()==null){row.hospitalId=hospitalId;row.version=0;row.creator=CurrentAccount.get().userId().toString();templates.insertSelective(row);}
        else{MessageTemplate old=templates.selectByPrimaryKey(req.id());Checks.found(old!=null&&hospitalId.equals(old.hospitalId));Checks.conflict(req.version()!=null&&req.version().equals(old.version));
            row.version=old.version+1;row.modifier=CurrentAccount.get().userId().toString();MessageTemplateExample ex=new MessageTemplateExample();ex.eq("id",old.id).eq("hospital_id",hospitalId).eq("version",old.version);Checks.conflict(templates.updateByExampleSelective(row,ex)==1);row.id=old.id;}
        audit.append(null,req.id()==null?"TEMPLATE_CREATED":"TEMPLATE_UPDATED",row.id,null,row.active?"ACTIVE":"INACTIVE",req.code());return view(templates.selectByPrimaryKey(row.id));
    }
    @Transactional
    public MessageLogResponse logMessage(LogMessageRequest req){
        log.info("log sent message patientId={} channel={}",req.patientId(),req.channel());access.operations();Patient p=access.lock(req.patientId());
        MessageLogExample dup=new MessageLogExample();dup.eq("hospital_id",p.hospitalId).eq("request_key",req.requestKey());PageHelper.startPage(1,1,false);List<MessageLog> existing=logs.selectByExample(dup);
        if(!existing.isEmpty()){Checks.conflict(p.id.equals(existing.getFirst().patientId));return view(existing.getFirst());}
        if(req.taskId()!=null){CareTask t=tasks.selectByPrimaryKey(req.taskId());Checks.require(t!=null&&p.id.equals(t.patientId),"Task must belong to this patient / 任务与患者不符");}
        if(Checks.text(req.templateCode())){MessageTemplateExample tx=new MessageTemplateExample();tx.eq("hospital_id",p.hospitalId).eq("code",req.templateCode());Checks.require(templates.countByExample(tx)==1,"Unknown template code / 模板编码不存在");}
        MessageLog m=new MessageLog();m.hospitalId=p.hospitalId;m.patientId=p.id;m.taskId=req.taskId();m.channel=req.channel();m.templateCode=req.templateCode();m.content=req.content().trim();m.sentAt=req.sentAt();m.actorId=CurrentAccount.get().userId();m.evidence=req.evidence().trim();m.requestKey=req.requestKey();m.creator=m.actorId.toString();
        logs.insertSelective(m);
        if(req.taskId()!=null){CareTask t=tasks.selectByPrimaryKey(req.taskId());if(t.reminderSentAt==null){CareTask patch=new CareTask();patch.reminderSentAt=req.sentAt();patch.version=t.version+1;patch.modifier=m.creator;CareTaskExample tx=new CareTaskExample();tx.eq("id",t.id).eq("version",t.version);tasks.updateByExampleSelective(patch,tx);}}
        audit.append(p.id,"MESSAGE_SENT_RECORDED",m.id,null,req.channel(),"Manual registration; template="+(req.templateCode()==null?"-":req.templateCode()));return view(logs.selectByPrimaryKey(m.id));
    }
    public Paged<MessageLogResponse> logs(MessageLogQueryRequest req){
        log.info("query message logs patientId={}",req.patientId());access.staff();MessageLogExample ex=new MessageLogExample();ex.eq("hospital_id",CurrentAccount.get().hospitalId());
        if(req.patientId()!=null){access.require(req.patientId());ex.eq("patient_id",req.patientId());}else {access.operations();if(access.executor())ex.eq("actor_id",CurrentAccount.get().userId());}
        if(req.taskId()!=null)ex.eq("task_id",req.taskId());if(Checks.text(req.channel()))ex.eq("channel",req.channel());
        if(req.from()!=null)ex.ge("sent_at",req.from().atStartOfDay());if(req.to()!=null)ex.lt("sent_at",req.to().plusDays(1).atStartOfDay());
        ex.setOrderByClause("sent_at DESC,id DESC");PageHelper.startPage(Paged.number(req.page()),Paged.size(req.size()));
        List<MessageLog> rows=logs.selectByExample(ex);return Paged.of(rows,TemplateService::view);
    }
    private static TemplateResponse view(MessageTemplate t){return new TemplateResponse(t.id,t.code,t.channel,t.scene,t.title,t.content,t.active,t.version,Checks.text(t.externalTemplateId)?t.externalTemplateId:null);}
    private static MessageLogResponse view(MessageLog m){return new MessageLogResponse(m.id,m.patientId,m.taskId,m.channel,m.templateCode,m.content,m.sentAt,m.actorId,m.evidence);}
}
