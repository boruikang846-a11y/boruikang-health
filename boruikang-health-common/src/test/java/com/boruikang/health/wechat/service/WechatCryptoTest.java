package com.boruikang.health.wechat.service;
import com.boruikang.health.common.exception.BizException;
import org.junit.jupiter.api.Test;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;
class WechatCryptoTest {
    // Published sample values of the WeCom callback encryption library; they belong to no real organisation.
    private static final String TOKEN="QDG6eK",CORP="wx5823bf96d3bd56c7",KEY="jWmYm7qr5nMoAUwZRjGtBxmz3KA1tkAj3ykkR6q2B2C";
    @Test void decryptsThePublishedUrlVerificationSample() {
        String echo="P9nAzCzyDtyTWESHep1vC5X9xho/qYX3Zpb4yKa9SKld1DsH3Iyt3tP3zNdtp+4RPcs8TgAE7OaBO+FZXvnaqQ==";
        assertEquals("5c45ff5e21c57e6ad56bac8758b79b1d9ac89fd3",WechatCrypto.signature(TOKEN,"1409659589","263014780",echo));
        assertEquals("1616140317555161061",WechatCrypto.decrypt(KEY,CORP,echo));
    }
    @Test void roundTripKeepsChineseTextAndChecksTheReceiver() {
        String message="<xml><Content><![CDATA[请问复诊要带什么资料？]]></Content></xml>",encrypted=WechatCrypto.encrypt(KEY,CORP,message);
        assertEquals(message,WechatCrypto.decrypt(KEY,CORP,encrypted));
        assertNotEquals(encrypted,WechatCrypto.encrypt(KEY,CORP,message),"random prefix makes every ciphertext different");
        assertEquals("4003",assertThrows(BizException.class,()->WechatCrypto.decrypt(KEY,"wx0000000000000000",encrypted)).getCode());
        assertEquals("4003",assertThrows(BizException.class,()->WechatCrypto.decrypt("abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG",CORP,encrypted)).getCode());
        assertEquals("4003",assertThrows(BizException.class,()->WechatCrypto.decrypt(KEY,CORP,"not-base64!")).getCode());
        assertEquals("4003",assertThrows(BizException.class,()->WechatCrypto.decrypt(KEY,CORP,"")).getCode());
    }
    @Test void signatureIsOrderIndependentAndComparedSafely() {
        String expected=WechatCrypto.signature("token","1700000000","nonce");
        assertEquals(expected,WechatCrypto.signature("nonce","token","1700000000"));
        assertTrue(WechatCrypto.matches(expected,expected));
        assertFalse(WechatCrypto.matches(expected,null));assertFalse(WechatCrypto.matches(expected,expected.substring(1)));
        assertTrue(WechatCrypto.validKey(KEY));assertFalse(WechatCrypto.validKey("short"));assertFalse(WechatCrypto.validKey(null));
    }
    @Test void xmlParserReadsFlatFieldsAndRefusesDoctype() {
        Map<String,String> values=WechatXml.parse("<xml><FromUserName><![CDATA[openid-demo]]></FromUserName><CreateTime>1700000000</CreateTime><Content><![CDATA[你好]]></Content></xml>");
        assertEquals("openid-demo",values.get("FromUserName"));assertEquals("1700000000",values.get("CreateTime"));assertEquals("你好",values.get("Content"));
        String hostile="<?xml version=\"1.0\"?><!DOCTYPE xml [<!ENTITY secret SYSTEM \"file:///etc/passwd\">]><xml><Content>&secret;</Content></xml>";
        assertEquals("50000001",assertThrows(BizException.class,()->WechatXml.parse(hostile)).getCode());
        assertEquals("50000001",assertThrows(BizException.class,()->WechatXml.parse("not xml")).getCode());
    }
    @Test void templateFieldsAndPlaceholders() {
        assertEquals(Map.of("thing1","复诊提醒","time2","2026-10-08"),WechatLedger.templateData("thing1=复诊提醒\n\ntime2 = 2026-10-08\n"));
        assertThrows(BizException.class,()->WechatLedger.templateData("没有等号"));
        assertThrows(BizException.class,()->WechatLedger.templateData("thing1=a\nthing1=b"));
        assertThrows(BizException.class,()->WechatLedger.templateData("  \n"));
        assertTrue(WechatLedger.hasPlaceholder("您好{姓名}，请复诊"));assertFalse(WechatLedger.hasPlaceholder("您好，请于 10 月 8 日复诊"));
    }
}
