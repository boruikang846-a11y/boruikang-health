package com.boruikang.health.admin.wechat.controller;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.wechat.service.WechatInboundService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.bind.annotation.*;
import java.io.IOException;
/** WeCom customer-contact events. No login: the request is accepted only when its signature matches the hospital's callback token. */
@RestController
@RequestMapping("/boruikang/open/wecom/callback")
public class ReceiveWecomCallbackController {
    private final WechatInboundService service;
    public ReceiveWecomCallbackController(WechatInboundService service) { this.service=service; }
    @PostMapping("/{hospitalId}")
    @RateLimit(capacity=3000,refillPerMinute=3000)
    public void handle(@PathVariable Long hospitalId,@RequestParam(name="msg_signature",required=false) String signature,
        @RequestParam(required=false) String timestamp,@RequestParam(required=false) String nonce,HttpServletRequest request,HttpServletResponse response) throws IOException {
        service.receiveWecom(hospitalId,signature,timestamp,nonce,WechatCallbackIo.body(request));WechatCallbackIo.text(response,"success");
    }
}
