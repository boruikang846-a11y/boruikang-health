package com.bgssai.health.admin.screening.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.screening.service.ScreeningService;
import com.bgssai.health.screening.dto.*;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/screenings")
@NeedAop
public class JudgeScreeningController {
    private final ScreeningService service;
    public JudgeScreeningController(ScreeningService service) { this.service=service; }
    @PostMapping("/judge")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<ScreeningResponse> handle(@RequestBody @Valid JudgeScreeningRequest request) { return ApiResponse.ok(service.judge(request)); }
}
