package com.example.backend.config;

import com.example.backend.model.User;
import com.example.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.crypto.password.NoOpPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Collections;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Autowired
    private UserRepository userRepository;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> {
                }) // Enable CORS with default or customs
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/**", "/uploads/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/posts/**", "/api/tags", "/api/comments").permitAll() // Allow
                                                                                                                    // read-only
                                                                                                                    // access
                                                                                                                    // (optionalAuth
                                                                                                                    // handling
                                                                                                                    // in
                                                                                                                    // controller)
                        .requestMatchers(HttpMethod.GET, "/api/users/**").permitAll() // Profile is public
                        .anyRequest().authenticated())
                .httpBasic(basic -> {
                }); // Enable Basic Auth

        return http.build();
    }

    @Bean
    public UserDetailsService userDetailsService() {
        return username -> {
            User user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

            // Manually mapping to Spring Security User
            // Note: Password in DB is plaintext, so we prefix it with {noop} if we were
            // using DelegatingPasswordEncoder,
            // OR use NoOpPasswordEncoder bean below.
            return org.springframework.security.core.userdetails.User.builder()
                    .username(user.getUsername())
                    .password(user.getPassword()) // Plaintext
                    .roles("USER")
                    .build();
        };
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        // Warning: Deprecated but required for compatibility with current plaintext
        // passwords.
        return NoOpPasswordEncoder.getInstance();
    }
}
