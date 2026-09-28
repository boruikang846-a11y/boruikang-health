package com.bgssai.health.configuration;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import com.fasterxml.jackson.core.json.JsonWriteFeature;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;

/**
 * 核心 Bean：ObjectMapper（Jackson 2，全局 snake_case 序列化策略）+ RestTemplate。
 * <p>
 * Spring Boot 4 默认使用 Jackson 3（{@code tools.jackson}），其自动装配不再生成
 * Jackson 2 的 ObjectMapper / 消息转换器。本项目仍基于 Jackson 2 编写，故：
 * <ul>
 *   <li>显式实现 {@link WebMvcConfigurer}，在转换器链首位插入基于本类 snake_case
 *       {@link ObjectMapper} 的 {@link MappingJackson2HttpMessageConverter}，
 *       确保 @RequestBody / @ResponseBody 的 JSON 仍走 Jackson 2 + snake_case（Standards §1）。</li>
 *   <li>RestTemplate 改用 {@link JdkClientHttpRequestFactory}（Spring Framework 7 已移除
 *       OkHttp3ClientHttpRequestFactory），保留连接/读取超时。</li>
 * </ul>
 */
@Configuration
public class BgssConfig implements WebMvcConfigurer {

    @Bean
    ObjectMapper objectMapper() {
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());
        objectMapper.disable(com.fasterxml.jackson.databind.SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        objectMapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, true);
        objectMapper.setPropertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE);
        objectMapper.getFactory().configure(JsonWriteFeature.ESCAPE_NON_ASCII.mappedFeature(), false);
        return objectMapper;
    }

    @Bean
    RestTemplate restTemplate() {
        HttpClient httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(httpClient);
        factory.setReadTimeout(Duration.ofSeconds(30));
        return new RestTemplate(factory);
    }

    /**
     * 在默认转换器之前插入 Jackson 2 + snake_case 的 JSON 转换器，保住既有 JSON 契约。
     */
    @Override
    public void extendMessageConverters(List<HttpMessageConverter<?>> converters) {
        converters.add(0, new MappingJackson2HttpMessageConverter(objectMapper()));
    }
}
