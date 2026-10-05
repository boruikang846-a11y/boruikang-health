package com.bgssai.health.mapper;
import com.bgssai.health.model.JourneyCase;
public interface JourneyCaseMapper extends ExampleMapper<JourneyCase> {
 java.util.List<JourneyCase> selectScopedByExample(@org.apache.ibatis.annotations.Param("example") com.bgssai.health.model.ExampleBase example,@org.apache.ibatis.annotations.Param("patientScope") com.bgssai.health.model.ExampleBase patientScope);
 long countScopedByExample(@org.apache.ibatis.annotations.Param("example") com.bgssai.health.model.ExampleBase example,@org.apache.ibatis.annotations.Param("patientScope") com.bgssai.health.model.ExampleBase patientScope);
}
