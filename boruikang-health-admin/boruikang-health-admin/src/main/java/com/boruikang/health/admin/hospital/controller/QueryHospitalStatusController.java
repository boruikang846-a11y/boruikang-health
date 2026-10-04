package com.boruikang.health.admin.hospital.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.hospital.dto.*;
import com.boruikang.health.hospital.service.HospitalSyncService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/hospital")
@NeedAop
public class QueryHospitalStatusController {
    private final HospitalSyncService service;
    public QueryHospitalStatusController(HospitalSyncService service){this.service=service;}
    @GetMapping("/status")
    public ApiResponse<HospitalStatusResponse> handle(){return ApiResponse.ok(service.status());}
}
