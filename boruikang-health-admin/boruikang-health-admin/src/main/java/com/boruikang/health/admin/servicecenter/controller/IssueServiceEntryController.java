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
public class IssueServiceEntryController {
 private final PatientServiceCenter service;
 public IssueServiceEntryController(PatientServiceCenter service){this.service=service;}
 @PostMapping("/issue") @RateLimit(capacity=30,refillPerMinute=30)
 public ApiResponse<ServiceEntryIssuedResponse> handle(@RequestBody @Valid ServiceEntryIssueRequest request){return ApiResponse.ok(service.issue(request));}
}
