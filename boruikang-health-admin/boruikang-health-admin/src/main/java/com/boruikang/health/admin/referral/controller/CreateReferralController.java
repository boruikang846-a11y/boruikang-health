package com.boruikang.health.admin.referral.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.referral.service.ReferralService;
import com.boruikang.health.referral.dto.*;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/referrals")
@NeedAop
public class CreateReferralController {
    private final ReferralService service;
    public CreateReferralController(ReferralService service) { this.service=service; }
    @PostMapping("/create")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<ReferralResponse> handle(@RequestBody @Valid CreateReferralRequest request) { return ApiResponse.ok(service.create(request)); }
}
