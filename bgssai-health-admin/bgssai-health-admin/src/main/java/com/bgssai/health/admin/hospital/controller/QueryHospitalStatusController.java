package com.bgssai.health.admin.hospital.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.hospital.dto.*;
import com.bgssai.health.hospital.service.HospitalSyncService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/hospital")
@NeedAop
public class QueryHospitalStatusController {
    private final HospitalSyncService service;
    public QueryHospitalStatusController(HospitalSyncService service){this.service=service;}
    @GetMapping("/status")
    public ApiResponse<HospitalStatusResponse> handle(){return ApiResponse.ok(service.status());}
}
