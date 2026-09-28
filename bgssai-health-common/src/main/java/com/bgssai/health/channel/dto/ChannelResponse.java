package com.bgssai.health.channel.dto;
public record ChannelResponse(Long id,String title,String source,String department,Long doctorId,Long ownerId,String token,Boolean active,String enrollmentUrl) {}
