package com.boruikang.health.admin.servicecenter.controller;
import com.boruikang.health.common.*;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.servicecenter.dto.*;
import com.boruikang.health.servicecenter.service.PatientServiceCenter;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/service_center")
@NeedAop
public class VerifyServiceEntryController {
 private final PatientServiceCenter service;
 public VerifyServiceEntryController(PatientServiceCenter service){this.service=service;}
 @PostMapping("/verify") @RateLimit(capacity=30,refillPerMinute=30)
 public ApiResponse<ServiceEntryResponse> handle(@RequestBody @Valid ServiceEntryVerifyRequest request){return ApiResponse.ok(service.verify(request));}
}
