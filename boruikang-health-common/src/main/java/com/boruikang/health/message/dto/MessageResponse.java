package com.boruikang.health.message.dto;
import java.time.LocalDateTime;
public record MessageResponse(Long id,Long taskId,String direction,String content,LocalDateTime gmtCreate) {}
