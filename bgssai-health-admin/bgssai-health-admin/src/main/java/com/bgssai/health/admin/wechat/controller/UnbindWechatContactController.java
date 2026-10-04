package com.bgssai.health.admin.wechat.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.wechat.dto.*;
import com.bgssai.health.wechat.service.WechatContactService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/wechat/contacts")
@NeedAop
public class UnbindWechatContactController {
    private final WechatContactService service;
    public UnbindWechatContactController(WechatContactService service) { this.service=service; }
    @PostMapping("/unbind")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<WechatContactResponse> handle(@RequestBody @Valid UnbindWechatContactRequest request) { return ApiResponse.ok(service.unbind(request)); }
}
