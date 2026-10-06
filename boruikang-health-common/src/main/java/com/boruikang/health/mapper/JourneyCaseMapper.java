package com.boruikang.health.mapper;
import com.boruikang.health.model.JourneyCase;
public interface JourneyCaseMapper extends ExampleMapper<JourneyCase> {
 java.util.List<JourneyCase> selectScopedByExample(@org.apache.ibatis.annotations.Param("example") com.boruikang.health.model.ExampleBase example,@org.apache.ibatis.annotations.Param("patientScope") com.boruikang.health.model.ExampleBase patientScope);
 long countScopedByExample(@org.apache.ibatis.annotations.Param("example") com.boruikang.health.model.ExampleBase example,@org.apache.ibatis.annotations.Param("patientScope") com.boruikang.health.model.ExampleBase patientScope);
}
