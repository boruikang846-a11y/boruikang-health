package com.boruikang.health.hospital.service;
import com.boruikang.health.common.Checks;
import com.boruikang.health.common.exception.BizException;
import com.boruikang.health.hospital.dto.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class MockHospitalGateway implements HospitalGateway {
    public static final String SOURCE="HOSPITAL_MOCK";
    private static final Logger log=LoggerFactory.getLogger(MockHospitalGateway.class);
    private final String mode;private final Environment environment;
    public MockHospitalGateway(@Value("${health.hospital.mode}") String mode,Environment environment){this.mode=mode;this.environment=environment;}
    public boolean mockEnabled(){return "MOCK".equals(mode)&&!environment.acceptsProfiles(Profiles.of("prod"));}
    public HospitalBatchResponse fetch(String scenario){
        log.info("fetch mock hospital batch scenario={}",scenario);
        Checks.conflict(mockEnabled());Checks.require(List.of("NORMAL","EMPTY","UNAVAILABLE").contains(scenario),"Unknown mock scenario");
        if("UNAVAILABLE".equals(scenario))throw new BizException("503000","模拟医院接口暂不可用，本次未导入数据");
        if("EMPTY".equals(scenario))return new HospitalBatchResponse(SOURCE,scenario,List.of());
        // Entirely fictional fixtures: no source images, real patient details or treatment instructions.
        var outpatient=new HospitalRecordResponse("MOCK-OP-001","OUTPATIENT",LocalDateTime.of(2026,9,24,10,0),
            "【虚构门诊记录】患者咨询院后服务；原记录未载明用药周期。团队需核对后续服务联系人，个案问题由责任医生判断。",null,null);
        var firstDischarge=new HospitalRecordResponse("MOCK-DC-001","DISCHARGE",LocalDateTime.of(2026,9,26,14,0),
            "【虚构出院报告】出院诊断：演示病种甲。原报告载明用药周期 14 天，具体用法以原医嘱为准。注意事项：记录恢复情况，汇总执行医嘱时遇到的问题。随访重点：核对原医嘱执行困难、复诊资料与安排。建议复诊日期 2026-10-03。本样例不构成诊疗建议。",14,LocalDate.of(2026,10,3));
        var secondDischarge=new HospitalRecordResponse("MOCK-DC-002","DISCHARGE",LocalDateTime.of(2026,9,27,9,0),
            "【虚构出院报告】出院诊断：演示病种乙。原记录未提供用药周期及复诊日期，不能据此推断。随访重点：确认患者是否理解原报告注意事项，整理需向责任医生咨询的问题。",null,null);
        return new HospitalBatchResponse(SOURCE,scenario,List.of(
            new HospitalPatientResponse("MOCK-P-001","模拟患者甲","FEMALE",58,"00000000001","全科","演示病种甲",List.of(outpatient,firstDischarge)),
            new HospitalPatientResponse("MOCK-P-002","模拟患者乙","MALE",64,"00000000002","全科","演示病种乙",List.of(secondDischarge))));
    }
}
