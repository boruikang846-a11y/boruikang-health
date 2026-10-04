package com.boruikang.health.wechat.dto;
import jakarta.validation.constraints.*;
/** APPROVED_ADVICE takes its text from the task; content is ignored for that kind. */
public record SendWechatMessageRequest(@NotNull @Positive Long contactId,@NotBlank @Pattern(regexp="TEXT|TEMPLATE|APPROVED_ADVICE") String kind,@Size(max=6000) String content,
    @Size(max=40) String templateCode,@Positive Long taskId,@NotBlank @Pattern(regexp="[a-zA-Z0-9-]{1,80}") String requestKey) {}
