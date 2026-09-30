package com.bgssai.health.admin.org.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.org.service.OrgService;
import com.bgssai.health.org.dto.*;
import com.bgssai.health.common.Paged;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/campaigns")
@NeedAop
public class QueryCampaignsController {
    private final OrgService service;
    public QueryCampaignsController(OrgService service) { this.service=service; }
    @PostMapping("/query")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<Paged<CampaignResponse>> handle(@RequestBody @Valid CampaignQueryRequest request) { return ApiResponse.ok(service.campaigns(request)); }
}
