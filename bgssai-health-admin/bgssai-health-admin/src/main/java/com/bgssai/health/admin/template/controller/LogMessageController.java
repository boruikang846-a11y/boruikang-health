package com.bgssai.health.admin.template.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.template.service.TemplateService;
import com.bgssai.health.template.dto.*;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/message-logs")
@NeedAop
public class LogMessageController {
    private final TemplateService service;
    public LogMessageController(TemplateService service) { this.service=service; }
    @PostMapping("/create")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<MessageLogResponse> handle(@RequestBody @Valid LogMessageRequest request) { return ApiResponse.ok(service.logMessage(request)); }
}
