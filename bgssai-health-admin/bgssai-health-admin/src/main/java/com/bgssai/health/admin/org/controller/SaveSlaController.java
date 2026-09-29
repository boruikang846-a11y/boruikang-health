package com.bgssai.health.admin.org.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.org.service.OrgService;
import com.bgssai.health.org.dto.*;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/sla")
@NeedAop
public class SaveSlaController {
    private final OrgService service;
    public SaveSlaController(OrgService service) { this.service=service; }
    @PostMapping("/save")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<SlaResponse> handle(@RequestBody @Valid SaveSlaRequest request) { return ApiResponse.ok(service.saveSla(request)); }
}
