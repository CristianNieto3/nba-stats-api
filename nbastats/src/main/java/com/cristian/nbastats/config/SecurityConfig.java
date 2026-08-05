package com.cristian.nbastats.config;

import jakarta.servlet.DispatcherType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsUtils;

import java.util.UUID;

/**
 * Reads stay public so the dashboard works for anyone; writes require an
 * authenticated admin.
 *
 * This is separate from the {@code app.write-enabled} flag, which switches the
 * write endpoints off entirely. The flag decides whether writes exist at all,
 * this decides who may call them.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private static final Logger log = LoggerFactory.getLogger(SecurityConfig.class);

    @Bean
    public SecurityFilterChain apiSecurityFilterChain(HttpSecurity http) throws Exception {
        http
                // Reuses the CORS rules from WebConfig; without this the security
                // filter chain would reject cross-origin calls before they reach MVC.
                .cors(Customizer.withDefaults())
                // The API authenticates every request from an Authorization header and
                // keeps no session, so there is no cookie for another site to ride on.
                // CSRF tokens would add nothing here and would break non-browser clients.
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Error and forward dispatches are internal, not user requests.
                        .dispatcherTypeMatchers(DispatcherType.ERROR, DispatcherType.FORWARD).permitAll()
                        // Preflight carries no credentials by design.
                        .requestMatchers(CorsUtils::isPreFlightRequest).permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/**").permitAll()
                        .requestMatchers("/api/**").hasRole("ADMIN")
                        .anyRequest().denyAll()
                )
                .httpBasic(Customizer.withDefaults());

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * A single admin account supplied through the environment. There is no
     * fallback password: if none is configured an unusable random one is set, so
     * a misconfigured deployment fails closed instead of shipping a known login.
     */
    @Bean
    public UserDetailsService adminUserDetailsService(
            PasswordEncoder passwordEncoder,
            @Value("${app.admin.username:admin}") String username,
            @Value("${app.admin.password:}") String password
    ) {
        String resolvedPassword = password;
        if (resolvedPassword.isBlank()) {
            resolvedPassword = UUID.randomUUID().toString();
            log.warn("app.admin.password is not set, so the write endpoints cannot be authenticated against. "
                    + "Set ADMIN_PASSWORD to enable them.");
        }

        return new InMemoryUserDetailsManager(
                User.withUsername(username)
                        .password(passwordEncoder.encode(resolvedPassword))
                        .roles("ADMIN")
                        .build()
        );
    }
}
