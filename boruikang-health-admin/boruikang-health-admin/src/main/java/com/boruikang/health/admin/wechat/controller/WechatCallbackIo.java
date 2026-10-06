package com.boruikang.health.admin.wechat.controller;
import com.boruikang.health.common.exception.BizException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
/** Raw servlet I/O of the WeChat callbacks: a bounded XML body in, plain text out, independent of the JSON converters. */
final class WechatCallbackIo {
    private static final int MAX_BODY=64*1024;
    private WechatCallbackIo() {}
    static String body(HttpServletRequest request) throws IOException {
        byte[] bytes=request.getInputStream().readNBytes(MAX_BODY+1);
        if(bytes.length>MAX_BODY)throw new BizException("413000","Callback body too large");
        return new String(bytes,StandardCharsets.UTF_8);
    }
    static void text(HttpServletResponse response,String value) throws IOException {
        response.setStatus(200);response.setContentType("text/plain");response.setCharacterEncoding("UTF-8");response.getWriter().write(value);
    }
}
