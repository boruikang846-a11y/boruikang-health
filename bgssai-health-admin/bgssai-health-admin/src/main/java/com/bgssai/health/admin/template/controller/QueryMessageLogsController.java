package com.bgssai.health.admin.template.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.template.service.TemplateService;
import com.bgssai.health.template.dto.*;
import com.bgssai.health.common.Paged;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/message-logs")
@NeedAop
public class QueryMessageLogsController {
    private final TemplateService service;
    public QueryMessageLogsController(TemplateService service) { this.service=service; }
    @PostMapping("/query")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<Paged<MessageLogResponse>> handle(@RequestBody @Valid MessageLogQueryRequest request) { return ApiResponse.ok(service.logs(request)); }
}
