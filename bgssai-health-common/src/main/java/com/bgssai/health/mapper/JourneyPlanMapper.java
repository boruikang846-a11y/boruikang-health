package com.bgssai.health.mapper;
import com.bgssai.health.model.JourneyPlan;
public interface JourneyPlanMapper extends ExampleMapper<JourneyPlan> {
 java.util.List<JourneyPlan> selectScopedByExample(@org.apache.ibatis.annotations.Param("example") com.bgssai.health.model.ExampleBase example,@org.apache.ibatis.annotations.Param("patientScope") com.bgssai.health.model.ExampleBase patientScope);
 long countScopedByExample(@org.apache.ibatis.annotations.Param("example") com.bgssai.health.model.ExampleBase example,@org.apache.ibatis.annotations.Param("patientScope") com.bgssai.health.model.ExampleBase patientScope);
}
