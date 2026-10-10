package com.boruikang.health.admin.intervention.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.intervention.dto.*;
import com.boruikang.health.intervention.service.InterventionService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/boruikang/admin/interventions") @NeedAop
public class GetInterventionController {
 private final InterventionService service;
 public GetInterventionController(InterventionService service){this.service=service;}
 @PostMapping("/get") @RateLimit(capacity=120,refillPerMinute=120)
 public ApiResponse<InterventionResponse> handle(@RequestBody @Valid GetInterventionRequest request){return ApiResponse.ok(service.get(request));}
}
