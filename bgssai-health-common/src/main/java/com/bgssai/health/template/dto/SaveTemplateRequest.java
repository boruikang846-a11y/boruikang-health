package com.bgssai.health.template.dto;
import jakarta.validation.constraints.*;
public record SaveTemplateRequest(@Positive Long id,@Min(0) Integer version,@NotBlank @Pattern(regexp="[A-Z0-9_-]{2,40}") String code,@NotBlank @Pattern(regexp="SMS|SCRIPT|WECHAT") String channel,
    @NotBlank @Pattern(regexp="FIRST_CONTACT|HIGH_RISK|URGENT|FAMILY|ARRIVAL_REMINDER|FOLLOWUP_REMINDER|REVISIT_REMINDER|NO_SHOW|HESITANT|REFUSED|COMPLAINT|OTHER") String scene,
    @NotBlank @Size(max=120) String title,@NotBlank @Size(max=4000) String content,Boolean active) {}
