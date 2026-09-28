package com.bgssai.health.configuration;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Admin console SPA (React Router history mode) deep-link fallback.
 * <p>
 * Each top-level front-end route prefix is forwarded to {@code /index.html} so deep links
 * and refreshes do not 404.
 * <p>
 * A whitelist of prefixes is used rather than {@code /**}, to avoid forwarding hashed static
 * assets ({@code /assets/*.js} / {@code /assets/*.css}) to HTML (a browser parsing HTML as JS
 * would throw SyntaxError).
 * <p>
 * {@code /bgssai/**} (business API and login endpoints) goes to Controllers and must return a
 * 404 JSON on a miss, so it is not in this list. The front-end route list is in
 * bgssai-health-admin-react src/App.jsx — when a new top-level route prefix is added there,
 * add it here too.
 */
@Configuration
public class SpaFallbackConfig implements WebMvcConfigurer {

    /**
     * Top-level front-end route prefix whitelist.
     * Never add {@code /bgssai} (API) or {@code /assets} (static resources).
     */
    private final List<String> routePrefixes;

    public SpaFallbackConfig(@Value("${health.portal}") String portal) {
        routePrefixes="user".equals(portal)?List.of("/join"):List.of(
            "/login", "/workbench", "/patients", "/followups", "/alerts", "/revisits",
            "/knowledge", "/channels", "/reports", "/settings");
    }

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        registry.addViewController("/").setViewName("forward:/index.html");
        for (String prefix : routePrefixes) {
            registry.addViewController(prefix).setViewName("forward:/index.html");
            registry.addViewController(prefix + "/**").setViewName("forward:/index.html");
        }
    }
}
