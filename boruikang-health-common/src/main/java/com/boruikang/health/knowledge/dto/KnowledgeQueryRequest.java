package com.boruikang.health.knowledge.dto;
import jakarta.validation.constraints.*;
public record KnowledgeQueryRequest(@Min(0) Integer page,@Min(1) Integer size,@Pattern(regexp="SOP|EDUCATION|PACKAGE") String kind,
    @Size(max=80) String keyword,@Pattern(regexp="DRAFT|PUBLISHED") String status) {}
