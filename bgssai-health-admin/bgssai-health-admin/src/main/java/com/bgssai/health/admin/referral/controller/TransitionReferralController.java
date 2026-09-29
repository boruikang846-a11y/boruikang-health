package com.bgssai.health.admin.referral.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.referral.service.ReferralService;
import com.bgssai.health.referral.dto.*;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/referrals")
@NeedAop
public class TransitionReferralController {
    private final ReferralService service;
    public TransitionReferralController(ReferralService service) { this.service=service; }
    @PostMapping("/transition")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<ReferralResponse> handle(@RequestBody @Valid TransitionReferralRequest request) { return ApiResponse.ok(service.transition(request)); }
}
