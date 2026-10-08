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
public class QueryServiceEntriesController {
 private final PatientServiceCenter service;
 public QueryServiceEntriesController(PatientServiceCenter service){this.service=service;}
 @PostMapping("/query") @RateLimit(capacity=30,refillPerMinute=30)
 public ApiResponse<Paged<ServiceEntryResponse>> handle(@RequestBody @Valid ServiceEntryQueryRequest request){return ApiResponse.ok(service.query(request));}
}
