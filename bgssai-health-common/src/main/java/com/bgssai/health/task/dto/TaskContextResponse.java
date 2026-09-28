package com.bgssai.health.task.dto;
import com.bgssai.health.record.dto.RecordResponse;
import com.bgssai.health.message.dto.MessageResponse;
import java.util.List;
public record TaskContextResponse(TaskResponse task,RecordResponse record,List<MessageResponse> messages) {}
