package com.boruikang.health.admin;

import com.boruikang.health.auth.dto.AccountInfo;
import com.boruikang.health.auth.service.CurrentAccount;
import com.boruikang.health.common.exception.BizException;
import com.boruikang.health.screening.dto.*;
import com.boruikang.health.screening.service.ScreeningService;
import java.time.LocalDate;
import java.time.LocalDateTime;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:screening-center;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1","logging.level.root=WARN"})
@Transactional
class ScreeningCenterTest {
    @Autowired ScreeningService service;
    @Autowired com.boruikang.health.mapper.AuditEventMapper audits;
    private static final LocalDate DAY=LocalDate.of(2026,10,10);
    @BeforeEach void setup(){actor(1L,"MANAGER",1L);}
    @AfterEach void cleanup(){CurrentAccount.clear();}
    private void actor(Long id,String role,Long hospital){CurrentAccount.set(new AccountInfo(id,"Test",role,hospital));}
    private ScreeningResponse create(String source,Long owner,String category,LocalDateTime at){
        return service.create(new CreateScreeningRequest(source,"中心统计虚构对象","FEMALE",60,"00000001234","1234",at,"虚构检查结果",category,null,null,owner,null,null));
    }
    private ScreeningQueryRequest query(String source,String phone,String tail,String category,Boolean high,String family,LocalDate from,LocalDate to){
        return new ScreeningQueryRequest(0,100,"中心统计虚构对象",source,null,null,null,null,null,from,to,null,phone,tail,category,high,family,null);
    }
    @Test void scopedStatisticsMatchListsAndSourceRiskPartitions(){
        var high=create("ECG_NETWORK",3L,"房颤",DAY.atTime(0,0));
        service.judge(new JudgeScreeningRequest(high.id(),high.version(),"HIGH_RISK","CRITICAL","虚构院方复核依据",null,null,null,"CRITICAL","REST_12_LEAD","演示报告 ECG-20261010；院方审核人；已核实原报告分级"));
        create("EXAM",6L,"冠心病",DAY.atTime(23,59));
        create("HEALTH_SCREENING",3L,"健康问卷",DAY.plusDays(1).atStartOfDay());
        var q=query(null,null,null,null,null,null,DAY,DAY);
        var stats=service.statistics(q);
        assertEquals(2,stats.total());assertEquals(service.query(q).totalSize(),stats.total());
        assertEquals(1,stats.critical());assertEquals(1,stats.highRisk());assertEquals(1,stats.pending());
        assertEquals(stats.total(),stats.sources().values().stream().mapToLong(Long::longValue).sum());
        assertEquals(stats.total(),stats.risks().values().stream().mapToLong(Long::longValue).sum());
        actor(3L,"OPERATOR",1L);assertEquals(1,service.statistics(q).total());assertEquals(1,service.query(q).totalSize());
        actor(6L,"NURSE",1L);assertEquals(1,service.statistics(q).total());assertEquals(0,service.statistics(q).critical());
        actor(1L,"MANAGER",999L);assertEquals(0,service.statistics(q).total());assertEquals(0,service.query(q).totalSize());
    }
    @Test void exactCategoryTailAndPhoneFiltersCombineWithFixedSource(){
        create("ECG_NETWORK",3L,"房颤",DAY.atStartOfDay());create("EXAM",3L,"冠心病",DAY.atStartOfDay());
        assertEquals(1,service.query(query("ECG_NETWORK","1234","1234","房颤",null,"ARRHYTHMIA",null,null)).totalSize());
        assertEquals(0,service.query(query("ECG_NETWORK","1234","9999",null,null,null,null,null)).totalSize());
        assertEquals(0,service.query(query("EXAM",null,null,null,null,"ARRHYTHMIA",null,null)).totalSize());
        assertEquals(1,service.query(query("EXAM",null,null,null,null,"CORONARY",null,null)).totalSize());
    }
    @Test void criticalAndHighRiskExcludeDiscardedRecordsAndPermissionsStayIntact(){
        var row=create("EXAM",3L,"房颤",DAY.atStartOfDay());
        row=service.judge(new JudgeScreeningRequest(row.id(),row.version(),"HIGH_RISK","HIGH","虚构院方依据",null,null,null));
        assertEquals(1,service.query(query(null,null,null,null,true,null,null,null)).totalSize());
        service.judge(new JudgeScreeningRequest(row.id(),row.version(),"DISCARDED",null,null,null,null,"误录作废"));
        assertEquals(0,service.statistics(query(null,null,null,null,null,null,null,null)).highRisk());
        assertEquals(0,service.query(query(null,null,null,null,true,null,null,null)).totalSize());
        var q=query(null,null,null,null,null,null,null,null);
        actor(2L,"DOCTOR",1L);assertThrows(BizException.class,()->service.statistics(q));
        actor(4L,"PLATFORM_ADMIN",1L);assertThrows(BizException.class,()->service.query(q));
        actor(1L,"MANAGER",1L);assertThrows(BizException.class,()->service.statistics(query(null,null,null,null,null,null,DAY.plusDays(1),DAY)));
    }
    @Test void reportGradeRequiresEvidenceStaysSeparateFromRiskAndKeepsAuditHistory(){
        var row=create("ECG_NETWORK",3L,"房颤",DAY.atStartOfDay());
        row=service.judge(new JudgeScreeningRequest(row.id(),row.version(),"HIGH_RISK","CRITICAL","院方患者风险依据",null,null,null));
        assertNull(row.ecgGrade()); // Existing critical patient risk is not a confirmed ECG report grade.
        assertEquals(0,service.statistics(query(null,null,null,null,null,null,null,null)).critical());
        final var ungraded=row;
        assertThrows(BizException.class,()->service.judge(new JudgeScreeningRequest(ungraded.id(),ungraded.version(),"HIGH_RISK","CRITICAL","依据",null,null,null,"NORMAL","REST_12_LEAD"," ")));
        String evidence="虚构报告原文及院方审核依据".repeat(60);
        row=service.judge(new JudgeScreeningRequest(row.id(),row.version(),"HIGH_RISK","CRITICAL","院方患者风险依据",null,null,null,"WARNING","REST_12_LEAD",evidence));
        assertEquals("WARNING",row.ecgGrade());assertEquals("CRITICAL",row.riskLevel());
        var ex=new com.boruikang.health.model.AuditEventExample();ex.eq("resource_id",row.id()).eq("action","SCREENING_ECG_GRADE_RECORDED");ex.setOrderByClause("id ASC");
        var history=audits.selectByExample(ex);
        assertEquals(evidence,history.stream().map(x->x.detail.substring(x.detail.indexOf("evidence=")+9)).collect(java.util.stream.Collectors.joining()));
        assertTrue(history.stream().allMatch(x->x.detail.length()<=500));
        row=service.judge(new JudgeScreeningRequest(row.id(),row.version(),"HIGH_RISK","CRITICAL","院方患者风险依据",null,null,null,"CRITICAL","REST_12_LEAD","更新报告核实为危急，虚构演示依据"));
        var critical=new ScreeningQueryRequest(0,100,"中心统计虚构对象",null,null,null,null,null,null,null,null,null,null,null,null,null,null,"CRITICAL");
        assertEquals(1,service.query(critical).totalSize());
        service.judge(new JudgeScreeningRequest(row.id(),row.version(),"DISCARDED",null,null,null,null,"误录作废"));
        assertEquals(0,service.query(critical).totalSize());
        assertEquals(0,service.statistics(query(null,null,null,null,null,null,null,null)).critical());
        assertEquals(history.size()+1,audits.selectByExample(ex).size());
    }
}
