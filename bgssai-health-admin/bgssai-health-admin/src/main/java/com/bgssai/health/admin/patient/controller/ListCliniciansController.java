package com.bgssai.health.admin.patient.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.patient.dto.ClinicianInfo;
import com.bgssai.health.patient.service.PatientService;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController
@RequestMapping("/bgssai/admin")
@NeedAop
public class ListCliniciansController {
    private final PatientService service;
    public ListCliniciansController(PatientService service) { this.service=service; }
    @GetMapping("/clinicians")
    @RateLimit(capacity=120, refillPerMinute=120)
    public ApiResponse<List<ClinicianInfo>> handle() { return ApiResponse.ok(service.clinicians()); }
}
