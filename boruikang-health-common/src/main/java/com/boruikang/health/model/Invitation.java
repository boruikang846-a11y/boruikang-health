package com.boruikang.health.model;
import java.time.LocalDateTime;
public class Invitation extends BaseRow {
    public Long hospitalId;
    public Long patientId;
    public Long screeningId;
    public Long campaignId;
    public Integer round;
    public LocalDateTime invitedAt;
    public String method;
    public String result;
    public String plannedVisitMode;
    public String summary;
    public LocalDateTime nextInviteAt;
    public Long actorId;
    public String evidence;
    public String requestKey;
}
