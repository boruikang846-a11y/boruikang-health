package com.boruikang.health.admin.continuity.controller;
import com.boruikang.health.common.*;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.continuity.dto.*;
import com.boruikang.health.continuity.service.ContinuousCareService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/boruikang/admin/continuity") @NeedAop
public class QueryContinuousCareController {
 private final ContinuousCareService service;
 public QueryContinuousCareController(ContinuousCareService service){this.service=service;}
 @PostMapping("/query") public ApiResponse<java.util.List<ContinuousCareResponse>> handle(@RequestBody @Valid ContinuousCareQueryRequest request){return ApiResponse.ok(service.query(request));}
}
