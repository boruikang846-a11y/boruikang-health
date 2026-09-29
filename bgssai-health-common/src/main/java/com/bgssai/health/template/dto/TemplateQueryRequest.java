package com.bgssai.health.template.dto;
import jakarta.validation.constraints.*;
public record TemplateQueryRequest(@Min(0) Integer page,@Min(1) Integer size,@Pattern(regexp="SMS|SCRIPT|WECHAT") String channel,
    @Pattern(regexp="FIRST_CONTACT|HIGH_RISK|URGENT|FAMILY|ARRIVAL_REMINDER|FOLLOWUP_REMINDER|REVISIT_REMINDER|NO_SHOW|HESITANT|REFUSED|COMPLAINT|OTHER") String scene,Boolean active,@Size(max=80) String keyword) {}
