package com.boruikang.health.channel.dto;
import jakarta.validation.constraints.*;
public record CreateChannelRequest(@NotBlank @Size(max=120) String title,@NotBlank @Pattern(regexp="PRIMARY_CARE|EXAM|OUTPATIENT|DISCHARGE|CAMPAIGN") String source,
    @NotBlank @Size(max=80) String department,@NotNull @Positive Long doctorId,@NotNull @Positive Long ownerId) {}
