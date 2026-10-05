package com.bgssai.health.journey.service;
import com.bgssai.health.common.Checks;
import com.bgssai.health.mapper.*;
import com.bgssai.health.model.*;
import com.bgssai.health.patient.service.PatientAccess;
import org.springframework.stereotype.Service;
import java.util.Objects;
/** Invoked before advice generation and again under the patient transaction lock. */
@Service
public class JourneyExecutionGuard {
 private final ServiceAuthorization authorization;
 private final JourneyTaskLinkMapper links;private final ServiceJourneyMapper journeys;private final JourneyPlanMapper plans;private final PatientAccess access;
 public JourneyExecutionGuard(JourneyTaskLinkMapper links,ServiceJourneyMapper journeys,JourneyPlanMapper plans,PatientAccess access,ServiceAuthorization authorization){this.authorization=authorization;this.links=links;this.journeys=journeys;this.plans=plans;this.access=access;}
 public void check(CareTask task){
  if(task==null||task.id==null)return;
  if(!"COMPLETED".equals(task.status)&&java.util.List.of("FOLLOWUP","CONSULTATION").contains(task.taskType))Checks.require(!authorization.withdrawn(access.require(task.patientId)),"患者已撤回服务授权，停止随访与咨询执行");
  JourneyTaskLinkExample ex=new JourneyTaskLinkExample();ex.eq("task_id",task.id);var rows=links.selectByExample(ex);if(rows.isEmpty())return;
  // Completed-result receipt stays available while safety issues or an exit are processed.
  if("COMPLETED".equals(task.status))return;
  var link=rows.getFirst();var j=journeys.selectByPrimaryKey(link.journeyId);var plan=plans.selectByPrimaryKey(link.planId);var p=access.require(task.patientId);
  Checks.require(j!=null&&"ACTIVE".equals(j.status)&&Objects.equals(j.currentPlanId,link.planId)&&plan!=null&&"APPROVED".equals(plan.status),"旅程已暂停、退出或计划版本已替代，停止该节点执行");
  Checks.require(authorization.active(p)&&!java.util.List.of("PAUSED","CLOSED").contains(p.lifecycle)&&Objects.equals(j.ownerId,p.ownerId)&&Objects.equals(task.assigneeId,p.ownerId),"服务授权或交接已变化，请核验后再执行");
  Checks.require(Objects.equals(plan.reviewerId,p.doctorId)&&Objects.equals(task.doctorId,p.doctorId),"当前责任医生尚未审核此计划版本");
 }
}
