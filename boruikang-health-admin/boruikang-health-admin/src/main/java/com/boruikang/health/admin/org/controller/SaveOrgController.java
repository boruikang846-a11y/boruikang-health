package com.boruikang.health.admin.org.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.org.service.OrgService;
import com.boruikang.health.org.dto.*;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/orgs")
@NeedAop
public class SaveOrgController {
    private final OrgService service;
    public SaveOrgController(OrgService service) { this.service=service; }
    @PostMapping("/save")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<OrgResponse> handle(@RequestBody @Valid SaveOrgRequest request) { return ApiResponse.ok(service.saveOrg(request)); }
}
