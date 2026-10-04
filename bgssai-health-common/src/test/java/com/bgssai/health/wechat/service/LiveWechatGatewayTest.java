package com.bgssai.health.wechat.service;
import com.bgssai.health.common.exception.BizException;
import com.bgssai.health.model.IntegrationConfig;
import com.fasterxml.jackson.core.json.JsonWriteFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;
import java.nio.charset.StandardCharsets;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;
/** The live gateway against a recording HTTP double: exact WeChat endpoints, token reuse, error mapping and UTF-8 bodies. No network. */
class LiveWechatGatewayTest {
    private static final String TOKEN_OK="{\"errcode\":0,\"errmsg\":\"ok\",\"access_token\":\"TOKEN-1\",\"expires_in\":7200}";
    /** Records every call and answers from a queue; a null reply simulates a network failure. */
    private static final class RecordingHttp extends RestTemplate {
        final List<String> calls=new ArrayList<>(),bodies=new ArrayList<>();final List<Object[]> variables=new ArrayList<>();final Deque<String> replies=new ArrayDeque<>();
        @Override @SuppressWarnings("unchecked")
        public <T> ResponseEntity<T> exchange(String url,HttpMethod method,HttpEntity<?> entity,Class<T> type,Object... uriVariables) {
            calls.add(method+" "+url);bodies.add(entity.getBody()==null?"":new String((byte[])entity.getBody(),StandardCharsets.UTF_8));variables.add(uriVariables);
            String reply=replies.remove();if("TIMEOUT".equals(reply))throw new ResourceAccessException("timeout");
            return (ResponseEntity<T>)ResponseEntity.ok(reply.getBytes(StandardCharsets.UTF_8));
        }
    }
    private final RecordingHttp http=new RecordingHttp();private LiveWechatGateway gateway;
    @BeforeEach void setup() {
        ObjectMapper json=new ObjectMapper();json.setPropertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE);json.getFactory().configure(JsonWriteFeature.ESCAPE_NON_ASCII.mappedFeature(),false);
        gateway=new LiveWechatGateway(http,json);
    }
    private static IntegrationConfig config(String provider) {
        IntegrationConfig c=new IntegrationConfig();c.id="WE_COM".equals(provider)?2L:3L;c.hospitalId=1L;c.provider=provider;c.appId="app-id-000000";c.secret="top-secret";return c;
    }
    @Test void officialTextUsesStableTokenOnceAndSendsRawChinese() {
        http.replies.addAll(List.of(TOKEN_OK,"{\"errcode\":0,\"errmsg\":\"ok\"}","{\"errcode\":0,\"errmsg\":\"ok\"}"));IntegrationConfig c=config("WECHAT_OFFICIAL");
        assertEquals("",gateway.sendOfficialText(c,"openid-1","您好，请按时复诊"));gateway.sendOfficialText(c,"openid-1","第二条");
        assertEquals(List.of("POST https://api.weixin.qq.com/cgi-bin/stable_token","POST https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token={token}","POST https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token={token}"),http.calls);
        assertTrue(http.bodies.get(0).contains("\"appid\":\"app-id-000000\"")&&http.bodies.get(0).contains("\"force_refresh\":false"));
        assertEquals("{\"touser\":\"openid-1\",\"msgtype\":\"text\",\"text\":{\"content\":\"您好，请按时复诊\"}}".length(),http.bodies.get(1).length());
        assertTrue(http.bodies.get(1).contains("您好，请按时复诊"),"Chinese must not be \\u-escaped");
        assertArrayEquals(new Object[]{"TOKEN-1"},http.variables.get(1));
    }
    @Test void wecomTokenTravelsAsUriVariablesAndIsRefetchedWhenRejected() {
        IntegrationConfig c=config("WE_COM");
        http.replies.addAll(List.of(TOKEN_OK,"{\"errcode\":42001,\"errmsg\":\"access_token expired\"}",TOKEN_OK.replace("TOKEN-1","TOKEN-2"),"{\"errcode\":0,\"msgid\":\"msg-1\",\"fail_list\":[]}"));
        assertEquals("msg-1",gateway.createWecomMass(c,"zhangsan","wm-1","随访提醒"));
        assertEquals("GET https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid={id}&corpsecret={secret}",http.calls.get(0));
        assertArrayEquals(new Object[]{"app-id-000000","top-secret"},http.variables.get(0));
        assertEquals(4,http.calls.size());assertArrayEquals(new Object[]{"TOKEN-2"},http.variables.get(3));
        assertTrue(http.bodies.get(3).contains("\"chat_type\":\"single\"")&&http.bodies.get(3).contains("\"sender\":\"zhangsan\"")&&http.bodies.get(3).contains("\"external_userid\":[\"wm-1\"]"));
        for(String call:http.calls)assertFalse(call.contains("top-secret")||call.contains("TOKEN-"),"secrets stay out of the URL template");
    }
    @Test void wechatErrorsCarryTheCodeAndNetworkFailuresSayDeliveryIsUnknown() {
        http.replies.add("{\"errcode\":40013,\"errmsg\":\"invalid appid\"}");
        BizException rejected=assertThrows(BizException.class,()->gateway.verify(config("WECHAT_OFFICIAL")));
        assertEquals("502000",rejected.getCode());assertEquals("40013 invalid appid",rejected.getMessage());
        http.replies.add("TIMEOUT");
        BizException timeout=assertThrows(BizException.class,()->gateway.verify(config("WE_COM")));
        assertEquals("502000",timeout.getCode());assertTrue(timeout.getMessage().contains("未确认"));assertFalse(timeout.getMessage().contains("top-secret"));
    }
    @Test void massTaskFailListAndStatusMapping() {
        IntegrationConfig c=config("WE_COM");
        http.replies.addAll(List.of(TOKEN_OK,"{\"errcode\":0,\"msgid\":\"msg-2\",\"fail_list\":[\"wm-9\"]}"));
        assertTrue(assertThrows(BizException.class,()->gateway.createWecomMass(c,"zhangsan","wm-9","x")).getMessage().contains("企业微信未接受"));
        http.replies.add("{\"errcode\":0,\"send_list\":[{\"external_userid\":\"wm-1\",\"userid\":\"zhangsan\",\"status\":1},{\"external_userid\":\"wm-2\",\"status\":2},{\"external_userid\":\"wm-3\",\"status\":0}]}");
        assertEquals("SENT",gateway.wecomMassStatus(c,"msg-2","zhangsan","wm-1"));
        for(Map.Entry<String,String> expected:Map.of("wm-2","FAILED","wm-3","PENDING_CONFIRM","wm-4","PENDING_CONFIRM").entrySet()) {
            http.replies.add("{\"errcode\":0,\"send_list\":[{\"external_userid\":\"wm-2\",\"status\":2},{\"external_userid\":\"wm-3\",\"status\":0}]}");
            assertEquals(expected.getValue(),gateway.wecomMassStatus(c,"msg-2","zhangsan",expected.getKey()));
        }
    }
    @Test void templateContactWayQrAndListsUseTheDocumentedShapes() {
        IntegrationConfig official=config("WECHAT_OFFICIAL"),wecom=config("WE_COM");
        http.replies.addAll(List.of(TOKEN_OK,"{\"errcode\":0,\"errmsg\":\"ok\",\"msgid\":200228332}","{\"ticket\":\"t\",\"url\":\"http://weixin.qq.com/q/demo\"}",
            "{\"total\":2,\"count\":2,\"data\":{\"openid\":[\"o1\",\"o2\"]},\"next_openid\":\"o2\"}","{\"total\":2,\"count\":0,\"next_openid\":\"\"}",
            "{\"user_info_list\":[{\"subscribe\":1,\"openid\":\"o1\",\"unionid\":\"u1\",\"subscribe_time\":1700000000,\"qr_scene_str\":\"ch7\"},{\"subscribe\":0,\"openid\":\"o2\"}]}"));
        assertEquals("200228332",gateway.sendOfficialTemplate(official,"o1","tpl-1",Map.of("thing1","复诊提醒")));
        assertTrue(http.bodies.get(1).contains("\"template_id\":\"tpl-1\"")&&http.bodies.get(1).contains("\"thing1\":{\"value\":\"复诊提醒\"}"));
        assertEquals("http://weixin.qq.com/q/demo",gateway.officialQr(official,"ch7"));
        assertTrue(http.bodies.get(2).contains("\"action_name\":\"QR_LIMIT_STR_SCENE\"")&&http.bodies.get(2).contains("\"scene_str\":\"ch7\""));
        List<WechatGateway.Profile> followers=gateway.officialFollowers(official,1000);
        assertEquals(1,followers.size());assertEquals("o1",followers.getFirst().externalId());assertEquals("u1",followers.getFirst().unionId());assertEquals("ch7",followers.getFirst().scene());assertNull(followers.getFirst().nickname());
        http.replies.addAll(List.of(TOKEN_OK,"{\"errcode\":0,\"config_id\":\"cfg-1\",\"qr_code\":\"https://wework.qpic.cn/demo\"}",
            "{\"errcode\":0,\"external_contact_list\":[{\"external_contact\":{\"external_userid\":\"wm-1\",\"name\":\"昵称甲\",\"unionid\":\"u9\"},\"follow_info\":{\"userid\":\"zhangsan\",\"createtime\":1700000000,\"state\":\"ch7\"}}],\"next_cursor\":\"\"}"));
        assertEquals(new WechatGateway.ContactWay("cfg-1","https://wework.qpic.cn/demo"),gateway.wecomContactWay(wecom,"zhangsan","ch7"));
        List<WechatGateway.Profile> customers=gateway.wecomContacts(wecom,List.of("zhangsan"),1000);
        assertEquals(1,customers.size());assertEquals("昵称甲",customers.getFirst().nickname());assertEquals("zhangsan",customers.getFirst().staffUserId());assertEquals("ch7",customers.getFirst().scene());assertNotNull(customers.getFirst().followedAt());
    }
}
