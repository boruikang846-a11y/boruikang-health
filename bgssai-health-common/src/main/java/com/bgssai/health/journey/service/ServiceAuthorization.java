package com.bgssai.health.journey.service;
import com.bgssai.health.auth.service.CurrentAccount;
import com.bgssai.health.common.Checks;
import com.bgssai.health.mapper.ServiceConsentWithdrawalMapper;
import com.bgssai.health.model.*;
import org.springframework.stereotype.Service;
import java.util.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
@Service
public class ServiceAuthorization {
 private final ServiceConsentWithdrawalMapper withdrawals;
 public ServiceAuthorization(ServiceConsentWithdrawalMapper withdrawals){this.withdrawals=withdrawals;}
 private String key(Patient p){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest((Objects.toString(p.consentAt,"")+"\n"+Objects.toString(p.consentVersion,"")+"\n"+Objects.toString(p.consentEvidence,"")).getBytes(StandardCharsets.UTF_8)));}catch(Exception e){throw new IllegalStateException(e);}}
 public boolean withdrawn(Patient p){var ex=new ServiceConsentWithdrawalExample();ex.eq("hospital_id",p.hospitalId).eq("patient_id",p.id).eq("consent_key",key(p));return withdrawals.countByExample(ex)>0;}
 public boolean active(Patient p){return p.consentAt!=null&&!withdrawn(p);}
 public void withdraw(Patient p,String evidence){Checks.require(p.consentAt!=null,"没有可撤回的服务授权");if(withdrawn(p))return;var row=new ServiceConsentWithdrawal();row.hospitalId=p.hospitalId;row.patientId=p.id;row.consentKey=key(p);row.evidence=evidence;row.actorId=CurrentAccount.get().userId();row.creator=row.actorId.toString();withdrawals.insertSelective(row);}
}
