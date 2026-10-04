package com.bgssai.health.admin.wechat.controller;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.wechat.service.WechatInboundService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.bind.annotation.*;
import java.io.IOException;
/** WeCom callback URL verification. No login: the request is accepted only when its signature matches the hospital's callback token. */
@RestController
@RequestMapping("/bgssai/open/wecom/callback")
public class VerifyWecomCallbackController {
    private final WechatInboundService service;
    public VerifyWecomCallbackController(WechatInboundService service) { this.service=service; }
    @GetMapping("/{hospitalId}")
    @RateLimit(capacity=3000,refillPerMinute=3000)
    public void handle(@PathVariable Long hospitalId,@RequestParam(name="msg_signature",required=false) String signature,
        @RequestParam(required=false) String timestamp,@RequestParam(required=false) String nonce,@RequestParam(required=false) String echostr,HttpServletResponse response) throws IOException {
        WechatCallbackIo.text(response,service.verifyWecom(hospitalId,signature,timestamp,nonce,echostr));
    }
}
