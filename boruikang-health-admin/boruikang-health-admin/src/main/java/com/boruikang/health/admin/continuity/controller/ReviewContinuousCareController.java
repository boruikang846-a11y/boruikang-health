package com.boruikang.health.admin.continuity.controller;
import com.boruikang.health.common.*;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.continuity.dto.*;
import com.boruikang.health.continuity.service.ContinuousCareService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/boruikang/admin/continuity") @NeedAop
public class ReviewContinuousCareController {
 private final ContinuousCareService service;
 public ReviewContinuousCareController(ContinuousCareService service){this.service=service;}
 @PostMapping("/review") public ApiResponse<ContinuousCareResponse> handle(@RequestBody @Valid ReviewContinuousCareRequest request){return ApiResponse.ok(service.review(request));}
}
