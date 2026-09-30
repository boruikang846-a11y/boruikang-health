package com.bgssai.health.account.dto;
import java.time.LocalDateTime;
/** Staff account as shown to the operations manager; never carries the password or session. */
public record StaffAccountResponse(Long id,String username,String realName,String roleCode,String department,Boolean enabled,LocalDateTime gmtCreate) {}
