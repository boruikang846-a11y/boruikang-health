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
public class ImportScreeningsController {
    private final ScreeningService service;
    public ImportScreeningsController(ScreeningService service) { this.service=service; }
    @PostMapping("/import")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<ImportScreeningResponse> handle(@RequestBody @Valid ImportScreeningRequest request) { return ApiResponse.ok(service.importRows(request)); }
}
