package com.boruikang.health.template.dto;
public record TemplateResponse(Long id,String code,String channel,String scene,String title,String content,Boolean active,Integer version,String externalTemplateId) {}
