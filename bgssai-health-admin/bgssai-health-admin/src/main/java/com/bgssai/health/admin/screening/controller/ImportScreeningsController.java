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
public class ImportScreeningsController {
    private final ScreeningService service;
    public ImportScreeningsController(ScreeningService service) { this.service=service; }
    @PostMapping("/import")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<ImportScreeningResponse> handle(@RequestBody @Valid ImportScreeningRequest request) { return ApiResponse.ok(service.importRows(request)); }
}
