package com.boruikang.health.admin.patient.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.patient.service.PatientService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin")
@NeedAop
public class ListStaffController {
    private final PatientService service;
    public ListStaffController(PatientService service) { this.service=service; }
    @GetMapping("/staff")
    @RateLimit(capacity=120, refillPerMinute=120)
    public ApiResponse<java.util.List<com.boruikang.health.auth.dto.AccountInfo>> handle() { return ApiResponse.ok(service.staff()); }
}
