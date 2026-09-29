package com.bgssai.health.admin.screening.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.screening.service.ScreeningService;
import com.bgssai.health.screening.dto.*;
import com.bgssai.health.common.Paged;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/screenings")
@NeedAop
public class QueryScreeningsController {
    private final ScreeningService service;
    public QueryScreeningsController(ScreeningService service) { this.service=service; }
    @PostMapping("/query")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<Paged<ScreeningResponse>> handle(@RequestBody @Valid ScreeningQueryRequest request) { return ApiResponse.ok(service.query(request)); }
}
