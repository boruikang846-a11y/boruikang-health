package com.bgssai.health.admin.wechat.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.common.dto.IdRequest;
import com.bgssai.health.task.dto.TaskResponse;
import com.bgssai.health.wechat.service.WechatMessageService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/wechat/messages")
@NeedAop
public class ConsultWechatMessageController {
    private final WechatMessageService service;
    public ConsultWechatMessageController(WechatMessageService service) { this.service=service; }
    @PostMapping("/consult")
    @RateLimit(capacity=60,refillPerMinute=60)
    public ApiResponse<TaskResponse> handle(@RequestBody @Valid IdRequest request) { return ApiResponse.ok(service.consult(request.id())); }
}
