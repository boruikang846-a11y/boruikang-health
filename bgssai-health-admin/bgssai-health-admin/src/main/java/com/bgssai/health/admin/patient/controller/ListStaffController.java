package com.bgssai.health.admin.patient.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.patient.service.PatientService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin")
@NeedAop
public class ListStaffController {
    private final PatientService service;
    public ListStaffController(PatientService service) { this.service=service; }
    @GetMapping("/staff")
    @RateLimit(capacity=120, refillPerMinute=120)
    public ApiResponse<java.util.List<com.bgssai.health.auth.dto.AccountInfo>> handle() { return ApiResponse.ok(service.staff()); }
}
