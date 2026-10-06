package com.boruikang.health.task.dto;
import com.boruikang.health.record.dto.RecordResponse;
import com.boruikang.health.message.dto.MessageResponse;
import java.util.List;
public record TaskContextResponse(TaskResponse task,RecordResponse record,List<MessageResponse> messages,List<ContactAttemptResponse> attempts) {}
