package com.bgssai.health.admin.org.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.org.service.OrgService;
import com.bgssai.health.org.dto.*;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/orgs")
@NeedAop
public class SaveOrgController {
    private final OrgService service;
    public SaveOrgController(OrgService service) { this.service=service; }
    @PostMapping("/save")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<OrgResponse> handle(@RequestBody @Valid SaveOrgRequest request) { return ApiResponse.ok(service.saveOrg(request)); }
}
