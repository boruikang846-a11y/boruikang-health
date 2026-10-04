package com.boruikang.health.task.dto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
import java.util.List;
public record ScheduleFollowupsRequest(@NotNull @Positive Long patientId,@NotNull @Positive Long recordId,
    @NotBlank @Size(max=60) String requestKey,@NotEmpty @Size(max=12) List<@Valid Node> nodes) {
    public record Node(@NotBlank @Pattern(regexp="ENROLLMENT|D3|D7|D30|M3|Y1|CUSTOM") String stage,
        @NotBlank @Size(max=160) String title,@NotNull LocalDateTime dueAt) {}
}
