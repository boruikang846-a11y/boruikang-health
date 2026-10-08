package com.boruikang.health.user.servicecenter.controller;
import com.boruikang.health.common.*;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.servicecenter.dto.*;
import com.boruikang.health.servicecenter.service.PatientServiceCenter;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/user/service_center")

public class PatientPortalController {
 private final PatientServiceCenter service;
 public PatientPortalController(PatientServiceCenter service){this.service=service;}
 @PostMapping("/portal") @RateLimit(capacity=30,refillPerMinute=30)
 public ApiResponse<PatientPortalResponse> handle(@RequestBody @Valid PatientEntryAccessRequest request){return ApiResponse.ok(service.portal(request));}
}
