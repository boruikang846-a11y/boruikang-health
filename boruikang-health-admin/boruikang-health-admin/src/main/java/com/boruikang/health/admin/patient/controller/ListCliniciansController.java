package com.boruikang.health.admin.patient.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.patient.dto.ClinicianInfo;
import com.boruikang.health.patient.service.PatientService;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController
@RequestMapping("/boruikang/admin")
@NeedAop
public class ListCliniciansController {
    private final PatientService service;
    public ListCliniciansController(PatientService service) { this.service=service; }
    @GetMapping("/clinicians")
    @RateLimit(capacity=120, refillPerMinute=120)
    public ApiResponse<List<ClinicianInfo>> handle() { return ApiResponse.ok(service.clinicians()); }
}
