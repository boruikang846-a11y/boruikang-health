package com.boruikang.health.admin.continuity.controller;
import com.boruikang.health.common.*;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.continuity.dto.*;
import com.boruikang.health.continuity.service.PatientServiceSummary;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/boruikang/admin/continuity") @NeedAop
public class PatientServiceSummaryController {
 private final PatientServiceSummary service;
 public PatientServiceSummaryController(PatientServiceSummary service){this.service=service;}
 @PostMapping("/summary") public ApiResponse<PatientServiceSummaryResponse> handle(@RequestBody @Valid ContinuousCareQueryRequest request){return ApiResponse.ok(service.summary(request));}
}
