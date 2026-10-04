package com.boruikang.health.wechat.service;
import com.boruikang.health.audit.service.AuditService;
import com.boruikang.health.auth.service.CurrentAccount;
import com.boruikang.health.common.Checks;
import com.boruikang.health.common.exception.BizException;
import com.boruikang.health.integration.dto.IntegrationResponse;
import com.boruikang.health.mapper.IntegrationConfigMapper;
import com.boruikang.health.model.IntegrationConfig;
import com.boruikang.health.model.IntegrationConfigExample;
import com.boruikang.health.wechat.dto.SaveWechatConfigRequest;
import com.boruikang.health.wechat.dto.VerifyWechatConfigRequest;
import com.github.pagehelper.PageHelper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
/** WeCom and Official Account credentials of a hospital, their real connection state, and the choice between the live and the simulated gateway. */
@Service
public class WechatConfigService {
    public static final String WE_COM="WE_COM",OFFICIAL="WECHAT_OFFICIAL";
    public static final List<String> PROVIDERS=List.of(WE_COM,OFFICIAL);
    private static final Logger log=LoggerFactory.getLogger(WechatConfigService.class);
    private final IntegrationConfigMapper configs;private final AuditService audit;private final LiveWechatGateway live;private final MockWechatGateway mock;private final boolean mockAllowed;
    public WechatConfigService(IntegrationConfigMapper configs,AuditService audit,LiveWechatGateway live,MockWechatGateway mock,@Value("${health.wechat.mock-allowed}") boolean mockAllowed,Environment environment) {
        this.configs=configs;this.audit=audit;this.live=live;this.mock=mock;this.mockAllowed=mockAllowed&&!environment.acceptsProfiles(Profiles.of("prod"));
    }
    public IntegrationConfig find(Long hospitalId,String provider) {
        IntegrationConfigExample ex=new IntegrationConfigExample();ex.eq("hospital_id",hospitalId).eq("provider",provider);
        PageHelper.startPage(1,1,false);List<IntegrationConfig> rows=configs.selectByExample(ex);return rows.isEmpty()?null:rows.getFirst();
    }
    /** The enabled, fully configured channel; refuses a simulated channel where simulation is not allowed. */
    public IntegrationConfig active(Long hospitalId,String provider) {
        IntegrationConfig c=find(hospitalId,provider);
        Checks.require(c!=null&&Boolean.TRUE.equals(c.enabled)&&configured(c),"Channel not enabled / "+name(provider)+"尚未配置或未启用，请先在外部接入里配置");
        Checks.require(!"MOCK".equals(c.channelMode)||mockAllowed,"Simulated channel is not allowed here / 本环境不允许使用模拟通道，请改为正式接入");
        return c;
    }
    public boolean mock(IntegrationConfig c) { return mockAllowed&&"MOCK".equals(c.channelMode); }
    public WechatGateway gateway(IntegrationConfig c) { return mock(c)?mock:live; }
    public IntegrationResponse view(Long hospitalId,String provider) { return view(hospitalId,provider,find(hospitalId,provider)); }
    @Transactional
    public IntegrationResponse save(SaveWechatConfigRequest req) {
        log.info("save wechat config provider={} mode={} enabled={}",req.provider(),req.mode(),req.enabled());permit();Long hospitalId=CurrentAccount.get().hospitalId();
        boolean simulated="MOCK".equals(req.mode()),enabled=Boolean.TRUE.equals(req.enabled());
        Checks.require(!simulated||mockAllowed,"Simulated channel is not allowed here / 本环境不允许使用模拟通道");
        IntegrationConfig old=find(hospitalId,req.provider());
        String secret=keep(req.secret(),old==null?null:old.secret),token=keep(req.callbackToken(),old==null?null:old.callbackToken),aesKey=keep(req.aesKey(),old==null?null:old.aesKey);
        Checks.require(!Checks.text(aesKey)||WechatCrypto.validKey(aesKey),"Invalid EncodingAESKey / EncodingAESKey 应为 43 位字母数字");
        Checks.require(!enabled||Checks.text(secret),"Secret required / 请填写 Secret 后再启用");
        Checks.require(!enabled||simulated||!WE_COM.equals(req.provider())||(Checks.text(token)&&Checks.text(aesKey)),"Callback token and AES key required / 企业微信回调必须加密，请填写回调 Token 与 EncodingAESKey 后再启用");
        IntegrationConfig c=new IntegrationConfig();c.provider=req.provider();c.endpoint=WE_COM.equals(req.provider())?LiveWechatGateway.WECOM:LiveWechatGateway.OFFICIAL;c.modelName="";
        c.appId=req.appId();c.secret=secret;c.callbackToken=token;c.aesKey=aesKey;c.channelMode=req.mode();c.enabled=enabled;
        // New credentials or a different mode make the previous connection test meaningless.
        if(old==null||!req.appId().equals(old.appId)||!secret.equals(old.secret==null?"":old.secret)||!req.mode().equals(old.channelMode)) { c.verifyStatus="UNVERIFIED";c.lastError=""; }
        String actor=CurrentAccount.get().userId().toString();
        if(old==null) { c.hospitalId=hospitalId;c.creator=actor;configs.insertSelective(c); }
        else { c.id=old.id;c.modifier=actor;IntegrationConfigExample ex=new IntegrationConfigExample();ex.eq("id",old.id).eq("hospital_id",hospitalId);configs.updateByExampleSelective(c,ex); }
        audit.append(null,"INTEGRATION_UPDATED",c.id,null,enabled?"ENABLED":"DISABLED",req.provider()+" configuration changed; secrets omitted");
        return view(hospitalId,req.provider());
    }
    /** Fetches a real access token and stores what WeChat answered. The network call runs outside any database transaction. */
    public IntegrationResponse verify(VerifyWechatConfigRequest req) {
        log.info("verify wechat config provider={}",req.provider());permit();Long hospitalId=CurrentAccount.get().hospitalId();IntegrationConfig c=find(hospitalId,req.provider());
        Checks.require(c!=null&&configured(c),"Save the credentials first / 请先保存凭证再测试连接");
        Checks.require(!"MOCK".equals(c.channelMode),"Simulated channel has nothing to verify / 模拟通道不连接微信，无需测试");
        String status="CONNECTED",error="";
        try { live.verify(c); } catch(BizException ex) { status="FAILED";error=ex.getMessage().length()>300?ex.getMessage().substring(0,300):ex.getMessage(); }
        IntegrationConfig patch=new IntegrationConfig();patch.verifyStatus=status;patch.lastError=error;patch.verifiedAt=LocalDateTime.now().withNano(0);patch.modifier=CurrentAccount.get().userId().toString();
        IntegrationConfigExample ex=new IntegrationConfigExample();ex.eq("id",c.id).eq("hospital_id",hospitalId);configs.updateByExampleSelective(patch,ex);
        audit.append(null,"INTEGRATION_VERIFIED",c.id,c.verifyStatus,status,req.provider()+" connection test");
        return view(hospitalId,req.provider());
    }
    public static boolean configured(IntegrationConfig c) { return Checks.text(c.appId)&&Checks.text(c.secret); }
    public static boolean callbackReady(IntegrationConfig c) { return Checks.text(c.callbackToken)&&(!WE_COM.equals(c.provider)||Checks.text(c.aesKey)); }
    public static String name(String provider) { return WE_COM.equals(provider)?"企业微信":"公众号"; }
    private IntegrationResponse view(Long hospitalId,String provider,IntegrationConfig c) {
        String path="/boruikang/open/"+(WE_COM.equals(provider)?"wecom":"wechat")+"/callback/"+hospitalId;
        if(c==null||!configured(c))return new IntegrationResponse(provider,"","",false,false,"NOT_CONFIGURED",c==null?null:c.appId,c==null?"LIVE":c.channelMode,c!=null&&callbackReady(c),path,null,null,mockAllowed);
        String status="MOCK".equals(c.channelMode)?(mockAllowed?"MOCK":"NOT_CONFIGURED"):"CONNECTED".equals(c.verifyStatus)?"CONNECTED":"FAILED".equals(c.verifyStatus)?"FAILED":"CONFIGURED_UNVERIFIED";
        return new IntegrationResponse(provider,"","",Boolean.TRUE.equals(c.enabled),true,status,c.appId,c.channelMode,callbackReady(c),path,c.verifiedAt,Checks.text(c.lastError)?c.lastError:null,mockAllowed);
    }
    private static void permit() { String role=CurrentAccount.get().roleCode();Checks.permit("PLATFORM_ADMIN".equals(role)||"MANAGER".equals(role)); }
    private static String keep(String incoming,String stored) { return Checks.text(incoming)?incoming.trim():Objects.requireNonNullElse(stored,""); }
}
