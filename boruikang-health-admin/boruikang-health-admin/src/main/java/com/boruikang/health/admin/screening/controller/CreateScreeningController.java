package com.boruikang.health.admin.screening.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.screening.service.ScreeningService;
import com.boruikang.health.screening.dto.*;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/screenings")
@NeedAop
public class CreateScreeningController {
    private final ScreeningService service;
    public CreateScreeningController(ScreeningService service) { this.service=service; }
    @PostMapping("/create")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<ScreeningResponse> handle(@RequestBody @Valid CreateScreeningRequest request) { return ApiResponse.ok(service.create(request)); }
}
