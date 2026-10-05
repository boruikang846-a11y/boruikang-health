package com.boruikang.health.admin.template.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.template.service.TemplateService;
import com.boruikang.health.template.dto.*;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/templates")
@NeedAop
public class SaveTemplateController {
    private final TemplateService service;
    public SaveTemplateController(TemplateService service) { this.service=service; }
    @PostMapping("/save")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<TemplateResponse> handle(@RequestBody @Valid SaveTemplateRequest request) { return ApiResponse.ok(service.save(request)); }
}
