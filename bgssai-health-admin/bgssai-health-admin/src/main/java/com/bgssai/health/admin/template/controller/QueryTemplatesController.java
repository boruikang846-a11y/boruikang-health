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
@RequestMapping("/bgssai/admin/templates")
@NeedAop
public class QueryTemplatesController {
    private final TemplateService service;
    public QueryTemplatesController(TemplateService service) { this.service=service; }
    @PostMapping("/query")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<Paged<TemplateResponse>> handle(@RequestBody @Valid TemplateQueryRequest request) { return ApiResponse.ok(service.query(request)); }
}
