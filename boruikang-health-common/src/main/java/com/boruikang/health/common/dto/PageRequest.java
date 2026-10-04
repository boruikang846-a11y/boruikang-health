package com.boruikang.health.common.dto;
import jakarta.validation.constraints.Min;
public record PageRequest(@Min(0) Integer page, @Min(1) Integer size) {}
