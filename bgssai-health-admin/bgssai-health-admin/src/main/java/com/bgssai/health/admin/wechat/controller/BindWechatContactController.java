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
public class BindWechatContactController {
    private final WechatContactService service;
    public BindWechatContactController(WechatContactService service) { this.service=service; }
    @PostMapping("/bind")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<WechatContactResponse> handle(@RequestBody @Valid BindWechatContactRequest request) { return ApiResponse.ok(service.bind(request)); }
}
