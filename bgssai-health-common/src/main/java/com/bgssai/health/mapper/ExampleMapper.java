package com.bgssai.health.mapper;
import com.bgssai.health.model.ExampleBase;
import org.apache.ibatis.annotations.Param;
import java.util.List;
/** Only the skeleton's approved Example operations are exposed. */
public interface ExampleMapper<T> {
    T selectByPrimaryKey(Long id);
    List<T> selectByExample(ExampleBase example);
    long countByExample(ExampleBase example);
    int insertSelective(T row);
    int updateByExampleSelective(@Param("row") T row, @Param("example") ExampleBase example);
}
