package com.boruikang.health.journey.service;

import com.boruikang.health.audit.service.AuditService;
import com.boruikang.health.auth.service.CurrentAccount;
import com.boruikang.health.common.*;
import com.boruikang.health.journey.dto.*;
import com.boruikang.health.mapper.*;
import com.boruikang.health.model.*;
import com.boruikang.health.patient.service.*;
import com.boruikang.health.plan.dto.PlanNodeDto;
import com.boruikang.health.plan.service.PlanService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.github.pagehelper.PageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Consumer;

/** Event-scoped service workflow. Clinical review and actual arrival remain independent evidence. */
@Service
public class JourneyService {
 private final ServiceAuthorization authorization;
 private final ServiceJourneyMapper journeys; private final JourneyResultMapper results; private final JourneyCommandMapper commands;
 private final JourneyPlanMapper plans; private final JourneyTaskLinkMapper links; private final JourneyCaseMapper cases;
 private final CareRecordMapper records; private final CareTaskMapper tasks; private final AppointmentMapper appointments;
 private final PatientAccess access; private final AuditService audit; private final PlanService templates; private final ObjectMapper json;
 public JourneyService(ServiceJourneyMapper journeys,JourneyResultMapper results,JourneyCommandMapper commands,JourneyPlanMapper plans,JourneyTaskLinkMapper links,JourneyCaseMapper cases,CareRecordMapper records,CareTaskMapper tasks,AppointmentMapper appointments,PatientAccess access,AuditService audit,PlanService templates,ObjectMapper json,ServiceAuthorization authorization) {
  this.authorization=authorization;this.journeys=journeys;this.results=results;this.commands=commands;this.plans=plans;this.links=links;this.cases=cases;this.records=records;this.tasks=tasks;this.appointments=appointments;this.access=access;this.audit=audit;this.templates=templates;this.json=json;
 }
 private static final List<JourneyResponse.Step> OUTPATIENT=List.of(s("HANDOFF","接入与服务交接","OWNER"),s("CONSULT","咨询与预约协助","OPERATIONS"),s("ARRIVAL","实际到院核验","OPERATIONS"),s("IN_HOSPITAL","院内检查与流程协助","OPERATIONS"),s("CLINICAL","门诊结束与医嘱核对","DOCTOR"),s("PLAN","诊后个案计划审核","DOCTOR"),s("FOLLOWUP","随访执行与医生反馈","OPERATIONS"),s("CLOSE","复诊结果与服务结案","OPERATIONS"));
 private static final List<JourneyResponse.Step> DISCHARGE=List.of(s("HANDOFF","接入与服务交接","OWNER"),s("IN_HOSPITAL","住院服务及问题协调","OPERATIONS"),s("CLINICAL","出院小结与医嘱核对","DOCTOR"),s("DISCHARGE_HANDOFF","出院准备及管家交接","OWNER"),s("PLAN","出院个案计划审核","DOCTOR"),s("FOLLOWUP","居家随访与医生反馈","OPERATIONS"),s("CLOSE","复诊结果与服务结案","OPERATIONS"));
 private static JourneyResponse.Step s(String code,String title,String role){return new JourneyResponse.Step(code,title,role);}
 private List<JourneyResponse.Step> path(ServiceJourney j){return "OUTPATIENT".equals(j.kind)?OUTPATIENT:DISCHARGE;}
 private String current(ServiceJourney j){return j.stage<path(j).size()?path(j).get(j.stage).code():"DONE";}
 private int index(ServiceJourney j,String code){for(int i=0;i<path(j).size();i++)if(path(j).get(i).code().equals(code))return i;throw new IllegalArgumentException("Unknown step");}
 public Paged<JourneyResponse> query(JourneyQueryRequest req){
  access.staff();ServiceJourneyExample ex=new ServiceJourneyExample();ex.eq("hospital_id",CurrentAccount.get().hospitalId());
  if(req.patientId()!=null){access.require(req.patientId());ex.eq("patient_id",req.patientId());}
  if(req.kind()!=null)ex.eq("kind",req.kind());if(req.status()!=null)ex.eq("status",req.status());
  PageHelper.startPage(Paged.number(req.page()),Paged.size(req.size()));List<ServiceJourney> rows=journeys.selectScopedByExample(ex,access.scope());
  // Page metadata must be captured before detail subqueries use PageHelper.
  var page=(com.github.pagehelper.Page<ServiceJourney>)rows;
  return new Paged<>(rows.stream().map(this::view).toList(),page.getPageNum(),page.getPageSize(),page.getTotal());
 }

 public Paged<JourneyCaseResponse> casesQuery(JourneyCaseQueryRequest req){
  access.staff();JourneyCaseExample ex=new JourneyCaseExample();ex.eq("hospital_id",CurrentAccount.get().hospitalId());
  if(req.patientId()!=null){access.require(req.patientId());ex.eq("patient_id",req.patientId());}
  if(req.kind()!=null)ex.eq("kind",req.kind());if(req.status()!=null)ex.eq("status",req.status());if(Boolean.TRUE.equals(req.overdue()))ex.lt("due_at",LocalDateTime.now()).ne("status","CLOSED");ex.setOrderByClause("due_at ASC,id ASC");
  PageHelper.startPage(Paged.number(req.page()),Paged.size(req.size()));var rows=cases.selectScopedByExample(ex,access.scope());return Paged.of(rows,c->new JourneyCaseResponse(c.id,c.journeyId,c.patientId,PatientService.maskName(access.require(c.patientId).name),c.kind,c.status,c.summary,c.dueAt,!"CLOSED".equals(c.status)&&c.dueAt.isBefore(LocalDateTime.now())));
 }
 public JourneySummaryResponse summary(JourneySummaryRequest req){
  access.staff();if(req.patientId()!=null)access.require(req.patientId());var scope=access.scope();ServiceJourneyExample active=new ServiceJourneyExample();active.eq("hospital_id",CurrentAccount.get().hospitalId()).eq("status","ACTIVE");ServiceJourneyExample handoff=new ServiceJourneyExample();handoff.eq("hospital_id",CurrentAccount.get().hospitalId()).eq("status","INTAKE");JourneyPlanExample pending=new JourneyPlanExample();pending.eq("hospital_id",CurrentAccount.get().hospitalId()).eq("status","DRAFT");JourneyCaseExample open=new JourneyCaseExample();open.eq("hospital_id",CurrentAccount.get().hospitalId()).ne("status","CLOSED");
  if(req.patientId()!=null){active.eq("patient_id",req.patientId());handoff.eq("patient_id",req.patientId());pending.eq("patient_id",req.patientId());open.eq("patient_id",req.patientId());}
  long activeCount=journeys.countScopedByExample(active,scope),handoffCount=journeys.countScopedByExample(handoff,scope),pendingCount=plans.countScopedByExample(pending,scope),openCount=cases.countScopedByExample(open,scope);open.lt("due_at",LocalDateTime.now());return new JourneySummaryResponse(activeCount,handoffCount,pendingCount,openCount,cases.countScopedByExample(open,scope));
 }
 public JourneyResponse detail(JourneyDetailRequest req){access.staff();return view(require(req.id()));}
 private ServiceJourney require(Long id){var j=journeys.selectByPrimaryKey(id);Checks.found(j!=null&&CurrentAccount.get().hospitalId().equals(j.hospitalId));access.require(j.patientId);return j;}
 private ServiceJourney lock(Long id){access.staff();ServiceJourney old=require(id);access.lock(old.patientId);ServiceJourneyExample ex=new ServiceJourneyExample();ex.eq("id",id).eq("hospital_id",old.hospitalId);ex.setForUpdate(true);var rows=journeys.selectByExample(ex);Checks.found(!rows.isEmpty());return rows.getFirst();}
 private void active(ServiceJourney j){Checks.conflict("ACTIVE".equals(j.status));Patient p=access.require(j.patientId);Checks.require(authorization.active(p)&&!List.of("PAUSED","CLOSED").contains(p.lifecycle),"服务授权无效或患者服务已暂停");Checks.require(Objects.equals(j.ownerId,p.ownerId),"负责人已变化，请重新完成交接");}
 private void version(ServiceJourney j,Integer version){Checks.conflict(Objects.equals(j.version,version));Checks.conflict(!List.of("CLOSED","EXITED").contains(j.status));}
 private String encoded(Object value){try{return json.writeValueAsString(value);}catch(Exception e){throw new IllegalStateException("Cannot serialize workflow",e);}}
 private String fingerprint(String action,Object body){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest((action+"\n"+encoded(body)).getBytes(StandardCharsets.UTF_8)));}catch(Exception e){throw new IllegalStateException(e);}}
 private JourneyResponse replay(String action,String requestId,Object body){
  JourneyCommandExample ex=new JourneyCommandExample();ex.eq("hospital_id",CurrentAccount.get().hospitalId()).eq("request_id",requestId);var rows=commands.selectByExample(ex);if(rows.isEmpty())return null;
  var old=rows.getFirst();require(old.journeyId);Checks.conflict(Objects.equals(old.actorId,CurrentAccount.get().userId())&&old.payloadHash.equals(fingerprint(action,body)));
  try{return json.readValue(old.responseJson,JourneyResponse.class);}catch(Exception e){throw new IllegalStateException("Cannot read saved result",e);}
 }
 private JourneyResponse record(ServiceJourney j,String action,String requestId,Object body,String evidence,String step,LocalDateTime at,Long ref,String refType){
  JourneyResult row=new JourneyResult();row.hospitalId=j.hospitalId;row.patientId=j.patientId;row.journeyId=j.id;row.requestId=requestId;row.actorId=CurrentAccount.get().userId();row.action=action;row.stepCode=step;row.evidence=evidence;row.occurredAt=at;row.referenceId=ref;row.referenceType=refType;row.payloadHash=fingerprint(action,body);row.creator=row.actorId.toString();results.insertSelective(row);
  audit.append(j.patientId,"JOURNEY_"+action,j.id,null,j.status,"version="+j.version+"; step="+step);
  JourneyResponse response=view(j);JourneyCommand saved=new JourneyCommand();saved.hospitalId=j.hospitalId;saved.journeyId=j.id;saved.requestId=requestId;saved.actorId=row.actorId;saved.payloadHash=row.payloadHash;saved.responseJson=encoded(response);saved.creator=row.creator;commands.insertSelective(saved);return response;
 }
 private void save(ServiceJourney j,Consumer<ServiceJourney> change){
  int before=j.version;change.accept(j);j.version=before+1;j.modifier=CurrentAccount.get().userId().toString();ServiceJourneyExample ex=new ServiceJourneyExample();ex.eq("id",j.id).eq("hospital_id",j.hospitalId).eq("version",before);Checks.conflict(journeys.updateByExampleSelective(j,ex)==1);
 }
 @Transactional
 public JourneyResponse create(CreateJourneyRequest req){
  access.operations();Patient p=access.lock(req.patientId());JourneyResponse retry=replay("CREATED",req.requestId(),req);if(retry!=null)return retry;
  Checks.require(authorization.active(p)&&p.ownerId!=null&&p.doctorId!=null&&!List.of("PAUSED","CLOSED").contains(p.lifecycle),"请先完成服务授权、责任医生和负责人分派");
  ServiceJourneyExample duplicate=new ServiceJourneyExample();duplicate.eq("hospital_id",p.hospitalId).eq("source_system",req.sourceSystem()).eq("event_key",req.eventKey().trim());Checks.conflict(journeys.countByExample(duplicate)==0);
  ServiceJourney j=new ServiceJourney();j.hospitalId=p.hospitalId;j.patientId=p.id;j.kind=req.kind();j.entryPhase=req.entryPhase()==null?"FULL":req.entryPhase();j.sourceSystem=req.sourceSystem();j.eventKey=req.eventKey().trim();j.eventAt=req.eventAt();j.status="INTAKE";j.stage=0;j.ownerId=p.ownerId;j.doctorId=p.doctorId;j.identityEvidence=req.identityEvidence().trim();j.handoffEvidence=req.handoffEvidence().trim();j.noRevisit=false;j.version=0;j.creator=CurrentAccount.get().userId().toString();journeys.insertSelective(j);
  return record(j,"CREATED",req.requestId(),req,j.identityEvidence+"；"+j.handoffEvidence,"HANDOFF",LocalDateTime.now(),null,null);
 }
 @Transactional
 public JourneyResponse handoffAccept(AcceptJourneyHandoffRequest req){
  ServiceJourney j=lock(req.id());JourneyResponse retry=replay("HANDOFF_ACCEPTED",req.requestId(),req);if(retry!=null)return retry;access.operations();version(j,req.version());Checks.conflict("INTAKE".equals(j.status));Patient p=access.require(j.patientId);
  Checks.permit(CurrentAccount.get().userId().equals(p.ownerId));Checks.require(authorization.active(p),"服务授权无效");
  save(j,x->{x.ownerId=p.ownerId;x.doctorId=p.doctorId;x.status="ACTIVE";if(x.stage==0)x.stage="AFTER_CARE".equals(x.entryPhase)?index(x,"CLINICAL"):1;});
  if(j.currentPlanId!=null)for(var l:linked(j.currentPlanId)){var t=tasks.selectByPrimaryKey(l.taskId);if(!List.of("COMPLETED","CANCELLED").contains(t.status)&&!Objects.equals(t.assigneeId,p.ownerId)){CareTask patch=new CareTask();patch.assigneeId=p.ownerId;patch.version=t.version+1;patch.modifier=CurrentAccount.get().userId().toString();CareTaskExample ex=new CareTaskExample();ex.eq("id",t.id).eq("version",t.version);Checks.conflict(tasks.updateByExampleSelective(patch,ex)==1);audit.append(p.id,"JOURNEY_TASK_HANDED_OFF",t.id,null,t.status,"owner="+p.ownerId);}}
  return record(j,"HANDOFF_ACCEPTED",req.requestId(),req,req.evidence(),"HANDOFF",LocalDateTime.now(),p.ownerId,"OWNER");
 }
 private CareRecord clinical(ServiceJourney j,Long id){
  Checks.require(id!=null,"请选择本次门诊或出院报告");var r=records.selectByPrimaryKey(id);Checks.require(r!=null&&j.hospitalId.equals(r.hospitalId)&&j.patientId.equals(r.patientId)&&j.kind.equals(r.recordType),"报告类型、医院或患者不匹配");
  Patient p=access.require(j.patientId);Checks.require(r.doctorViewedAt!=null&&Objects.equals(r.doctorViewerId,p.doctorId),"原报告须由当前责任医生本人确认已阅");Checks.require(!r.occurredAt.isBefore(j.eventAt),"报告时间早于本次就诊事件");
  ServiceJourneyExample used=new ServiceJourneyExample();used.eq("hospital_id",j.hospitalId).eq("record_id",id).ne("id",j.id);Checks.require(journeys.countByExample(used)==0,"该报告已绑定另一旅程，请核对本次事件");JourneyPlanExample historical=new JourneyPlanExample();historical.eq("hospital_id",j.hospitalId).eq("report_id",id).ne("journey_id",j.id);Checks.require(plans.countByExample(historical)==0,"该原报告历史版本已绑定另一事件");
  JourneyResultExample prior=new JourneyResultExample();prior.eq("hospital_id",j.hospitalId).eq("reference_type","RECORD").eq("reference_id",id).ne("journey_id",j.id);Checks.require(results.countByExample(prior)==0,"该原报告核对结果属于另一旅程");return r;
 }
 private String snapshot(CareRecord r){return encoded(Map.of("record_id",r.id,"record_type",r.recordType,"occurred_at",r.occurredAt,"content",r.content,"doctor_viewer_id",r.doctorViewerId,"doctor_viewed_at",r.doctorViewedAt));}
 private Appointment arrived(ServiceJourney j,Long id,boolean revisit){
  Checks.require(id!=null,"请选择有实际到院证据的预约");var a=appointments.selectByPrimaryKey(id);Checks.require(a!=null&&j.hospitalId.equals(a.hospitalId)&&j.patientId.equals(a.patientId)&&a.arrivedAt!=null&&List.of("ARRIVED","COMPLETED").contains(a.status),"预约不属于本人患者或尚未核验实际到院");
  if(revisit){var plan=plans.selectByPrimaryKey(j.currentPlanId);Checks.require("REVISIT".equals(a.appointmentType)&&"COMPLETED".equals(a.status)&&Checks.text(a.outcome)&&plan!=null&&a.arrivedAt.isAfter(plan.baselineAt)&&!Objects.equals(a.id,j.arrivalId),"复诊须有本次报告之后的独立到院和诊疗结果");}
  else Checks.require("OUTPATIENT".equals(a.appointmentType)&&!a.arrivedAt.isBefore(j.eventAt),"首次门诊到院时间或预约类型不匹配");
  JourneyResultExample used=new JourneyResultExample();used.eq("hospital_id",j.hospitalId).eq("reference_type","APPOINTMENT").eq("reference_id",id);Checks.require(results.countByExample(used)==0,"该到院证据已用于旅程，不可重复使用");return a;
 }
 private List<JourneyTaskLink> linked(Long planId){JourneyTaskLinkExample ex=new JourneyTaskLinkExample();ex.eq("plan_id",planId);ex.setOrderByClause("seq ASC");return links.selectByExample(ex);}
 private void followupsDone(ServiceJourney j){
  Checks.require(j.currentPlanId!=null,"缺少本次个案计划");JourneyPlan plan=plans.selectByPrimaryKey(j.currentPlanId);Patient p=access.require(j.patientId);Checks.require(plan!=null&&"APPROVED".equals(plan.status)&&Objects.equals(plan.reviewerId,p.doctorId),"当前计划尚未经责任医生批准");
  boolean found=false;for(var link:linked(plan.id)){var task=tasks.selectByPrimaryKey(link.taskId);if("FOLLOWUP".equals(task.taskType)){found=true;Checks.require("COMPLETED".equals(task.status)&&"ACKNOWLEDGED".equals(task.handoverStatus)&&Objects.equals(task.reviewerId,p.doctorId),"本次计划仍有未完成随访或责任医生未查收的反馈");}}
  Checks.require(found,"本次计划需要至少一个随访节点");
 }
 @Transactional
 public JourneyResponse step(CompleteJourneyStepRequest req){
  ServiceJourney j=lock(req.id());JourneyResponse retry=replay("STEP_COMPLETED",req.requestId(),req);if(retry!=null)return retry;version(j,req.version());active(j);Checks.conflict(current(j).equals(req.stepCode()));Checks.require(!req.occurredAt().isBefore(j.eventAt),"节点时间早于本次事件");
  Patient p=access.require(j.patientId);Long ref=null;String refType=null;
  switch(req.stepCode()){
   case "CLINICAL"->{access.responsibleDoctor(p);var r=clinical(j,req.recordId());j.recordId=r.id;j.recordSnapshot=snapshot(r);ref=r.id;refType="RECORD";}
   case "ARRIVAL"->{access.operations();var a=arrived(j,req.appointmentId(),false);j.arrivalId=a.id;ref=a.id;refType="APPOINTMENT";}
   case "FOLLOWUP"->{access.operations();followupsDone(j);}
   case "CLOSE"->{access.operations();followupsDone(j);JourneyCaseExample unresolved=new JourneyCaseExample();unresolved.eq("journey_id",j.id).ne("status","CLOSED");Checks.require(cases.countByExample(unresolved)==0,"仍有未结咨询、投诉或临床异常");
    CareTaskExample open=new CareTaskExample();open.eq("hospital_id",p.hospitalId).eq("patient_id",p.id).in("task_type",List.of("ALERT","CONSULTATION")).ne("status","COMPLETED").ne("status","CANCELLED");Checks.require(tasks.countByExample(open)==0,"患者仍有未处理异常或咨询任务");
    Checks.require(List.of("VERIFIED","NONE").contains(req.outcome()==null?"":req.outcome()),"请选择已核验复诊或医生确认无需复诊");
    if("VERIFIED".equals(req.outcome())){var a=arrived(j,req.appointmentId(),true);ref=a.id;refType="APPOINTMENT";}else Checks.require(Boolean.TRUE.equals(j.noRevisit)&&Objects.equals(j.noRevisitBy,p.doctorId),"无需复诊须由当前责任医生本人说明依据");
    Checks.require(req.satisfactionStatus()!=null,"请记录满意度邀请/未回应状态");Checks.require("RATED".equals(req.satisfactionStatus())?req.satisfactionScore()!=null:req.satisfactionScore()==null,"仅已评分结果可以记录分值");
    for(var link:linked(j.currentPlanId)){var task=tasks.selectByPrimaryKey(link.taskId);if("REVISIT".equals(task.taskType)&&!List.of("COMPLETED","CANCELLED").contains(task.status))Checks.require("NONE".equals(req.outcome()),"仍有本次计划未完成复诊任务");}
    if("NONE".equals(req.outcome()))cancelOpen(j,"本轮无需复诊：责任医生已确认");
   }
   default->{access.operations();if("DISCHARGE_HANDOFF".equals(req.stepCode()))Checks.permit(CurrentAccount.get().userId().equals(p.ownerId));}
  }
  save(j,x->{x.stage++;if(x.stage==path(x).size())x.status="CLOSED";});
  String evidence=req.evidence();if("CLOSE".equals(req.stepCode()))evidence+="；结果="+req.outcome()+"；满意度="+req.satisfactionStatus()+"；分值="+req.satisfactionScore()+(req.feedback()==null?"":"；反馈="+req.feedback());
  Checks.require(evidence.length()<=2000,"结案证据和反馈合计最多 2000 字");return record(j,"STEP_COMPLETED",req.requestId(),req,evidence,req.stepCode(),req.occurredAt(),ref,refType);
 }
 @Transactional
 public JourneyResponse status(JourneyStatusRequest req){
  ServiceJourney j=lock(req.id());JourneyResponse retry=replay("STATUS_"+req.action(),req.requestId(),req);if(retry!=null)return retry;access.operations();version(j,req.version());Patient p=access.require(j.patientId);
  switch(req.action()) {
   case "PAUSE"->Checks.conflict("ACTIVE".equals(j.status));
   case "RESUME"->{Checks.conflict("PAUSED".equals(j.status));Checks.require(authorization.active(p)&&Objects.equals(p.ownerId,j.ownerId)&&!List.of("PAUSED","CLOSED").contains(p.lifecycle),"恢复前须核对服务授权与交接");}
   case "HANDOFF"->Checks.conflict(List.of("ACTIVE","PAUSED").contains(j.status));
   case "EXIT"->{Checks.conflict(List.of("INTAKE","ACTIVE","PAUSED").contains(j.status));cancelOpen(j,"患者退出本次旅程");}
   case "WITHDRAW"->{authorization.withdraw(p,req.evidence());ServiceJourneyExample all=new ServiceJourneyExample();all.eq("hospital_id",p.hospitalId).eq("patient_id",p.id).in("status",List.of("INTAKE","ACTIVE","PAUSED"));for(var other:journeys.selectByExample(all)){if(other.id.equals(j.id))continue;cancelOpen(other,"患者撤回本用途服务授权");save(other,x->x.status="EXITED");String derived=fingerprint("AUTHORIZATION_WITHDRAWN-"+other.id,req);record(other,"AUTHORIZATION_WITHDRAWN",derived,req,req.evidence(),current(other),LocalDateTime.now(),null,null);}cancelOpen(j,"患者撤回本用途服务授权");audit.append(p.id,"SERVICE_AUTHORIZATION_WITHDRAWN",p.id,"CONSENTED","WITHDRAWN","All unfinished service journeys stopped");}
   default->throw new IllegalArgumentException();
  }
  save(j,x->{x.status=switch(req.action()){case "PAUSE"->"PAUSED";case "RESUME"->"ACTIVE";case "HANDOFF"->"INTAKE";default->"EXITED";};if("HANDOFF".equals(req.action())){x.handoffEvidence=req.evidence();x.ownerId=p.ownerId;}});
  return record(j,"STATUS_"+req.action(),req.requestId(),req,req.evidence(),current(j),LocalDateTime.now(),null,null);
 }
 private List<PlanNodeDto> nodes(JourneyPlan plan){try{return json.readValue(plan.nodesJson,new TypeReference<List<PlanNodeDto>>(){});}catch(Exception e){throw new IllegalStateException(e);}}
 @Transactional
 public JourneyResponse planDraft(DraftJourneyPlanRequest req){
  ServiceJourney j=lock(req.id());JourneyResponse retry=replay("PLAN_DRAFTED",req.requestId(),req);if(retry!=null)return retry;version(j,req.version());active(j);access.operations();Checks.require(List.of("PLAN","FOLLOWUP","CLOSE").contains(current(j)),"请先完成原报告核对与出院交接");
  var r=clinical(j,req.recordId()==null?j.recordId:req.recordId());Set<Integer> seqs=new HashSet<>();Checks.require(req.nodes().stream().anyMatch(n->"FOLLOWUP".equals(n.taskType())),"计划至少包含一个随访节点");for(var n:req.nodes()){Checks.require(seqs.add(n.seq())&&Checks.text(n.checklist()),"节点序号重复或缺少待审核执行内容");}
  JourneyPlan plan=new JourneyPlan();plan.hospitalId=j.hospitalId;plan.patientId=j.patientId;plan.journeyId=j.id;JourneyPlanExample old=new JourneyPlanExample();old.eq("journey_id",j.id);plan.revision=(int)plans.countByExample(old)+1;plan.status="DRAFT";plan.reportId=r.id;plan.reportSnapshot=snapshot(r);plan.planText=req.planText();plan.nodesJson=encoded(req.nodes().stream().sorted(Comparator.comparing(PlanNodeDto::seq)).toList());plan.baselineAt=r.occurredAt;plan.creator=CurrentAccount.get().userId().toString();
  if(req.templateId()!=null){var template=templates.requireActive(req.templateId());plan.templateId=template.id;plan.templateVersion=template.version;}
  plans.insertSelective(plan);cancelOpen(j,"个案计划替代，停止旧版本未完成节点");
  if(j.currentPlanId!=null){JourneyPlan prior=plans.selectByPrimaryKey(j.currentPlanId);JourneyPlan patch=new JourneyPlan();patch.status="SUPERSEDED";JourneyPlanExample ex=new JourneyPlanExample();ex.eq("id",prior.id);plans.updateByExampleSelective(patch,ex);}
  save(j,x->{x.currentPlanId=plan.id;x.recordId=r.id;x.recordSnapshot=plan.reportSnapshot;x.noRevisit=false;x.stage=index(x,"PLAN");});
  return record(j,"PLAN_DRAFTED",req.requestId(),req,req.evidence(),"PLAN",LocalDateTime.now(),plan.id,"PLAN");
 }
 @Transactional
 public JourneyResponse planReview(ReviewJourneyPlanRequest req){
  ServiceJourney j=lock(req.id());JourneyResponse retry=replay("PLAN_REVIEWED",req.requestId(),req);if(retry!=null)return retry;version(j,req.version());active(j);Patient p=access.require(j.patientId);access.responsibleDoctor(p);Checks.conflict("PLAN".equals(current(j))&&Objects.equals(j.currentPlanId,req.planId()));JourneyPlan plan=plans.selectByPrimaryKey(req.planId());Checks.conflict(plan!=null&&"DRAFT".equals(plan.status));
  clinical(j,plan.reportId);if(plan.templateId!=null){var t=templates.requireActive(plan.templateId);Checks.conflict(Objects.equals(t.version,plan.templateVersion));}
  JourneyPlan patch=new JourneyPlan();patch.status=Boolean.TRUE.equals(req.approved())?"APPROVED":"REJECTED";patch.reviewerId=p.doctorId;patch.reviewedAt=LocalDateTime.now();patch.reviewNote=req.reviewNote();JourneyPlanExample ex=new JourneyPlanExample();ex.eq("id",plan.id).eq("status","DRAFT");Checks.conflict(plans.updateByExampleSelective(patch,ex)==1);
  if(Boolean.TRUE.equals(req.approved()))for(var node:nodes(plan)) {
   CareTask t=new CareTask();t.hospitalId=p.hospitalId;t.patientId=p.id;t.taskType=node.taskType();t.title=node.title();t.priority=node.priority();t.status="FOLLOWUP".equals(t.taskType)?"APPROVED":"PENDING";t.assigneeId=p.ownerId;t.doctorId=p.doctorId;t.dueAt=plan.baselineAt.plusDays(node.offsetDays());t.recordId=plan.reportId;t.approvedText=node.checklist();t.draftText=node.checklist();t.draftOrigin="MANUAL";t.reviewerId=p.doctorId;t.reviewedAt=patch.reviewedAt;t.reviewNote=req.reviewNote();t.followupStage=node.stage();t.requestKey="journey-"+j.id+"-"+plan.id+"-"+node.seq();t.version=0;t.creator=p.doctorId.toString();tasks.insertSelective(t);
   JourneyTaskLink link=new JourneyTaskLink();link.hospitalId=p.hospitalId;link.patientId=p.id;link.journeyId=j.id;link.planId=plan.id;link.seq=node.seq();link.taskId=t.id;link.creator=t.creator;links.insertSelective(link);audit.append(p.id,"JOURNEY_TASK_CREATED",t.id,null,t.status,"plan="+plan.id+"; node="+node.seq());
  }
  save(j,x->{x.doctorId=p.doctorId;if(Boolean.TRUE.equals(req.approved()))x.stage=index(x,"FOLLOWUP");});return record(j,"PLAN_REVIEWED",req.requestId(),req,req.reviewNote(),"PLAN",LocalDateTime.now(),plan.id,"PLAN");
 }
 private void cancelOpen(ServiceJourney j,String reason){
  if(j.currentPlanId==null)return;for(var l:linked(j.currentPlanId)){var t=tasks.selectByPrimaryKey(l.taskId);if(!List.of("COMPLETED","CANCELLED").contains(t.status)){CareTask patch=new CareTask();patch.status="CANCELLED";patch.outcome=reason;patch.version=t.version+1;CareTaskExample ex=new CareTaskExample();ex.eq("id",t.id).eq("version",t.version);Checks.conflict(tasks.updateByExampleSelective(patch,ex)==1);audit.append(j.patientId,"JOURNEY_TASK_CANCELLED",t.id,t.status,"CANCELLED",reason);}}
 }
 @Transactional
 public JourneyResponse caseOpen(OpenJourneyCaseRequest req){
  ServiceJourney j=lock(req.id());JourneyResponse retry=replay("CASE_OPENED",req.requestId(),req);if(retry!=null)return retry;version(j,req.version());access.operations();Checks.require(req.dueAt().isBefore(LocalDateTime.now().plusYears(1)),"工单截止时间超出一年");
  JourneyCase c=new JourneyCase();c.hospitalId=j.hospitalId;c.patientId=j.patientId;c.journeyId=j.id;c.kind=req.kind();c.status="OPEN";c.summary=req.summary();c.dueAt=req.dueAt();Patient p=access.require(j.patientId);c.ownerId=p.ownerId;c.doctorId=p.doctorId;c.version=0;c.creator=CurrentAccount.get().userId().toString();cases.insertSelective(c);save(j,x->{});return record(j,"CASE_OPENED",req.requestId(),req,req.evidence(),current(j),LocalDateTime.now(),c.id,"CASE");
 }
 @Transactional
 public JourneyResponse caseAction(ActJourneyCaseRequest req){
  ServiceJourney j=lock(req.id());JourneyResponse retry=replay("CASE_"+req.action(),req.requestId(),req);if(retry!=null)return retry;
  // Outstanding safety cases remain actionable after patient exit; closure does not erase them.
  Checks.conflict(Objects.equals(j.version,req.version())&&!"CLOSED".equals(j.status));var c=cases.selectByPrimaryKey(req.caseId());Checks.found(c!=null&&c.journeyId.equals(j.id)&&c.hospitalId.equals(j.hospitalId));Patient p=access.require(j.patientId);
  if("CLOSE".equals(req.action()))access.operations();else if("CLINICAL".equals(c.kind))access.responsibleDoctor(p);else access.operations();
  JourneyCase patch=new JourneyCase();switch(req.action()){
   case "ACCEPT"->{Checks.conflict("OPEN".equals(c.status));patch.status="ACCEPTED";}
   case "RESOLVE"->{Checks.conflict("ACCEPTED".equals(c.status));patch.status="RESOLVED";patch.resolution=req.evidence();}
   case "CLOSE"->{Checks.conflict("RESOLVED".equals(c.status));Checks.require(Checks.text(c.resolution),"缺少实质处理结果");patch.status="CLOSED";patch.receiptEvidence=req.evidence();}
   default->throw new IllegalArgumentException();
  }
  patch.version=c.version+1;patch.modifier=CurrentAccount.get().userId().toString();JourneyCaseExample ex=new JourneyCaseExample();ex.eq("id",c.id).eq("version",c.version);Checks.conflict(cases.updateByExampleSelective(patch,ex)==1);save(j,x->{});return record(j,"CASE_"+req.action(),req.requestId(),req,req.evidence(),current(j),LocalDateTime.now(),c.id,"CASE");
 }
 @Transactional
 public JourneyResponse noRevisit(NoJourneyRevisitRequest req){
  ServiceJourney j=lock(req.id());JourneyResponse retry=replay("NO_REVISIT_CONFIRMED",req.requestId(),req);if(retry!=null)return retry;version(j,req.version());active(j);access.responsibleDoctor(access.require(j.patientId));Checks.require(List.of("FOLLOWUP","CLOSE").contains(current(j)),"请先审核本次个案计划");save(j,x->{x.noRevisit=true;x.noRevisitBy=CurrentAccount.get().userId();x.noRevisitReason=req.reason();});return record(j,"NO_REVISIT_CONFIRMED",req.requestId(),req,req.reason(),current(j),LocalDateTime.now(),null,null);
 }
 private JourneyResponse view(ServiceJourney j){
  Patient p=access.require(j.patientId);JourneyResultExample re=new JourneyResultExample();re.eq("journey_id",j.id);re.setOrderByClause("id ASC");var history=results.selectByExample(re);JourneyPlanExample pe=new JourneyPlanExample();pe.eq("journey_id",j.id);pe.setOrderByClause("revision ASC");var ps=plans.selectByExample(pe);JourneyCaseExample ce=new JourneyCaseExample();ce.eq("journey_id",j.id);var cs=cases.selectByExample(ce);
  var ts=j.currentPlanId==null?List.<JourneyResponse.Task>of():linked(j.currentPlanId).stream().map(l->{CareTask t=tasks.selectByPrimaryKey(l.taskId);return new JourneyResponse.Task(t.id,l.planId,l.seq,t.title,t.taskType,t.status,t.dueAt,t.handoverStatus);}).toList();
  return new JourneyResponse(j.id,j.patientId,PatientService.maskName(p.name),j.kind,j.entryPhase,j.sourceSystem,j.eventKey,j.eventAt,j.status,current(j),j.stage,j.version,"INTAKE".equals(j.status)?p.ownerId:j.ownerId,j.doctorId,j.currentPlanId,j.arrivalId,j.recordId,j.recordSnapshot,j.noRevisit,j.noRevisitReason,authorization.active(p),path(j),history.stream().map(r->new JourneyResponse.Result(r.id,r.action,r.stepCode,r.evidence,r.actorId,r.occurredAt,r.gmtCreate,r.referenceId,r.referenceType)).toList(),ps.stream().map(x->new JourneyResponse.Plan(x.id,x.revision,x.status,x.reportId,x.reportSnapshot,x.planText,nodes(x),x.reviewerId,x.reviewedAt,x.reviewNote,x.templateId,x.templateVersion)).toList(),ts,cs.stream().map(c->new JourneyResponse.Case(c.id,c.kind,c.status,c.summary,c.dueAt,!"CLOSED".equals(c.status)&&c.dueAt.isBefore(LocalDateTime.now()),c.resolution,c.receiptEvidence,c.version)).toList());
 }
}
