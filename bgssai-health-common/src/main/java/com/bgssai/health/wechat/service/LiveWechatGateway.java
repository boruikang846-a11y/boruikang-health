package com.bgssai.health.wechat.service;
import com.bgssai.health.common.Checks;
import com.bgssai.health.common.exception.BizException;
import com.bgssai.health.model.IntegrationConfig;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
/** The real WeCom and Official Account APIs. Hosts are fixed; URLs, tokens and message text never reach the log. */
@Service
public class LiveWechatGateway implements WechatGateway {
    public static final String WECOM="https://qyapi.weixin.qq.com",OFFICIAL="https://api.weixin.qq.com";
    private static final Logger log=LoggerFactory.getLogger(LiveWechatGateway.class);
    private static final Set<Integer> TOKEN_REJECTED=Set.of(40001,40014,42001);
    private record Token(String value,String fingerprint,long expiresAt) {}
    private final Map<Long,Token> tokens=new ConcurrentHashMap<>();
    private final RestTemplate http;private final ObjectMapper json;
    public LiveWechatGateway(RestTemplate http,ObjectMapper json) { this.http=http;this.json=json; }
    public void verify(IntegrationConfig config) { log.info("verify wechat credentials provider={}",config.provider);tokens.remove(config.id);token(config); }
    public String sendOfficialText(IntegrationConfig config,String openid,String text) {
        call(config,"/cgi-bin/message/custom/send",Map.of("touser",openid,"msgtype","text","text",Map.of("content",text)));return "";
    }
    public String sendOfficialTemplate(IntegrationConfig config,String openid,String templateId,Map<String,String> data) {
        Map<String,Object> fields=new LinkedHashMap<>();data.forEach((name,value)->fields.put(name,Map.of("value",value)));
        return call(config,"/cgi-bin/message/template/send",Map.of("touser",openid,"template_id",templateId,"data",fields)).path("msgid").asText("");
    }
    public String createWecomMass(IntegrationConfig config,String staffUserId,String externalUserId,String text) {
        JsonNode result=call(config,"/cgi-bin/externalcontact/add_msg_template",Map.of("chat_type","single","external_userid",List.of(externalUserId),"sender",staffUserId,"text",Map.of("content",text)));
        for(JsonNode failed:result.path("fail_list"))if(externalUserId.equals(failed.asText()))throw new BizException("502000","WeCom refused this customer / 企业微信未接受该客户：不是该成员的好友，或今天已收到群发");
        String msgId=result.path("msgid").asText("");if(!Checks.text(msgId))throw invalid();return msgId;
    }
    public String wecomMassStatus(IntegrationConfig config,String msgId,String staffUserId,String externalUserId) {
        JsonNode result=call(config,"/cgi-bin/externalcontact/get_groupmsg_send_result",Map.of("msgid",msgId,"userid",staffUserId,"limit",100));
        for(JsonNode item:result.path("send_list"))if(externalUserId.equals(item.path("external_userid").asText())) {
            int status=item.path("status").asInt(0);return status==1?"SENT":status==0?"PENDING_CONFIRM":"FAILED";
        }
        return "PENDING_CONFIRM";
    }
    public void sendWecomWelcome(IntegrationConfig config,String welcomeCode,String text) {
        call(config,"/cgi-bin/externalcontact/send_welcome_msg",Map.of("welcome_code",welcomeCode,"text",Map.of("content",text)));
    }
    public List<Profile> wecomContacts(IntegrationConfig config,List<String> staffUserIds,int limit) {
        List<Profile> profiles=new ArrayList<>();
        for(int from=0;from<staffUserIds.size()&&profiles.size()<=limit;from+=100) {
            List<String> members=staffUserIds.subList(from,Math.min(from+100,staffUserIds.size()));String cursor="";
            do {
                JsonNode page=call(config,"/cgi-bin/externalcontact/batch/get_by_user",Map.of("userid_list",members,"cursor",cursor,"limit",100));
                for(JsonNode item:page.path("external_contact_list")) {
                    JsonNode customer=item.path("external_contact"),follow=item.path("follow_info");String id=customer.path("external_userid").asText("");
                    if(Checks.text(id))profiles.add(new Profile(id,blank(customer.path("unionid").asText("")),blank(customer.path("name").asText("")),blank(follow.path("userid").asText("")),blank(follow.path("state").asText("")),time(follow.path("createtime").asLong(0))));
                }
                cursor=page.path("next_cursor").asText("");
            } while(Checks.text(cursor)&&profiles.size()<=limit);
        }
        return profiles;
    }
    public List<Profile> officialFollowers(IntegrationConfig config,int limit) {
        List<String> ids=new ArrayList<>();String next="";
        do {
            JsonNode page=call(config,HttpMethod.GET,"/cgi-bin/user/get?next_openid={next}",null,next);
            for(JsonNode id:page.path("data").path("openid"))ids.add(id.asText());
            next=page.path("count").asInt(0)==0?"":page.path("next_openid").asText("");
        } while(Checks.text(next)&&ids.size()<=limit);
        if(ids.size()>limit+1)ids=ids.subList(0,limit+1);
        List<Profile> profiles=new ArrayList<>();
        for(int from=0;from<ids.size();from+=100) {
            List<Map<String,String>> batch=ids.subList(from,Math.min(from+100,ids.size())).stream().map(id->Map.of("openid",id,"lang","zh_CN")).toList();
            for(JsonNode user:call(config,"/cgi-bin/user/info/batchget",Map.of("user_list",batch)).path("user_info_list"))
                if(user.path("subscribe").asInt(0)==1)profiles.add(new Profile(user.path("openid").asText(),blank(user.path("unionid").asText("")),null,null,blank(user.path("qr_scene_str").asText("")),time(user.path("subscribe_time").asLong(0))));
        }
        return profiles;
    }
    public ContactWay wecomContactWay(IntegrationConfig config,String staffUserId,String state) {
        JsonNode result=call(config,"/cgi-bin/externalcontact/add_contact_way",Map.of("type",1,"scene",2,"skip_verify",true,"state",state,"remark","health-"+state,"user",List.of(staffUserId)));
        String id=result.path("config_id").asText(""),url=result.path("qr_code").asText("");if(!Checks.text(id)||!Checks.text(url))throw invalid();return new ContactWay(id,url);
    }
    public String officialQr(IntegrationConfig config,String scene) {
        String url=call(config,"/cgi-bin/qrcode/create",Map.of("action_name","QR_LIMIT_STR_SCENE","action_info",Map.of("scene",Map.of("scene_str",scene)))).path("url").asText("");
        if(!Checks.text(url))throw invalid();return url;
    }
    private JsonNode call(IntegrationConfig config,String path,Object body) { return call(config,HttpMethod.POST,path,body); }
    /** Appends the access token; an expired or revoked token is refreshed once. */
    private JsonNode call(IntegrationConfig config,HttpMethod method,String path,Object body,Object... variables) {
        String url=base(config)+path+(path.contains("?")?"&":"?")+"access_token={token}";
        for(int attempt=0;;attempt++) {
            Object[] values=Arrays.copyOf(variables,variables.length+1);values[variables.length]=token(config);
            JsonNode result=exchange(method,url,body,values);int code=result.path("errcode").asInt(0);
            if(attempt==0&&TOKEN_REJECTED.contains(code)) { tokens.remove(config.id);continue; }
            return checked(result);
        }
    }
    private String token(IntegrationConfig config) {
        String fingerprint=WechatCrypto.sha1(config.provider+"|"+config.appId+"|"+config.secret);Token cached=tokens.get(config.id);
        if(cached!=null&&cached.fingerprint.equals(fingerprint)&&cached.expiresAt>System.currentTimeMillis())return cached.value;
        JsonNode result=checked("WE_COM".equals(config.provider)
            ?exchange(HttpMethod.GET,WECOM+"/cgi-bin/gettoken?corpid={id}&corpsecret={secret}",null,config.appId,config.secret)
            :exchange(HttpMethod.POST,OFFICIAL+"/cgi-bin/stable_token",Map.of("grant_type","client_credential","appid",config.appId,"secret",config.secret,"force_refresh",false)));
        String value=result.path("access_token").asText("");if(!Checks.text(value))throw invalid();
        tokens.put(config.id,new Token(value,fingerprint,System.currentTimeMillis()+Math.max(60,result.path("expires_in").asLong(7200)-300)*1000));
        return value;
    }
    private JsonNode exchange(HttpMethod method,String url,Object body,Object... variables) {
        try {
            HttpHeaders headers=new HttpHeaders();byte[] payload=null;
            if(body!=null) { headers.setContentType(MediaType.APPLICATION_JSON);payload=json.writeValueAsBytes(body); }
            byte[] response=http.exchange(url,method,new HttpEntity<>(payload,headers),byte[].class,variables).getBody();
            if(response==null||response.length>4_000_000)throw invalid();
            return json.readTree(new String(response,StandardCharsets.UTF_8));
        } catch(IOException|RestClientException ex) {
            log.warn("wechat call failed type={}",ex.getClass().getSimpleName());
            throw new BizException("502000","WeChat unreachable / 微信接口调用失败，未确认对方是否收到");
        }
    }
    private static JsonNode checked(JsonNode result) {
        int code=result.path("errcode").asInt(0);if(code==0)return result;
        String message=result.path("errmsg").asText("");log.info("wechat api rejected code={}",code);
        throw new BizException("502000",code+" "+(message.length()>200?message.substring(0,200):message));
    }
    private static String base(IntegrationConfig config) { return "WE_COM".equals(config.provider)?WECOM:OFFICIAL; }
    private static BizException invalid() { return new BizException("502000","WeChat returned an unexpected response / 微信接口返回内容异常"); }
    private static String blank(String value) { return Checks.text(value)?value:null; }
    private static LocalDateTime time(long seconds) { return seconds<=0?null:LocalDateTime.ofInstant(Instant.ofEpochSecond(seconds),ZoneId.systemDefault()); }
}
