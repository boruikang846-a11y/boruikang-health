package com.boruikang.health.appointment.dto;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
public record TransitionAppointmentRequest(@NotNull @Positive Long id,@NotNull @Min(0) Integer version,
    @NotBlank @Pattern(regexp="REMIND|ARRIVE|NO_SHOW|CANCEL|COMPLETE") String action,@PastOrPresent LocalDateTime at,Boolean effective,
    @Pattern(regexp="DISTANCE|COST|NO_SLOT|FORGOT|EXTERNAL_HOSPITAL|REFUSED|ILLNESS|OTHER") String noShowReason,
    @Pattern(regexp="OUTPATIENT_TREATED|EXAM_ORDERED|ADMITTED|REFERRED|NO_ACTION|OTHER") String outcome,@Size(max=1000) String outcomeNote,@Size(max=1000) String evidence) {}
