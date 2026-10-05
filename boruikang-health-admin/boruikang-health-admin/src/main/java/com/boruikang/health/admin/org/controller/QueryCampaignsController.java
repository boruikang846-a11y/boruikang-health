package com.boruikang.health.admin.org.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.org.service.OrgService;
import com.boruikang.health.org.dto.*;
import com.boruikang.health.common.Paged;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/campaigns")
@NeedAop
public class QueryCampaignsController {
    private final OrgService service;
    public QueryCampaignsController(OrgService service) { this.service=service; }
    @PostMapping("/query")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<Paged<CampaignResponse>> handle(@RequestBody @Valid CampaignQueryRequest request) { return ApiResponse.ok(service.campaigns(request)); }
}
