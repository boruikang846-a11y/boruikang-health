package com.bgssai.health.model;

import java.time.LocalDateTime;

/** Mutable persistence-only fields. API services always map these rows to dedicated DTOs. */
public abstract class BaseRow {
    public Long id;
    public Boolean delFlag;
    public String creator;
    public String modifier;
    public LocalDateTime gmtCreate;
    public LocalDateTime gmtModified;
}
