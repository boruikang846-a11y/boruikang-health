package com.bgssai.health.wechat.service;
import com.bgssai.health.auth.service.CurrentAccount;
import com.bgssai.health.common.Checks;
import com.bgssai.health.common.exception.BizException;
import com.bgssai.health.model.IntegrationConfig;
import com.bgssai.health.model.MessageTemplate;
import com.bgssai.health.patient.service.PatientAccess;
import com.bgssai.health.wechat.dto.MockInboundRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import java.util.Map;
import java.util.UUID;
/**
 * Entry point of WeChat callbacks. Nothing is trusted before the signature matches the hospital's callback token;
 * there is no logged-in account here, so the hospital comes from the callback path and the actor is recorded as 0.
 */
@Service
public class WechatInboundService {
    private static final Logger log=LoggerFactory.getLogger(WechatInboundService.class);
    private static final Map<String,String> MEDIA=Map.of("image","[图片]","voice","[语音]","video","[视频]","shortvideo","[小视频]","location","[位置]","link","[链接]");
    private final WechatConfigService configs;private final WechatLedger ledger;private final PatientAccess access;
    public WechatInboundService(WechatConfigService configs,WechatLedger ledger,PatientAccess access) { this.configs=configs;this.ledger=ledger;this.access=access; }
    /** WeCom URL verification: returns the decrypted echo string. */
    public String verifyWecom(Long hospitalId,String signature,String timestamp,String nonce,String echo) {
        IntegrationConfig c=callback(hospitalId,WechatConfigService.WE_COM);signed(signature,c.callbackToken,timestamp,nonce,echo);
        return WechatCrypto.decrypt(c.aesKey,c.appId,echo);
    }
    public void receiveWecom(Long hospitalId,String signature,String timestamp,String nonce,String body) {
        IntegrationConfig c=callback(hospitalId,WechatConfigService.WE_COM);String encrypted=WechatXml.parse(body).get("Encrypt");
        signed(signature,c.callbackToken,timestamp,nonce,encrypted);Map<String,String> x=WechatXml.parse(WechatCrypto.decrypt(c.aesKey,c.appId,encrypted));
        if(!"event".equals(x.get("MsgType"))||!"change_external_contact".equals(x.get("Event"))||!Checks.text(x.get("ExternalUserID")))return;
        String change=x.getOrDefault("ChangeType",""),type=switch(change) { case "add_external_contact","add_half_external_contact" -> "FOLLOW";case "del_external_contact","del_follow_user" -> "UNFOLLOW";default -> null; };
        if(type==null)return;
        String key="ev-"+WechatCrypto.sha1(String.join("|",x.get("ExternalUserID"),x.getOrDefault("UserID",""),change,x.getOrDefault("CreateTime","")));
        handle(c,new WechatLedger.Inbound(c.provider,type,x.get("ExternalUserID"),x.get("UserID"),x.get("State"),null,x.get("WelcomeCode"),key,configs.mock(c)));
    }
    /** Official Account URL verification: the echo string goes back unchanged once the signature matches. */
    public String verifyOfficial(Long hospitalId,String signature,String timestamp,String nonce,String echo) {
        IntegrationConfig c=callback(hospitalId,WechatConfigService.OFFICIAL);signed(signature,c.callbackToken,timestamp,nonce);return echo==null?"":echo;
    }
    public void receiveOfficial(Long hospitalId,String signature,String messageSignature,String encryptType,String timestamp,String nonce,String body) {
        IntegrationConfig c=callback(hospitalId,WechatConfigService.OFFICIAL);Map<String,String> x=WechatXml.parse(body);
        if("aes".equals(encryptType)) {
            Checks.permit(Checks.text(c.aesKey));signed(messageSignature,c.callbackToken,timestamp,nonce,x.get("Encrypt"));x=WechatXml.parse(WechatCrypto.decrypt(c.aesKey,c.appId,x.get("Encrypt")));
        } else signed(signature,c.callbackToken,timestamp,nonce);
        String openid=x.get("FromUserName"),type=x.getOrDefault("MsgType","");if(!Checks.text(openid)||openid.length()>64)return;
        if("event".equals(type)) {
            String event=x.getOrDefault("Event",""),scene=x.getOrDefault("EventKey","");
            if("TEMPLATESENDJOBFINISH".equals(event)) { ledger.templateResult(hospitalId,x.get("MsgID"),x.get("Status"));return; }
            String kind=switch(event) { case "subscribe" -> "FOLLOW";case "SCAN" -> "SCAN";case "unsubscribe" -> "UNFOLLOW";default -> "TOUCH"; };
            if(scene.startsWith("qrscene_"))scene=scene.substring(8);
            String key="ev-"+WechatCrypto.sha1(String.join("|",openid,event,x.getOrDefault("CreateTime",""),scene));
            handle(c,new WechatLedger.Inbound(c.provider,kind,openid,null,"TOUCH".equals(kind)||"UNFOLLOW".equals(kind)?null:scene,null,null,key,configs.mock(c)));
        } else {
            String id=x.get("MsgId");if(!Checks.text(id)||!id.matches("[0-9A-Za-z_-]{1,64}"))return;
            handle(c,new WechatLedger.Inbound(c.provider,"TEXT",openid,null,null,"text".equals(type)?x.get("Content"):MEDIA.getOrDefault(type,"[其他类型消息]"),null,"in-"+id,configs.mock(c)));
        }
    }
    /** A simulated follow, message or unfollow on a channel in MOCK mode, for demonstrations without WeChat. */
    public void simulate(MockInboundRequest req) {
        log.info("simulate wechat inbound provider={} event={}",req.provider(),req.event());access.manager();IntegrationConfig c=configs.active(CurrentAccount.get().hospitalId(),req.provider());
        Checks.require(configs.mock(c),"Only a simulated channel accepts simulated events / 只有模拟通道可以模拟来信");boolean wecom=WechatConfigService.WE_COM.equals(req.provider());
        Checks.require(!wecom||!"TEXT".equals(req.event()),"WeCom chat text is not visible without message archiving / 企业微信未开通会话存档，系统收不到聊天正文");
        Checks.require(!"TEXT".equals(req.event())||Checks.text(req.text()),"Message text required / 请填写来信内容");
        handle(c,new WechatLedger.Inbound(req.provider(),req.event(),req.externalId(),wecom?req.staffUserId():null,req.channelId()==null?null:"ch"+req.channelId(),req.text(),null,"mock-"+UUID.randomUUID(),true));
    }
    /** Records the event, then sends the welcome wording once for a new or returning contact. The send happens after the database transaction. */
    private void handle(IntegrationConfig c,WechatLedger.Inbound event) {
        log.info("wechat inbound provider={} type={}",event.channel(),event.type());WechatLedger.InboundResult result=ledger.recordInbound(c.hospitalId,event);
        if(result==null||!result.welcome())return;
        boolean wecom=WechatConfigService.WE_COM.equals(event.channel());MessageTemplate welcome=ledger.welcomeTemplate(c.hospitalId);
        if(welcome==null||(wecom&&!event.mock()&&!Checks.text(event.welcomeCode())))return;
        String status="SENT",id=null,error=null;
        try {
            if(wecom)configs.gateway(c).sendWecomWelcome(c,event.welcomeCode(),welcome.content);else id=configs.gateway(c).sendOfficialText(c,event.externalId(),welcome.content);
        } catch(BizException ex) { status="FAILED";error=ex.getMessage().length()>300?ex.getMessage().substring(0,300):ex.getMessage(); }
        ledger.recordWelcome(result.contact(),welcome,status,id,error,event.mock());
    }
    /** The enabled channel with a callback token (and AES key for WeCom); anything else is refused without detail. */
    private IntegrationConfig callback(Long hospitalId,String provider) {
        IntegrationConfig c=configs.find(hospitalId,provider);
        Checks.permit(c!=null&&Boolean.TRUE.equals(c.enabled)&&WechatConfigService.configured(c)&&WechatConfigService.callbackReady(c));return c;
    }
    private static void signed(String signature,String... parts) {
        for(String part:parts)Checks.permit(part!=null);
        Checks.permit(WechatCrypto.matches(WechatCrypto.signature(parts),signature));
    }
}
