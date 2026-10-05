package com.boruikang.health.admin.wechat.controller;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.wechat.service.WechatInboundService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.bind.annotation.*;
import java.io.IOException;
/** Official Account messages and events. No login: the request is accepted only when its signature matches the hospital's callback token. */
@RestController
@RequestMapping("/boruikang/open/wechat/callback")
public class ReceiveOfficialCallbackController {
    private final WechatInboundService service;
    public ReceiveOfficialCallbackController(WechatInboundService service) { this.service=service; }
    @PostMapping("/{hospitalId}")
    @RateLimit(capacity=3000,refillPerMinute=3000)
    public void handle(@PathVariable Long hospitalId,@RequestParam(required=false) String signature,@RequestParam(name="msg_signature",required=false) String messageSignature,@RequestParam(name="encrypt_type",required=false) String encryptType,
        @RequestParam(required=false) String timestamp,@RequestParam(required=false) String nonce,HttpServletRequest request,HttpServletResponse response) throws IOException {
        service.receiveOfficial(hospitalId,signature,messageSignature,encryptType,timestamp,nonce,WechatCallbackIo.body(request));WechatCallbackIo.text(response,"success");
    }
}
