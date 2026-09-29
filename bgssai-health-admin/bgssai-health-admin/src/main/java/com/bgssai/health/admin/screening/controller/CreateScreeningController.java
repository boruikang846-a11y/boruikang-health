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
public class CreateScreeningController {
    private final ScreeningService service;
    public CreateScreeningController(ScreeningService service) { this.service=service; }
    @PostMapping("/create")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<ScreeningResponse> handle(@RequestBody @Valid CreateScreeningRequest request) { return ApiResponse.ok(service.create(request)); }
}
