package com.bgssai.health.channel.service;
import com.bgssai.health.audit.service.AuditService;
import com.bgssai.health.auth.service.CurrentAccount;
import com.bgssai.health.channel.dto.*;
import com.bgssai.health.common.*;
import com.bgssai.health.mapper.IntakeChannelMapper;
import com.bgssai.health.model.*;
import com.bgssai.health.patient.service.PatientAccess;
import com.bgssai.health.patient.service.PatientService;
import com.github.pagehelper.PageHelper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;
@Service
public class ChannelService {
    private static final Logger log=LoggerFactory.getLogger(ChannelService.class);
    private final IntakeChannelMapper channels;private final PatientAccess access;private final PatientService patients;private final AuditService audit;private final String userUrl;
    public ChannelService(IntakeChannelMapper channels,PatientAccess access,PatientService patients,AuditService audit,@Value("${health.user-url}") String userUrl){this.channels=channels;this.access=access;this.patients=patients;this.audit=audit;this.userUrl=userUrl;}
    public Paged<ChannelResponse> query(Integer page,Integer size){
        log.info("query channels page={}",page);access.manager();IntakeChannelExample ex=new IntakeChannelExample();ex.eq("hospital_id",CurrentAccount.get().hospitalId());
        PageHelper.startPage(Paged.number(page),Paged.size(size));
        List<IntakeChannel> rows=channels.selectByExample(ex);return Paged.of(rows,this::view);
    }
    @Transactional
    public ChannelResponse create(CreateChannelRequest req){
        log.info("create channel source={}",req.source());access.manager();patients.validateClinician(req.doctorId());patients.validateStaff(req.ownerId(),"OPERATOR","NURSE","MANAGER");
        IntakeChannel c=new IntakeChannel();c.hospitalId=CurrentAccount.get().hospitalId();c.title=req.title();c.source=req.source();c.department=req.department();c.doctorId=req.doctorId();c.ownerId=req.ownerId();c.token=UUID.randomUUID().toString().replace("-","");c.active=true;c.creator=CurrentAccount.get().userId().toString();
        channels.insertSelective(c);audit.append(null,"CHANNEL_CREATED",c.id,null,"ACTIVE","Channel created");return view(c);
    }
    @Transactional
    public ChannelResponse toggle(ToggleChannelRequest req){
        log.info("toggle channel id={} active={}",req.id(),req.active());access.manager();IntakeChannel c=channels.selectByPrimaryKey(req.id());Checks.found(c!=null&&CurrentAccount.get().hospitalId().equals(c.hospitalId));
        IntakeChannel patch=new IntakeChannel();patch.active=req.active();patch.modifier=CurrentAccount.get().userId().toString();
        IntakeChannelExample ex=new IntakeChannelExample();ex.eq("id",c.id).eq("hospital_id",c.hospitalId);channels.updateByExampleSelective(patch,ex);
        audit.append(null,"CHANNEL_TOGGLED",c.id,String.valueOf(c.active),String.valueOf(req.active()),"New enrollment availability");return view(channels.selectByPrimaryKey(c.id));
    }
    public PublicChannelResponse resolve(String token){
        log.info("resolve public channel");Checks.require(token!=null&&token.matches("[a-zA-Z0-9-]{16,64}"),"Invalid channel");
        IntakeChannelExample ex=new IntakeChannelExample();ex.eq("token",token).eq("is_active",true);
        PageHelper.startPage(1,1,false);
        List<IntakeChannel> rows=channels.selectByExample(ex);Checks.found(!rows.isEmpty());IntakeChannel c=rows.getFirst();return new PublicChannelResponse(c.title,c.source,c.department,true);
    }
    private ChannelResponse view(IntakeChannel c){return new ChannelResponse(c.id,c.title,c.source,c.department,c.doctorId,c.ownerId,c.token,c.active,userUrl+"/join/"+c.token);}
}
