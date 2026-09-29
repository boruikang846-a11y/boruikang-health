package com.bgssai.health.plan.dto;
import jakarta.validation.constraints.*;
public record PlanNodeDto(@NotNull @Min(1) @Max(60) Integer seq,@NotBlank @Pattern(regexp="ENROLLMENT|D3|D7|D30|M3|M6|Y1|CUSTOM") String stage,
    @NotNull @Min(0) @Max(1095) Integer offsetDays,@NotBlank @Pattern(regexp="FOLLOWUP|REVISIT") String taskType,@NotBlank @Size(max=160) String title,
    @NotBlank @Pattern(regexp="P0|P1|P2|P3") String priority,@Size(max=2000) String checklist) {}
