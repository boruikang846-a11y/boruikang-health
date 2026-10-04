package com.boruikang.health.admin;

import com.boruikang.health.wechat.service.WechatCrypto;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

/** 1.9 WeCom and Official Account channels over real HTTP: signed callbacks, binding, the three kinds of sending and the role gates. Simulated gateway only; no network. */
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={
    "spring.datasource.url=jdbc:h2:mem:wechat-channel-http;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "logging.level.root=WARN"
})
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class WechatChannelHttpTest {
    private static final String TOKEN="unitCallbackToken2026",AES="jWmYm7qr5nMoAUwZRjGtBxmz3KA1tkAj3ykkR6q2B2C",APP="wxunit0000000000",CORP="wwunit0000000000";
    @Value("${local.server.port}") int port;
    @Autowired ObjectMapper json;
    private final HttpClient http=HttpClient.newHttpClient();
    private HttpResponse<String> request(String path,String body,String token) throws Exception {
        var builder=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+"/boruikang/admin"+path)).header("Content-Type","application/json");
        if(token!=null)builder.header("Jwttoken",token);
        if(body!=null)builder.POST(HttpRequest.BodyPublishers.ofString(body));else builder.GET();
        return http.send(builder.build(),HttpResponse.BodyHandlers.ofString());
    }
    private String login(String username) throws Exception {
        var result=request("/login","{\"identifier\":\""+username+"\",\"password\":\"HealthDemo@2026!\"}",null);
        assertEquals(200,result.statusCode(),result.body());
        return json.readTree(result.body()).path("result").path("jwt_token").asText();
    }
    private JsonNode call(String path,Map<String,Object> body,String token) throws Exception {
        var response=request(path,body==null?null:json.writeValueAsString(body),token);
        assertEquals(200,response.statusCode(),path+" -> "+response.body());
        return json.readTree(response.body()).path("result");
    }
    private int status(String path,Map<String,Object> body,String token) throws Exception { return request(path,body==null?null:json.writeValueAsString(body),token).statusCode(); }
    /** Callback endpoints take no login; query values are URL-encoded the way WeChat sends them. */
    private HttpResponse<String> callback(String channel,long hospitalId,Map<String,String> query,String xml) throws Exception {
        StringBuilder url=new StringBuilder("http://127.0.0.1:"+port+"/boruikang/open/"+channel+"/callback/"+hospitalId+"?");
        query.forEach((name,value)->url.append(name).append('=').append(URLEncoder.encode(value,StandardCharsets.UTF_8)).append('&'));
        var builder=HttpRequest.newBuilder(URI.create(url.toString()));
        if(xml==null)builder.GET();else builder.header("Content-Type","text/xml").POST(HttpRequest.BodyPublishers.ofString(xml));
        return http.send(builder.build(),HttpResponse.BodyHandlers.ofString());
    }
    private HttpResponse<String> official(String xml) throws Exception {
        String timestamp="1700000000",nonce=UUID.randomUUID().toString().substring(0,8);
        return callback("wechat",1,Map.of("signature",WechatCrypto.signature(TOKEN,timestamp,nonce),"timestamp",timestamp,"nonce",nonce),xml);
    }
    private HttpResponse<String> encrypted(String channel,String receiver,String xml) throws Exception {
        String timestamp="1700000000",nonce=UUID.randomUUID().toString().substring(0,8),cipher=WechatCrypto.encrypt(AES,receiver,xml);
        Map<String,String> query=new HashMap<>(Map.of("msg_signature",WechatCrypto.signature(TOKEN,timestamp,nonce,cipher),"timestamp",timestamp,"nonce",nonce));
        if("wechat".equals(channel)) { query.put("encrypt_type","aes");query.put("signature",WechatCrypto.signature(TOKEN,timestamp,nonce)); }
        return callback(channel,1,query,"<xml><ToUserName><![CDATA["+receiver+"]]></ToUserName><Encrypt><![CDATA["+cipher+"]]></Encrypt></xml>");
    }
    private static String officialXml(String openid,String fields) { return "<xml><ToUserName><![CDATA[gh_unit]]></ToUserName><FromUserName><![CDATA["+openid+"]]></FromUserName><CreateTime>1700000001</CreateTime>"+fields+"</xml>"; }
    private static String text(String openid,String content,long msgId) { return officialXml(openid,"<MsgType><![CDATA[text]]></MsgType><Content><![CDATA["+content+"]]></Content><MsgId>"+msgId+"</MsgId>"); }
    private static String event(String openid,String event,String key) { return officialXml(openid,"<MsgType><![CDATA[event]]></MsgType><Event><![CDATA["+event+"]]></Event><EventKey><![CDATA["+key+"]]></EventKey>"); }
    /** Both channels in simulated mode with a known callback token and AES key. */
    private void configure(String manager) throws Exception {
        call("/integrations/wechat/save",Map.of("provider","WECHAT_OFFICIAL","app_id",APP,"secret","unit-official-secret","callback_token",TOKEN,"aes_key",AES,"mode","MOCK","enabled",true),manager);
        call("/integrations/wechat/save",Map.of("provider","WE_COM","app_id",CORP,"secret","unit-wecom-secret","callback_token",TOKEN,"aes_key",AES,"mode","MOCK","enabled",true),manager);
    }
    private JsonNode contact(String channel,String externalId,String token) throws Exception {
        for(Boolean bound:new Boolean[]{false,true})
            for(JsonNode item:call("/wechat/contacts/query",Map.of("page",0,"size",100,"channel",channel,"bound",bound),token).path("items"))if(externalId.equals(item.path("external_id").asText()))return item;
        return fail("contact not found: "+externalId);
    }
    private JsonNode messages(long contactId,String token) throws Exception { return call("/wechat/messages/query",Map.of("contact_id",contactId,"page",0,"size",50),token).path("items"); }
    private JsonNode send(long contactId,String kind,Map<String,Object> extra,String token) throws Exception {
        Map<String,Object> body=new HashMap<>(extra);body.put("contact_id",contactId);body.put("kind",kind);body.putIfAbsent("request_key",UUID.randomUUID().toString());
        return call("/wechat/messages/send",body,token);
    }
    private void simulate(String provider,String event,String externalId,Map<String,Object> extra,String manager) throws Exception {
        Map<String,Object> body=new HashMap<>(extra);body.put("provider",provider);body.put("event",event);body.put("external_id",externalId);call("/wechat/mock/inbound",body,manager);
    }

    /** Runs first: the seeded WeCom row still has no callback token, which the live-channel rule needs. */
    @Test @Order(1) void configurationIsRoleGatedAndNeverEchoesSecrets() throws Exception {
        String manager=login("manager"),operator=login("operator_a"),doctor=login("doctor"),platform=login("platform");
        Map<String,Object> official=Map.of("provider","WECHAT_OFFICIAL","app_id",APP,"secret","unit-official-secret","callback_token",TOKEN,"aes_key",AES,"mode","MOCK","enabled",true);
        assertEquals(403,status("/integrations/wechat/save",official,operator));assertEquals(403,status("/integrations/wechat/save",official,doctor));
        var saved=request("/integrations/wechat/save",json.writeValueAsString(official),platform);assertEquals(200,saved.statusCode(),saved.body());
        for(String secret:new String[]{"unit-official-secret",TOKEN,AES})assertFalse(saved.body().contains(secret),"secret values never leave the server");
        JsonNode view=json.readTree(saved.body()).path("result");
        assertEquals("MOCK",view.path("status").asText());assertTrue(view.path("callback_ready").asBoolean());assertEquals("/boruikang/open/wechat/callback/1",view.path("callback_path").asText());assertEquals(APP,view.path("app_id").asText());
        assertEquals(400,status("/integrations/wechat/verify",Map.of("provider","WECHAT_OFFICIAL"),manager),"a simulated channel has nothing to verify");
        assertEquals(403,status("/integrations/wechat/verify",Map.of("provider","WECHAT_OFFICIAL"),operator));
        // Switching to the live channel keeps the stored secret and falls back to "configured, not verified"; no connection is claimed.
        JsonNode live=call("/integrations/wechat/save",Map.of("provider","WECHAT_OFFICIAL","app_id",APP,"secret","","callback_token","","aes_key","","mode","LIVE","enabled",false),manager);
        assertEquals("CONFIGURED_UNVERIFIED",live.path("status").asText());assertTrue(live.path("configured").asBoolean());assertFalse(live.path("enabled").asBoolean());assertTrue(live.path("verified_at").isNull());
        assertEquals(400,status("/integrations/wechat/save",Map.of("provider","WE_COM","app_id","wwfresh000000000","secret","s","callback_token","","aes_key","","mode","LIVE","enabled",true),manager),"live WeCom needs an encrypted callback");
        assertEquals(400,status("/integrations/wechat/save",Map.of("provider","WE_COM","app_id",CORP,"secret","s","callback_token",TOKEN,"aes_key","tooshort","mode","LIVE","enabled",true),manager));
        var list=request("/integrations",null,operator);assertEquals(200,list.statusCode());assertFalse(list.body().contains("unit-official-secret")||list.body().contains(AES));
        JsonNode rows=json.readTree(list.body()).path("result");assertEquals("AI",rows.get(0).path("provider").asText());assertEquals("WE_COM",rows.get(1).path("provider").asText());assertEquals("WECHAT_OFFICIAL",rows.get(2).path("provider").asText());
        assertEquals(400,status("/templates/save",Map.of("code","UNIT_MP_NO_ID","channel","MP_TEMPLATE","scene","REVISIT_REMINDER","title","缺模板 ID","content","thing1=复诊提醒","active",true),manager));
        assertEquals(400,status("/templates/save",Map.of("code","UNIT_WELCOME_HOLE","channel","WECHAT","scene","WELCOME","title","带占位的欢迎语","content","您好{姓名}","active",true),manager));
        configure(manager);
    }

    @Test void officialCallbackCreatesContactOnceAndFeedsTheInbox() throws Exception {
        String manager=login("manager"),operator=login("operator_a"),other=login("operator_b");configure(manager);
        var verify=callback("wechat",1,Map.of("signature",WechatCrypto.signature(TOKEN,"1700000000","n1"),"timestamp","1700000000","nonce","n1","echostr","echo-123"),null);
        assertEquals(200,verify.statusCode());assertEquals("echo-123",verify.body());
        assertEquals(403,callback("wechat",1,Map.of("signature","0".repeat(40),"timestamp","1700000000","nonce","n1","echostr","echo-123"),null).statusCode());
        assertEquals(403,callback("wechat",99,Map.of("signature",WechatCrypto.signature(TOKEN,"1700000000","n1"),"timestamp","1700000000","nonce","n1","echostr","x"),null).statusCode());
        assertEquals(403,callback("wechat",1,Map.of("timestamp","1700000000","nonce","n1"),text("openid-unit-forged","伪造",1L)).statusCode());

        var followed=official(event("openid-unit-1","subscribe","qrscene_ch1"));assertEquals(200,followed.statusCode(),followed.body());assertEquals("success",followed.body());
        JsonNode contact=contact("WECHAT_OFFICIAL","openid-unit-1",manager);long id=contact.path("id").asLong();
        assertEquals(1,contact.path("intake_channel_id").asLong());assertEquals("ACTIVE",contact.path("relation").asText());assertTrue(contact.path("patient_id").isNull());assertTrue(contact.path("mock").asBoolean());
        JsonNode first=messages(id,manager);assertEquals(2,first.size(),"follow event plus the welcome wording");
        assertEquals("WELCOME",first.get(0).path("kind").asText());assertEquals("SENT",first.get(0).path("status").asText());assertEquals("EVENT",first.get(1).path("kind").asText());assertTrue(first.get(1).path("content").asText().startsWith("关注公众号（渠道："));

        assertEquals(200,official(text("openid-unit-1","请问复诊要带什么资料？",9001L)).statusCode());assertEquals(200,official(text("openid-unit-1","请问复诊要带什么资料？",9001L)).statusCode());
        assertEquals(1,contact("WECHAT_OFFICIAL","openid-unit-1",manager).path("pending_count").asInt(),"WeChat retries must not double-count");
        assertEquals(200,encrypted("wechat",APP,text("openid-unit-1","加密模式的第二条",9002L)).statusCode());
        assertEquals(403,encrypted("wechat","wxother0000000000",text("openid-unit-1","别家公众号的密文",9003L)).statusCode());
        assertEquals(400,official("<?xml version=\"1.0\"?><!DOCTYPE xml [<!ENTITY e SYSTEM \"file:///etc/passwd\">]><xml><FromUserName>&e;</FromUserName></xml>").statusCode());
        contact=contact("WECHAT_OFFICIAL","openid-unit-1",manager);assertEquals(2,contact.path("pending_count").asInt());assertEquals("加密模式的第二条",contact.path("last_message_preview").asText());

        // Binding is a staff decision inside the staff member's own patient scope.
        assertEquals(404,status("/wechat/contacts/bind",Map.of("id",id,"version",contact.path("version").asInt(),"patient_id",1001),other),"operator_b does not manage patient 1001");
        assertEquals(409,status("/wechat/contacts/bind",Map.of("id",id,"version",contact.path("version").asInt()+5,"patient_id",1001),operator));
        JsonNode bound=call("/wechat/contacts/bind",Map.of("id",id,"version",contact.path("version").asInt(),"patient_id",1001),operator);
        assertEquals(1001,bound.path("patient_id").asLong());assertEquals("演****",bound.path("patient_name").asText());
        assertEquals(409,status("/wechat/contacts/bind",Map.of("id",id,"version",bound.path("version").asInt(),"patient_id",1002),operator),"already bound");
        assertEquals(400,status("/wechat/contacts/query",Map.of("page",0,"size",10),operator),"operators choose bound or unbound");
        assertEquals(404,status("/wechat/messages/query",Map.of("contact_id",id,"page",0,"size",10),other));

        String key=UUID.randomUUID().toString();
        JsonNode sent=send(id,"TEXT",Map.of("content","您好，复诊请带身份证和近期检查报告。","request_key",key),operator);
        assertEquals("SENT",sent.path("status").asText());assertEquals("OUTBOUND",sent.path("direction").asText());assertTrue(sent.path("mock").asBoolean());
        assertEquals(sent.path("id").asLong(),send(id,"TEXT",Map.of("content","您好，复诊请带身份证和近期检查报告。","request_key",key),operator).path("id").asLong(),"same click, one message");
        JsonNode after=messages(id,operator);assertEquals(5,after.size());
        for(JsonNode m:after)if("INBOUND".equals(m.path("direction").asText())&&"TEXT".equals(m.path("kind").asText()))assertEquals("HANDLED",m.path("status").asText());
        assertEquals(0,contact("WECHAT_OFFICIAL","openid-unit-1",operator).path("pending_count").asInt());
        assertEquals(400,status("/wechat/messages/send",Map.of("contact_id",id,"kind","TEXT","content","您好{姓名}","request_key",UUID.randomUUID().toString()),operator),"unfilled placeholder");

        JsonNode template=send(id,"TEMPLATE",Map.of("template_code","DEMO_MP_REVISIT","content","thing1=复诊提醒\ntime2=2026-10-08\nthing3=请按医生安排复诊"),operator);
        assertEquals("SENT",template.path("status").asText());assertTrue(template.path("external_msg_id").asText().startsWith("mock-"));assertEquals("DEMO_MP_REVISIT",template.path("template_code").asText());
        assertEquals(400,status("/wechat/messages/send",Map.of("contact_id",id,"kind","TEMPLATE","template_code","DEMO_MP_REVISIT","content","time2={复诊日期}","request_key",UUID.randomUUID().toString()),operator));
        assertEquals(400,status("/wechat/messages/send",Map.of("contact_id",id,"kind","TEMPLATE","template_code","SMS_REVISIT_REMINDER","content","thing1=x","request_key",UUID.randomUUID().toString()),operator));

        assertEquals(200,official(event("openid-unit-1","unsubscribe","")).statusCode());
        assertEquals("REMOVED",contact("WECHAT_OFFICIAL","openid-unit-1",operator).path("relation").asText());
        assertEquals(400,status("/wechat/messages/send",Map.of("contact_id",id,"kind","TEXT","content","还能收到吗","request_key",UUID.randomUUID().toString()),operator),"no sending after unfollow");
        boolean wechatOnTimeline=false;for(JsonNode e:call("/patients/timeline",Map.of("patient_id",1001,"limit",200),operator).path("events"))wechatOnTimeline|="WECHAT".equals(e.path("kind").asText());
        assertTrue(wechatOnTimeline);
        JsonNode unbound=call("/wechat/contacts/unbind",Map.of("id",id,"version",contact("WECHAT_OFFICIAL","openid-unit-1",operator).path("version").asInt(),"reason","测试解绑"),operator);
        assertTrue(unbound.path("patient_id").isNull());
    }

    @Test void approvedAdviceNeedsTheResponsibleDoctorAndMessagesBecomeConsultations() throws Exception {
        String manager=login("manager"),operator=login("operator_a"),doctor=login("doctor"),platform=login("platform");configure(manager);
        simulate("WECHAT_OFFICIAL","FOLLOW","openid-unit-2",Map.of("channel_id",2),manager);simulate("WECHAT_OFFICIAL","TEXT","openid-unit-2",Map.of("text","最近头晕，需要调整用药吗"),manager);
        JsonNode contact=contact("WECHAT_OFFICIAL","openid-unit-2",operator);long id=contact.path("id").asLong();
        contact=call("/wechat/contacts/bind",Map.of("id",id,"version",contact.path("version").asInt(),"patient_id",1001),operator);

        JsonNode task=call("/tasks/create",Map.of("patient_id",1001,"task_type","FOLLOWUP","title","微信随访（单元测试）","priority","P2","due_at",LocalDateTime.now().plusDays(1).withNano(0).toString(),"request_key",UUID.randomUUID().toString()),operator);
        long taskId=task.path("id").asLong();
        task=call("/tasks/claim",Map.of("id",taskId,"version",task.path("version").asInt()),operator);
        task=call("/tasks/draft",Map.of("id",taskId,"version",task.path("version").asInt(),"mode","MANUAL","draft_text","草稿：请按时复诊。"),operator);
        assertEquals(409,status("/wechat/messages/send",Map.of("contact_id",id,"kind","APPROVED_ADVICE","task_id",taskId,"request_key",UUID.randomUUID().toString()),operator),"a draft is not approved advice");
        task=call("/tasks/submit-review",Map.of("id",taskId,"version",task.path("version").asInt()),operator);
        task=call("/tasks/review",Map.of("id",taskId,"version",task.path("version").asInt(),"approved",true,"approved_text","已审核：请按时复诊，带齐近期检查报告。"),doctor);
        assertEquals(403,status("/wechat/messages/send",Map.of("contact_id",id,"kind","APPROVED_ADVICE","task_id",taskId,"request_key",UUID.randomUUID().toString()),doctor),"doctors approve; they do not send");
        JsonNode advice=send(id,"APPROVED_ADVICE",Map.of("task_id",taskId,"content","页面传来的篡改内容"),operator);
        assertEquals("已审核：请按时复诊，带齐近期检查报告。",advice.path("content").asText(),"text comes from the task, never from the page");
        assertEquals(taskId,advice.path("task_id").asLong());assertEquals("SENT",advice.path("status").asText());
        assertEquals("APPROVED",call("/tasks/"+taskId,null,operator).path("task").path("status").asText(),"sending is not the contact record");

        assertEquals(200,status("/wechat/messages/query",Map.of("contact_id",id,"page",0,"size",10),doctor));
        assertEquals(1,call("/wechat/contacts/query",Map.of("page",0,"size",10,"patient_id",1001,"channel","WECHAT_OFFICIAL","relation","ACTIVE"),doctor).path("items").size());
        assertEquals(403,status("/wechat/contacts/query",Map.of("page",0,"size",10,"bound",true),doctor));
        assertEquals(403,status("/wechat/contacts/query",Map.of("page",0,"size",10,"bound",false),platform));
        assertEquals(403,status("/wechat/mock/inbound",Map.of("provider","WECHAT_OFFICIAL","event","FOLLOW","external_id","openid-unit-x"),operator));

        simulate("WECHAT_OFFICIAL","TEXT","openid-unit-2",Map.of("text","复诊当天需要空腹吗"),manager);
        long inbound=0;for(JsonNode m:messages(id,operator))if("RECEIVED".equals(m.path("status").asText()))inbound=m.path("id").asLong();
        assertTrue(inbound>0);
        JsonNode consultation=call("/wechat/messages/consult",Map.of("id",inbound),operator);
        assertEquals("CONSULTATION",consultation.path("task_type").asText());assertEquals("PENDING",consultation.path("status").asText());
        assertEquals(consultation.path("id").asLong(),call("/wechat/messages/consult",Map.of("id",inbound),operator).path("id").asLong(),"one message, one consultation");
        JsonNode context=call("/tasks/"+consultation.path("id").asLong(),null,operator);
        assertEquals("复诊当天需要空腹吗",context.path("messages").get(0).path("content").asText());assertEquals("PATIENT_TO_STAFF",context.path("messages").get(0).path("direction").asText());
        assertEquals(0,contact("WECHAT_OFFICIAL","openid-unit-2",operator).path("pending_count").asInt());
        assertEquals(400,status("/wechat/messages/consult",Map.of("id",advice.path("id").asLong()),operator),"only a patient's message converts");
    }

    @Test void wecomEventsMassTaskSyncAndChannelCodes() throws Exception {
        String manager=login("manager"),operator=login("operator_a");configure(manager);
        assertEquals("demo.operator.a",call("/accounts/wecom",Map.of("id",3,"wecom_user_id","demo.operator.a"),manager).path("wecom_user_id").asText());
        assertEquals(400,status("/accounts/wecom",Map.of("id",1,"wecom_user_id","demo.operator.a"),manager),"one member id, one work account");
        assertEquals(403,status("/accounts/wecom",Map.of("id",3,"wecom_user_id","x"),operator));

        String echo=WechatCrypto.encrypt(AES,CORP,"echo-wecom-42");
        var verify=callback("wecom",1,Map.of("msg_signature",WechatCrypto.signature(TOKEN,"1700000000","n2",echo),"timestamp","1700000000","nonce","n2","echostr",echo),null);
        assertEquals(200,verify.statusCode(),verify.body());assertEquals("echo-wecom-42",verify.body());
        assertEquals(403,callback("wecom",1,Map.of("msg_signature","0".repeat(40),"timestamp","1700000000","nonce","n2","echostr",echo),null).statusCode());
        String added="<xml><ToUserName><![CDATA["+CORP+"]]></ToUserName><FromUserName><![CDATA[sys]]></FromUserName><CreateTime>1700000100</CreateTime><MsgType><![CDATA[event]]></MsgType><Event><![CDATA[change_external_contact]]></Event>"
            +"<ChangeType><![CDATA[add_external_contact]]></ChangeType><UserID><![CDATA[demo.operator.a]]></UserID><ExternalUserID><![CDATA[wm-unit-1]]></ExternalUserID><State><![CDATA[ch1]]></State><WelcomeCode><![CDATA[welcome-unit]]></WelcomeCode></xml>";
        assertEquals("success",encrypted("wecom",CORP,added).body());assertEquals(200,encrypted("wecom",CORP,added).statusCode());
        JsonNode contact=contact("WE_COM","wm-unit-1",operator);long id=contact.path("id").asLong();
        assertEquals("demo.operator.a",contact.path("staff_user_id").asText());assertEquals(3,contact.path("staff_account_id").asLong());assertEquals(1,contact.path("intake_channel_id").asLong());
        assertEquals(2,messages(id,operator).size(),"one add event plus the welcome wording, despite the repeated callback");
        assertEquals(400,status("/wechat/mock/inbound",Map.of("provider","WE_COM","event","TEXT","external_id","wm-unit-1","text","企微聊天正文"),manager),"no message archiving, no chat text");

        contact=call("/wechat/contacts/bind",Map.of("id",id,"version",contact.path("version").asInt(),"patient_id",1001),operator);
        assertEquals(400,status("/wechat/messages/send",Map.of("contact_id",id,"kind","TEMPLATE","template_code","DEMO_MP_REVISIT","content","thing1=x","request_key",UUID.randomUUID().toString()),operator));
        JsonNode mass=send(id,"TEXT",Map.of("content","演示患者您好，本周安排随访，请留意来电。"),operator);
        assertEquals("PENDING_CONFIRM",mass.path("status").asText(),"the member still has to confirm inside WeCom");
        assertEquals("SENT",call("/wechat/messages/refresh",Map.of("id",mass.path("id").asLong()),operator).path("status").asText());
        assertEquals(400,status("/wechat/messages/refresh",Map.of("id",mass.path("id").asLong()),operator));

        assertEquals(403,status("/wechat/contacts/sync",Map.of("provider","WE_COM"),operator));
        JsonNode synced=call("/wechat/contacts/sync",Map.of("provider","WE_COM"),manager);assertEquals(1,synced.path("scanned").asInt());assertEquals(1,synced.path("created").asInt());assertFalse(synced.path("truncated").asBoolean());
        synced=call("/wechat/contacts/sync",Map.of("provider","WE_COM"),manager);assertEquals(0,synced.path("created").asInt());assertEquals(1,synced.path("updated").asInt());
        assertEquals(1001,contact("WE_COM","wm-unit-1",operator).path("patient_id").asLong(),"sync never unbinds");

        assertEquals(403,status("/channels/wechat-qr",Map.of("id",1,"provider","WE_COM"),operator));
        assertEquals("mock://wecom/contact-way/ch1",call("/channels/wechat-qr",Map.of("id",1,"provider","WE_COM"),manager).path("wecom_qr_url").asText());
        JsonNode codes=call("/channels/wechat-qr",Map.of("id",1,"provider","WECHAT_OFFICIAL"),manager);
        assertEquals("mock://official/qr/ch1",codes.path("official_qr_url").asText());assertEquals("mock://wecom/contact-way/ch1",codes.path("wecom_qr_url").asText());

        String removed=added.replace("add_external_contact","del_follow_user").replace("1700000100","1700000200");
        assertEquals(200,encrypted("wecom",CORP,removed).statusCode());
        assertEquals("REMOVED",contact("WE_COM","wm-unit-1",operator).path("relation").asText());
        assertEquals(400,status("/wechat/messages/send",Map.of("contact_id",id,"kind","TEXT","content","好友已删除","request_key",UUID.randomUUID().toString()),operator));
    }

    /** WeCom and the Official Account are separate menu pages; refreshing either one still loads the console. */
    @Test void eachChannelHasItsOwnConsolePage() throws Exception {
        for(String page:new String[]{"/wecom","/official-account"}) {
            var response=http.send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+page)).GET().build(),HttpResponse.BodyHandlers.ofString());
            assertEquals(200,response.statusCode(),page);
            assertTrue(response.body().contains("<div id=\"root\">"),page+" serves the console");
        }
    }
}
