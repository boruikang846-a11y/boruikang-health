package com.boruikang.health.admin.org.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.org.service.OrgService;
import com.boruikang.health.org.dto.*;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/campaigns")
@NeedAop
public class SaveCampaignController {
    private final OrgService service;
    public SaveCampaignController(OrgService service) { this.service=service; }
    @PostMapping("/save")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<CampaignResponse> handle(@RequestBody @Valid SaveCampaignRequest request) { return ApiResponse.ok(service.saveCampaign(request)); }
}
