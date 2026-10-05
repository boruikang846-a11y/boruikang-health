package com.boruikang.health.model;
import java.time.LocalDateTime;
public class JourneyCommand extends BaseRow {
    public Long hospitalId;
    public Long journeyId;
    public String requestId;
    public Long actorId;
    public String payloadHash;
    public String responseJson;
}
