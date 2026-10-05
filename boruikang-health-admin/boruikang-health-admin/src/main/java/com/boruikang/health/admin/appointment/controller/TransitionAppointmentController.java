package com.boruikang.health.admin.appointment.controller;
import com.boruikang.health.common.ApiResponse;
import com.boruikang.health.common.aop.NeedAop;
import com.boruikang.health.common.ratelimit.RateLimit;
import com.boruikang.health.appointment.service.AppointmentService;
import com.boruikang.health.appointment.dto.*;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/boruikang/admin/appointments")
@NeedAop
public class TransitionAppointmentController {
    private final AppointmentService service;
    public TransitionAppointmentController(AppointmentService service) { this.service=service; }
    @PostMapping("/transition")
    @RateLimit(capacity=120,refillPerMinute=120)
    public ApiResponse<AppointmentResponse> handle(@RequestBody @Valid TransitionAppointmentRequest request) { return ApiResponse.ok(service.transition(request)); }
}
