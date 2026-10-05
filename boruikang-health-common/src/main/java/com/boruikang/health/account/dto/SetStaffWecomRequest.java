package com.boruikang.health.account.dto;
import jakarta.validation.constraints.*;
/** An empty string clears the WeCom member id. */
public record SetStaffWecomRequest(@NotNull @Positive Long id,@NotNull @Pattern(regexp="|[A-Za-z0-9_.@-]{1,64}") String wecomUserId) {}
