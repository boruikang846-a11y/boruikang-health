package com.boruikang.health.admin.screening.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.screening.service.ScreeningService;
import com.boruikang.health.screening.dto.*;
import com.boruikang.health.common.Paged;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/screenings")
@NeedAop
public class ScreeningStatisticsController {
    private final ScreeningService service;
    public ScreeningStatisticsController(ScreeningService service) { this.service=service; }
    @PostMapping("/statistics")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<ScreeningStatisticsResponse> handle(@RequestBody @Valid ScreeningQueryRequest request) { return ApiResponse.ok(service.statistics(request)); }
}
