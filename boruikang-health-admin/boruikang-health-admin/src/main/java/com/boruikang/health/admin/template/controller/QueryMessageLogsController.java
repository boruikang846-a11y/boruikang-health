package com.boruikang.health.admin.template.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.template.service.TemplateService;
import com.boruikang.health.template.dto.*;
import com.boruikang.health.common.Paged;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/message-logs")
@NeedAop
public class QueryMessageLogsController {
    private final TemplateService service;
    public QueryMessageLogsController(TemplateService service) { this.service=service; }
    @PostMapping("/query")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<Paged<MessageLogResponse>> handle(@RequestBody @Valid MessageLogQueryRequest request) { return ApiResponse.ok(service.logs(request)); }
}
