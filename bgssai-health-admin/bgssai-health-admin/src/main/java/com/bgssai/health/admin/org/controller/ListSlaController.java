package com.bgssai.health.admin.org.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.org.service.OrgService;
import com.bgssai.health.org.dto.SlaResponse;
import java.util.List;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin")
@NeedAop
public class ListSlaController {
    private final OrgService service;
    public ListSlaController(OrgService service) { this.service=service; }
    @GetMapping("/sla")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<List<SlaResponse>> handle() { return ApiResponse.ok(service.slas()); }
}
