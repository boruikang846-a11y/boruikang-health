package com.boruikang.health.wechat.service;
import com.boruikang.health.model.IntegrationConfig;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
/**
 * Calls to the WeChat platform for one hospital's WeCom or Official Account configuration.
 * Every failure is a BizException("502000") whose message carries the WeChat error code, so callers can store the real outcome.
 */
public interface WechatGateway {
    /** A friend or follower as WeChat reports it. Official Account followers have no nickname. */
    record Profile(String externalId,String unionId,String nickname,String staffUserId,String scene,LocalDateTime followedAt) {}
    record ContactWay(String configId,String qrUrl) {}
    /** Fetches a fresh access token with the saved credentials. */
    void verify(IntegrationConfig config);
    /** Customer-service text; WeChat only accepts it within 48 hours of the follower's last interaction. */
    String sendOfficialText(IntegrationConfig config,String openid,String text);
    String sendOfficialTemplate(IntegrationConfig config,String openid,String templateId,Map<String,String> data);
    /** Creates a one-customer mass-message task; the member still has to confirm it inside WeCom. */
    String createWecomMass(IntegrationConfig config,String staffUserId,String externalUserId,String text);
    /** SENT, FAILED or PENDING_CONFIRM for that customer of the task. */
    String wecomMassStatus(IntegrationConfig config,String msgId,String staffUserId,String externalUserId);
    void sendWecomWelcome(IntegrationConfig config,String welcomeCode,String text);
    /** Up to limit+1 customers of the given members; one more than limit means the result was cut. */
    List<Profile> wecomContacts(IntegrationConfig config,List<String> staffUserIds,int limit);
    List<Profile> officialFollowers(IntegrationConfig config,int limit);
    ContactWay wecomContactWay(IntegrationConfig config,String staffUserId,String state);
    /** Content of a permanent parametric QR code. */
    String officialQr(IntegrationConfig config,String scene);
}
