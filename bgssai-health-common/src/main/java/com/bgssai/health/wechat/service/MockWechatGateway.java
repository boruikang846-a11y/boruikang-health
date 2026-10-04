package com.bgssai.health.wechat.service;
import com.bgssai.health.model.IntegrationConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
/** Simulated channel for local, test and dev demonstrations. It never opens a network connection and every id it returns starts with "mock". */
@Service
public class MockWechatGateway implements WechatGateway {
    private static final Logger log=LoggerFactory.getLogger(MockWechatGateway.class);
    public void verify(IntegrationConfig config) { log.info("mock wechat verify provider={}",config.provider); }
    public String sendOfficialText(IntegrationConfig config,String openid,String text) { return id(); }
    public String sendOfficialTemplate(IntegrationConfig config,String openid,String templateId,Map<String,String> data) { return id(); }
    public String createWecomMass(IntegrationConfig config,String staffUserId,String externalUserId,String text) { return id(); }
    public String wecomMassStatus(IntegrationConfig config,String msgId,String staffUserId,String externalUserId) { return "SENT"; }
    public void sendWecomWelcome(IntegrationConfig config,String welcomeCode,String text) { log.info("mock wecom welcome"); }
    public List<Profile> wecomContacts(IntegrationConfig config,List<String> staffUserIds,int limit) {
        return List.of(new Profile("wm-mock-sync-0001",null,"模拟同步客户",staffUserIds.getFirst(),null,LocalDateTime.now().withNano(0)));
    }
    public List<Profile> officialFollowers(IntegrationConfig config,int limit) {
        return List.of(new Profile("openid-mock-sync-0001",null,null,null,null,LocalDateTime.now().withNano(0)));
    }
    public ContactWay wecomContactWay(IntegrationConfig config,String staffUserId,String state) { return new ContactWay("mock-way-"+state,"mock://wecom/contact-way/"+state); }
    public String officialQr(IntegrationConfig config,String scene) { return "mock://official/qr/"+scene; }
    private static String id() { return "mock-"+UUID.randomUUID(); }
}
