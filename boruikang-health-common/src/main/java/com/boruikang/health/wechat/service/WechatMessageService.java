package com.boruikang.health.wechat.service;
import com.boruikang.health.auth.service.CurrentAccount;
import com.boruikang.health.common.Checks;
import com.boruikang.health.common.Paged;
import com.boruikang.health.common.exception.BizException;
import com.boruikang.health.mapper.WechatContactMapper;
import com.boruikang.health.mapper.WechatMessageMapper;
import com.boruikang.health.model.*;
import com.boruikang.health.patient.service.PatientAccess;
import com.boruikang.health.task.dto.TaskResponse;
import com.boruikang.health.wechat.dto.*;
import com.github.pagehelper.PageHelper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import java.util.List;
/**
 * Sends a message when a staff member asks for it and keeps what WeChat really answered.
 * Accepted by the WeChat API is all "SENT" means; it is not proof the patient read it and never replaces the contact record of a task.
 */
@Service
public class WechatMessageService {
    private static final Logger log=LoggerFactory.getLogger(WechatMessageService.class);
    private final WechatMessageMapper messages;private final WechatContactMapper contacts;private final PatientAccess access;private final WechatConfigService configs;private final WechatLedger ledger;
    public WechatMessageService(WechatMessageMapper messages,WechatContactMapper contacts,PatientAccess access,WechatConfigService configs,WechatLedger ledger) {
        this.messages=messages;this.contacts=contacts;this.access=access;this.configs=configs;this.ledger=ledger;
    }
    public Paged<WechatMessageResponse> query(WechatMessageQueryRequest req) {
        log.info("query wechat messages contactId={}",req.contactId());access.staff();WechatContact c=contact(req.contactId());ledger.visible(c);
        WechatMessageExample ex=new WechatMessageExample();ex.eq("hospital_id",c.hospitalId).eq("contact_id",c.id);
        PageHelper.startPage(Paged.number(req.page()),Paged.size(req.size()));List<WechatMessage> rows=messages.selectByExample(ex);return Paged.of(rows,WechatMessageService::view);
    }
    public WechatMessageResponse send(SendWechatMessageRequest req) {
        log.info("send wechat message contactId={} kind={}",req.contactId(),req.kind());WechatLedger.Outbound out=ledger.prepareSend(req);
        if(out.replay())return view(out.message());
        // External network I/O deliberately runs outside the short database write transactions.
        WechatGateway gateway=configs.gateway(out.config());WechatContact c=out.contact();WechatMessage m=out.message();String status="SENT",id=null,error=null;
        try {
            if(WechatConfigService.WE_COM.equals(c.channel)) { id=gateway.createWecomMass(out.config(),c.staffUserId,c.externalId,m.content);status="PENDING_CONFIRM"; }
            else if("TEMPLATE".equals(m.kind))id=gateway.sendOfficialTemplate(out.config(),c.externalId,out.templateId(),out.data());
            else id=gateway.sendOfficialText(out.config(),c.externalId,m.content);
        } catch(BizException ex) { status="FAILED";error=ex.getMessage().length()>300?ex.getMessage().substring(0,300):ex.getMessage(); }
        return view(ledger.completeSend(m,status,Checks.text(id)?id:null,error));
    }
    /** Asks WeCom whether the member confirmed a mass task that is still waiting. */
    public WechatMessageResponse refresh(Long id) {
        log.info("refresh wechat message id={}",id);access.operations();WechatMessage m=messages.selectByPrimaryKey(id);
        Checks.found(m!=null&&CurrentAccount.get().hospitalId().equals(m.hospitalId));WechatContact c=contact(m.contactId);ledger.visible(c);
        Checks.require(WechatConfigService.WE_COM.equals(m.channel)&&"PENDING_CONFIRM".equals(m.status)&&Checks.text(m.externalMsgId)&&Checks.text(c.staffUserId),"Only a WeCom task waiting for confirmation can be refreshed / 只有待成员确认的企业微信群发可以刷新结果");
        IntegrationConfig config=configs.active(m.hospitalId,m.channel);String status=configs.gateway(config).wecomMassStatus(config,m.externalMsgId,c.staffUserId,c.externalId);
        return view("PENDING_CONFIRM".equals(status)?m:ledger.result(m,status));
    }
    public TaskResponse consult(Long id) { log.info("wechat message to consultation id={}",id);return ledger.consult(id); }
    private WechatContact contact(Long id) { WechatContact c=contacts.selectByPrimaryKey(id);Checks.found(c!=null&&CurrentAccount.get().hospitalId().equals(c.hospitalId));return c; }
    public static WechatMessageResponse view(WechatMessage m) {
        return new WechatMessageResponse(m.id,m.contactId,m.channel,m.direction,m.kind,m.content,m.templateCode,m.taskId,m.status,m.externalMsgId,m.error,m.actorId,m.sentAt,m.handledAt,Boolean.TRUE.equals(m.mock));
    }
}
