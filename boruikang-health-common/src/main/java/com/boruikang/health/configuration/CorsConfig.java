package com.boruikang.health.configuration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;
import java.util.List;
@Configuration
@EnableConfigurationProperties(CorsConfig.Origins.class)
public class CorsConfig {
    @ConfigurationProperties("boruikang.cors")
    public record Origins(List<String> allowedOrigins) {}
    @Bean CorsFilter corsFilter(Origins origins) {
        CorsConfiguration config=new CorsConfiguration();
        if (origins.allowedOrigins().contains("*")) throw new IllegalStateException("Explicit CORS origins required");
        config.setAllowedOrigins(origins.allowedOrigins()); config.setAllowedMethods(List.of("GET","POST","OPTIONS"));
        config.setAllowedHeaders(List.of("Content-Type","Accept","Jwttoken")); config.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source=new UrlBasedCorsConfigurationSource(); source.registerCorsConfiguration("/**",config);
        return new CorsFilter(source);
    }
}
