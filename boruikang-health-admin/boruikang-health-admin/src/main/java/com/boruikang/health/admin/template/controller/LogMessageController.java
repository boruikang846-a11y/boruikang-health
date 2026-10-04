package com.boruikang.health.admin.template.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.template.service.TemplateService;
import com.boruikang.health.template.dto.*;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/message-logs")
@NeedAop
public class LogMessageController {
    private final TemplateService service;
    public LogMessageController(TemplateService service) { this.service=service; }
    @PostMapping("/create")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<MessageLogResponse> handle(@RequestBody @Valid LogMessageRequest request) { return ApiResponse.ok(service.logMessage(request)); }
}
