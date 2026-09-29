package com.bgssai.health.admin.org.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.org.service.OrgService;
import com.bgssai.health.org.dto.*;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/campaigns")
@NeedAop
public class SaveCampaignController {
    private final OrgService service;
    public SaveCampaignController(OrgService service) { this.service=service; }
    @PostMapping("/save")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<CampaignResponse> handle(@RequestBody @Valid SaveCampaignRequest request) { return ApiResponse.ok(service.saveCampaign(request)); }
}
