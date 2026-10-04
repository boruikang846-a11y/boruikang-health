package com.boruikang.health.admin.org.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.org.service.OrgService;
import com.boruikang.health.org.dto.OrgResponse;
import java.util.List;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin")
@NeedAop
public class ListOrgsController {
    private final OrgService service;
    public ListOrgsController(OrgService service) { this.service=service; }
    @GetMapping("/orgs")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<List<OrgResponse>> handle() { return ApiResponse.ok(service.orgs()); }
}
