package com.bgssai.health.mapper;
import com.bgssai.health.model.AuditEvent;
import com.bgssai.health.model.ExampleBase;
import java.util.List;
/** Append-only persistence contract: no update or delete operations. */
public interface AuditEventMapper {
    List<AuditEvent> selectByExample(ExampleBase example);
    long countByExample(ExampleBase example);
    int insertSelective(AuditEvent row);
}
