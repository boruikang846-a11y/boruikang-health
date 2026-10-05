package com.boruikang.health.mapper;
import com.boruikang.health.model.JourneyPlan;
public interface JourneyPlanMapper extends ExampleMapper<JourneyPlan> {
 java.util.List<JourneyPlan> selectScopedByExample(@org.apache.ibatis.annotations.Param("example") com.boruikang.health.model.ExampleBase example,@org.apache.ibatis.annotations.Param("patientScope") com.boruikang.health.model.ExampleBase patientScope);
 long countScopedByExample(@org.apache.ibatis.annotations.Param("example") com.boruikang.health.model.ExampleBase example,@org.apache.ibatis.annotations.Param("patientScope") com.boruikang.health.model.ExampleBase patientScope);
}
