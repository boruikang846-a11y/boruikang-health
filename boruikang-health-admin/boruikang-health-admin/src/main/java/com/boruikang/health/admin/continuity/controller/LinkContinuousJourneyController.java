package com.boruikang.health.admin.continuity.controller;
import com.boruikang.health.common.*;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.continuity.dto.*;
import com.boruikang.health.continuity.service.ContinuousCareService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/boruikang/admin/continuity") @NeedAop
public class LinkContinuousJourneyController {
 private final ContinuousCareService service;
 public LinkContinuousJourneyController(ContinuousCareService service){this.service=service;}
 @PostMapping("/link") public ApiResponse<ContinuousCareResponse> handle(@RequestBody @Valid LinkContinuousJourneyRequest request){return ApiResponse.ok(service.link(request));}
}
