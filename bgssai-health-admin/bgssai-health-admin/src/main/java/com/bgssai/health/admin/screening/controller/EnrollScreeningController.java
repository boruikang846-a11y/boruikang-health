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
public class EnrollScreeningController {
    private final ScreeningService service;
    public EnrollScreeningController(ScreeningService service) { this.service=service; }
    @PostMapping("/enroll")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<ScreeningResponse> handle(@RequestBody @Valid EnrollScreeningRequest request) { return ApiResponse.ok(service.enroll(request)); }
}
