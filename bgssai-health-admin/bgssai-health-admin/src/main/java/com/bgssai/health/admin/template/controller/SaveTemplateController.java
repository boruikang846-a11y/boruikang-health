package com.bgssai.health.admin.template.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.template.service.TemplateService;
import com.bgssai.health.template.dto.*;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/templates")
@NeedAop
public class SaveTemplateController {
    private final TemplateService service;
    public SaveTemplateController(TemplateService service) { this.service=service; }
    @PostMapping("/save")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<TemplateResponse> handle(@RequestBody @Valid SaveTemplateRequest request) { return ApiResponse.ok(service.save(request)); }
}
