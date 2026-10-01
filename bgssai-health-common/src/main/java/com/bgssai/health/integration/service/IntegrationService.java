package com.bgssai.health.integration.service;
import com.bgssai.health.audit.service.AuditService;
import com.bgssai.health.auth.service.CurrentAccount;
import com.bgssai.health.common.Checks;
import com.bgssai.health.integration.dto.*;
import com.bgssai.health.mapper.IntegrationConfigMapper;
import com.bgssai.health.model.*;
import com.github.pagehelper.PageHelper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
@Service
public class IntegrationService {
    private static final Logger log=LoggerFactory.getLogger(IntegrationService.class);
    public static final String DEEPSEEK="https://api.deepseek.com/chat/completions";
    private static final Set<String> DEEPSEEK_MODELS=Set.of("deepseek-flash","deepseek-v4-pro");
    private final IntegrationConfigMapper configs;private final AuditService audit;
    public IntegrationService(IntegrationConfigMapper configs,AuditService audit){this.configs=configs;this.audit=audit;}
    public List<IntegrationResponse> list(){
        log.info("list integrations actorId={}",CurrentAccount.get().userId());Checks.permit(!"USER".equals(CurrentAccount.get().roleCode()));
        IntegrationConfig c=aiConfig();List<IntegrationResponse> out=new ArrayList<>();
        out.add(c==null||!endpointAllowed(c.endpoint)?new IntegrationResponse("AI",DEEPSEEK,"deepseek-flash",false,false,"NOT_CONFIGURED"):view(c));
        for(String provider:List.of("WE_COM","WECHAT_OFFICIAL","HIS","WEEKLY_DELIVERY"))out.add(new IntegrationResponse(provider,"","",false,false,"NOT_CONNECTED"));
        return out;
    }
    @Transactional
    public IntegrationResponse save(SaveIntegrationRequest req){
        log.info("save integration provider={} enabled={}",req.provider(),req.enabled());
        String role=CurrentAccount.get().roleCode();Checks.permit("PLATFORM_ADMIN".equals(role)||"MANAGER".equals(role));
        Checks.require(endpointAllowed(req.endpoint()),"Only DeepSeek is supported / 仅支持 DeepSeek 官方接口");
        Checks.require(modelAllowed(req.endpoint(),req.modelName()),"Unsupported model / DeepSeek 请选择 deepseek-flash 或 deepseek-v4-pro");IntegrationConfig old=aiConfig();
        String secret=Checks.text(req.secret())?req.secret():old!=null&&endpointAllowed(old.endpoint)?old.secret:"";
        Checks.require(!Boolean.TRUE.equals(req.enabled())||Checks.text(secret),"DeepSeek API key required / 请填写 DeepSeek API Key 后再启用");
        IntegrationConfig c=new IntegrationConfig();c.hospitalId=CurrentAccount.get().hospitalId();c.provider="AI";c.endpoint=req.endpoint();c.modelName=req.modelName();c.secret=secret;c.enabled=req.enabled();
        if(old==null){c.creator=CurrentAccount.get().userId().toString();configs.insertSelective(c);}else{c.id=old.id;c.modifier=CurrentAccount.get().userId().toString();IntegrationConfigExample ex=new IntegrationConfigExample();ex.eq("id",old.id).eq("hospital_id",old.hospitalId);configs.updateByExampleSelective(c,ex);}
        audit.append(null,"INTEGRATION_UPDATED",c.id,null,Boolean.TRUE.equals(c.enabled)?"ENABLED":"DISABLED","AI configuration changed; secret omitted");return view(c);
    }
    public IntegrationConfig aiConfig(){
        IntegrationConfigExample ex=new IntegrationConfigExample();ex.eq("hospital_id",CurrentAccount.get().hospitalId()).eq("provider","AI");
        PageHelper.startPage(1,1,false);
        List<IntegrationConfig> rows=configs.selectByExample(ex);return rows.isEmpty()?null:rows.getFirst();
    }
    public static boolean endpointAllowed(String endpoint){return DEEPSEEK.equals(endpoint);}
    public static boolean modelAllowed(String endpoint,String model){return endpointAllowed(endpoint)&&Checks.text(model)&&DEEPSEEK_MODELS.contains(model);}
    private static IntegrationResponse view(IntegrationConfig c){return new IntegrationResponse(c.provider,c.endpoint,c.modelName,Boolean.TRUE.equals(c.enabled),Checks.text(c.secret),Boolean.TRUE.equals(c.enabled)&&Checks.text(c.secret)?"CONFIGURED_UNVERIFIED":"NOT_CONFIGURED");}
}
