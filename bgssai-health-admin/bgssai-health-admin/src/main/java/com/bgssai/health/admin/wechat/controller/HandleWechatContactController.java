package com.bgssai.health.admin.wechat.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.common.dto.IdRequest;
import com.bgssai.health.wechat.dto.*;
import com.bgssai.health.wechat.service.WechatContactService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/wechat/contacts")
@NeedAop
public class HandleWechatContactController {
    private final WechatContactService service;
    public HandleWechatContactController(WechatContactService service) { this.service=service; }
    @PostMapping("/handle")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<WechatContactResponse> handle(@RequestBody @Valid IdRequest request) { return ApiResponse.ok(service.handle(request.id())); }
}
