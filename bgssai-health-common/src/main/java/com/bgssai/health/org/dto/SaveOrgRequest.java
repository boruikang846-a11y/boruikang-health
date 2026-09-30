package com.bgssai.health.org.dto;
import jakarta.validation.constraints.*;
public record SaveOrgRequest(@Positive Long id,@NotBlank @Size(max=120) String name,
    @NotBlank @Pattern(regexp="HOSPITAL|BRANCH|COMMUNITY|TOWNSHIP|VILLAGE|EXAM_CENTER|OTHER") String orgType,
    @Positive Long parentId,@Size(max=80) String contactName,@Size(max=24) String contactPhone,Boolean active,@Size(max=400) String note) {}
