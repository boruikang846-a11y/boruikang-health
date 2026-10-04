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
@RequestMapping("/boruikang/admin/templates")
@NeedAop
public class QueryTemplatesController {
    private final TemplateService service;
    public QueryTemplatesController(TemplateService service) { this.service=service; }
    @PostMapping("/query")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<Paged<TemplateResponse>> handle(@RequestBody @Valid TemplateQueryRequest request) { return ApiResponse.ok(service.query(request)); }
}
