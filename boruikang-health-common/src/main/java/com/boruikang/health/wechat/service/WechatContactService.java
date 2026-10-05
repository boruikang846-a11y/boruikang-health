package com.boruikang.health.wechat.service;
import com.boruikang.health.auth.service.CurrentAccount;
import com.boruikang.health.common.Checks;
import com.boruikang.health.common.Paged;
import com.boruikang.health.mapper.HealthAccountMapper;
import com.boruikang.health.mapper.PatientMapper;
import com.boruikang.health.mapper.WechatContactMapper;
import com.boruikang.health.model.*;
import com.boruikang.health.patient.service.PatientAccess;
import com.boruikang.health.patient.service.PatientService;
import com.boruikang.health.wechat.dto.*;
import com.github.pagehelper.PageHelper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
/** WeChat friends and followers of the hospital and their link to patient records. Identity is confirmed by staff; nothing is merged automatically. */
@Service
public class WechatContactService {
    private static final Logger log=LoggerFactory.getLogger(WechatContactService.class);
    private static final int SYNC_LIMIT=1000;
    private final WechatContactMapper contacts;private final PatientMapper patients;private final HealthAccountMapper accounts;private final PatientAccess access;private final WechatConfigService configs;private final WechatLedger ledger;
    public WechatContactService(WechatContactMapper contacts,PatientMapper patients,HealthAccountMapper accounts,PatientAccess access,WechatConfigService configs,WechatLedger ledger) {
        this.contacts=contacts;this.patients=patients;this.accounts=accounts;this.access=access;this.configs=configs;this.ledger=ledger;
    }
    public Paged<WechatContactResponse> query(WechatContactQueryRequest req) {
        log.info("query wechat contacts channel={} bound={} pending={}",req.channel(),req.bound(),req.pending());access.staff();
        WechatContactExample ex=new WechatContactExample();ex.eq("hospital_id",CurrentAccount.get().hospitalId());
        if(req.patientId()!=null) { access.require(req.patientId());ex.eq("patient_id",req.patientId()); }
        else {
            access.operations();Checks.require(!access.executor()||req.bound()!=null,"Choose bound or unbound contacts / 请选择查看已绑定或待绑定的联系人");
            if(Boolean.FALSE.equals(req.bound()))ex.eq("patient_id",0L);
            else if(access.executor())ex.in("patient_id",access.scopedPatientIds(2000));
            else if(Boolean.TRUE.equals(req.bound()))ex.gt("patient_id",0L);
        }
        if(Checks.text(req.channel()))ex.eq("channel",req.channel());if(Checks.text(req.relation()))ex.eq("relation",req.relation());
        if(Boolean.TRUE.equals(req.pending()))ex.gt("pending_count",0);if(Checks.text(req.keyword()))ex.like("nickname","%"+req.keyword().trim()+"%");
        ex.setOrderByClause("last_message_at DESC,id DESC");PageHelper.startPage(Paged.number(req.page()),Paged.size(req.size()));
        List<WechatContact> rows=contacts.selectByExample(ex);Map<Long,Patient> names=patientNames(rows.stream().map(r->r.patientId).filter(id->id>0).distinct().toList());
        return Paged.of(rows,r->view(r,names.get(r.patientId)));
    }
    /** Pulls the current friends or followers from WeChat. The network call finishes before the database transaction starts. */
    public SyncWechatContactsResponse sync(SyncWechatContactsRequest req) {
        log.info("sync wechat contacts provider={}",req.provider());access.manager();Long hospitalId=CurrentAccount.get().hospitalId();IntegrationConfig c=configs.active(hospitalId,req.provider());
        List<WechatGateway.Profile> profiles;
        if(WechatConfigService.WE_COM.equals(req.provider())) {
            HealthAccountExample ex=new HealthAccountExample();ex.eq("hospital_id",hospitalId).eq("is_enabled",true).isNotNull("wecom_user_id").ne("wecom_user_id","");ex.selectColumns("id","wecom_user_id");
            PageHelper.startPage(1,500,false);List<String> members=accounts.selectByExample(ex).stream().map(a->a.wecomUserId).toList();
            Checks.require(!members.isEmpty(),"Link WeCom member ids to work accounts first / 请先在医护账号里登记企业微信成员账号");
            profiles=configs.gateway(c).wecomContacts(c,members,SYNC_LIMIT);
        } else profiles=configs.gateway(c).officialFollowers(c,SYNC_LIMIT);
        boolean truncated=profiles.size()>SYNC_LIMIT;if(truncated)profiles=profiles.subList(0,SYNC_LIMIT);
        int[] counts=ledger.upsert(hospitalId,req.provider(),profiles,configs.mock(c));
        return new SyncWechatContactsResponse(profiles.size(),counts[0],counts[1],truncated);
    }
    public WechatContactResponse bind(BindWechatContactRequest req) { log.info("bind wechat contact id={}",req.id());return view(ledger.bind(req.id(),req.version(),req.patientId())); }
    public WechatContactResponse unbind(UnbindWechatContactRequest req) { log.info("unbind wechat contact id={}",req.id());return view(ledger.unbind(req.id(),req.version(),req.reason())); }
    public WechatContactResponse handle(Long id) { log.info("handle wechat contact id={}",id);return view(ledger.handle(id)); }
    private WechatContactResponse view(WechatContact c) { return view(c,c.patientId>0?patients.selectByPrimaryKey(c.patientId):null); }
    private Map<Long,Patient> patientNames(List<Long> ids) {
        if(ids.isEmpty())return Map.of();PatientExample ex=access.scope();ex.in("id",ids);ex.selectColumns("id","name");PageHelper.startPage(1,100,false);
        return patients.selectByExample(ex).stream().collect(Collectors.toMap(p->p.id,Function.identity()));
    }
    private static WechatContactResponse view(WechatContact c,Patient p) {
        return new WechatContactResponse(c.id,c.channel,c.externalId,c.nickname,c.staffUserId,c.staffAccountId,c.intakeChannelId,c.relation,c.followedAt,c.removedAt,c.lastInboundAt,c.lastMessageAt,c.lastMessagePreview,c.pendingCount,
            c.patientId>0?c.patientId:null,p==null?null:PatientService.maskName(p.name),c.boundAt,Boolean.TRUE.equals(c.mock),c.version);
    }
}
