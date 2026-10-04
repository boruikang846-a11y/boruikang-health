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
public class SyncWechatContactsController {
    private final WechatContactService service;
    public SyncWechatContactsController(WechatContactService service) { this.service=service; }
    @PostMapping("/sync")
    @RateLimit(capacity=6,refillPerMinute=6)
    public ApiResponse<SyncWechatContactsResponse> handle(@RequestBody @Valid SyncWechatContactsRequest request) { return ApiResponse.ok(service.sync(request)); }
}
