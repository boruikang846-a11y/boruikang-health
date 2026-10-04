package com.boruikang.health.org.service;
import com.boruikang.health.auth.service.CurrentAccount;
import com.boruikang.health.mapper.SlaConfigMapper;
import com.boruikang.health.model.*;
import com.github.pagehelper.PageHelper;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;
/** Effective SLA per risk level; defaults apply when the hospital has not configured a row. Kept dependency-free so any service can use it. */
@Service
public class SlaResolver {
    public static final List<String> RISKS=List.of("UNKNOWN","LOW","MEDIUM","HIGH","CRITICAL");
    private final SlaConfigMapper slas;
    public SlaResolver(SlaConfigMapper slas){this.slas=slas;}
    public SlaConfig resolve(String riskLevel){
        String risk=RISKS.contains(riskLevel)?riskLevel:"UNKNOWN";
        SlaConfigExample ex=new SlaConfigExample();ex.eq("hospital_id",CurrentAccount.get().hospitalId()).eq("risk_level",risk);PageHelper.startPage(1,1,false);
        List<SlaConfig> rows=slas.selectByExample(ex);return rows.isEmpty()?defaults(risk):rows.getFirst();
    }
    public LocalDateTime firstContactDue(String riskLevel,LocalDateTime from){return from.plusHours(resolve(riskLevel).firstContactHours);}
    public static String priorityFor(String riskLevel){return switch(riskLevel==null?"":riskLevel){case "CRITICAL"->"P0";case "HIGH"->"P1";case "MEDIUM"->"P2";default->"P3";};}
    public static SlaConfig defaults(String risk){
        SlaConfig row=new SlaConfig();row.riskLevel=risk;row.lostAfterAttempts=3;row.version=0;
        switch(risk){
            case "CRITICAL"->{row.firstContactHours=2;row.bookingDays=1;row.arrivalDays=1;}
            case "HIGH"->{row.firstContactHours=24;row.bookingDays=3;row.arrivalDays=7;}
            case "MEDIUM"->{row.firstContactHours=72;row.bookingDays=7;row.arrivalDays=30;}
            default->{row.firstContactHours=168;row.bookingDays=30;row.arrivalDays=90;}
        }
        row.note="默认口径，未经医院配置";return row;
    }
}
