package com.bgssai.health.template.dto;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
/** Manual registration of a message the team already sent through an external channel; the system sends nothing. */
public record LogMessageRequest(@NotNull @Positive Long patientId,@Positive Long taskId,@NotBlank @Pattern(regexp="SMS|WECHAT|PHONE_NOTE") String channel,@Size(max=40) String templateCode,
    @NotBlank @Size(max=4000) String content,@NotNull @PastOrPresent LocalDateTime sentAt,@NotBlank @Size(max=1000) String evidence,@NotBlank @Pattern(regexp="[a-zA-Z0-9-]{1,80}") String requestKey) {}
