package com.boruikang.health.org.dto;
public record OrgResponse(Long id,String name,String orgType,Long parentId,String contactName,String contactPhone,Boolean active,String note) {}
