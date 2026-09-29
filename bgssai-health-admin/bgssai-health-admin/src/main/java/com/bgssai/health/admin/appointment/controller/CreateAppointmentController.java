package com.bgssai.health.admin.appointment.controller;
import com.bgssai.health.common.ApiResponse;
import com.bgssai.health.common.aop.NeedAop;
import com.bgssai.health.common.ratelimit.RateLimit;
import com.bgssai.health.appointment.service.AppointmentService;
import com.bgssai.health.appointment.dto.*;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/bgssai/admin/appointments")
@NeedAop
public class CreateAppointmentController {
    private final AppointmentService service;
    public CreateAppointmentController(AppointmentService service) { this.service=service; }
    @PostMapping("/create")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<AppointmentResponse> handle(@RequestBody @Valid CreateAppointmentRequest request) { return ApiResponse.ok(service.create(request)); }
}
