package com.boruikang.health.admin.continuity.controller;
import com.boruikang.health.common.*;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.continuity.dto.*;
import com.boruikang.health.continuity.service.ContinuousCareService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/boruikang/admin/continuity") @NeedAop
public class ApproveContinuousCareController {
 private final ContinuousCareService service;
 public ApproveContinuousCareController(ContinuousCareService service){this.service=service;}
 @PostMapping("/approve") public ApiResponse<ContinuousCareResponse> handle(@RequestBody @Valid ApproveContinuousCareRequest request){return ApiResponse.ok(service.approve(request));}
}
