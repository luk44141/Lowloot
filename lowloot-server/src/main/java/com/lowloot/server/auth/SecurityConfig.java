package com.lowloot.server.auth;

import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // El preflight (OPTIONS) de CORS tiene que pasar SIEMPRE,
                        // sin importar si hay token o no: si un PATCH/DELETE con
                        // body cae acá sin este permiso explícito, el preflight
                        // puede terminar evaluado por ".anyRequest().authenticated()"
                        // y cortado con 403 vacío (nunca llega a nuestro
                        // accessDeniedHandler, que sí manda JSON) antes de que el
                        // launcher pueda mandar el PATCH real.
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        // Catalogo de juegos y assets estaticos: publicos, no
                        // hace falta estar logueado para ver la tienda.
                        .requestMatchers(HttpMethod.GET, "/games", "/games/**").permitAll()
                        .requestMatchers("/assets/**").permitAll()
                        // Registro y login son publicos por definicion.
                        .requestMatchers("/auth/**").permitAll()
                        // Panel admin: solo ADMIN. La verificacion real pasa
                        // aca (server-side), nunca solo ocultando botones.
                        .requestMatchers("/admin/**").hasRole("ADMIN")
                        .anyRequest().authenticated())
                // Sin esto, Spring Security usa su manejo por defecto para
                // pedidos sin sesion valida o sin permiso: normalmente
                // termina devolviendo un 403 generico (incluso cuando en
                // realidad el token vencio/falta, que deberia ser 401) y esa
                // respuesta nunca llega a pasar por GlobalExceptionHandler,
                // asi que el launcher mostraba "no tenés permisos" para
                // casos que en realidad eran "iniciá sesión de nuevo".
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(authenticationEntryPoint())
                        .accessDeniedHandler(accessDeniedHandler()))
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    // 401: no hay token, es invalido, o vencio. El frontend (api-client.js)
    // reacciona específicamente a este status limpiando la sesión local.
    @Bean
    public AuthenticationEntryPoint authenticationEntryPoint() {
        return (request, response, authException) -> writeJsonError(response, 401, "Tenés que iniciar sesión para continuar");
    }

    // 403: hay sesión válida, pero el rol no alcanza (ej. un USER pegándole
    // a /admin/**).
    @Bean
    public AccessDeniedHandler accessDeniedHandler() {
        return (request, response, accessDeniedException) -> writeJsonError(response, 403, "No tenés permisos para hacer esto");
    }

    private void writeJsonError(jakarta.servlet.http.HttpServletResponse response, int status, String message) throws java.io.IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write("{\"status\":" + status + ",\"message\":\"" + message + "\"}");
    }

    // CORS permisivo: el launcher de Electron llama a la API desde un
    // origen file:// / null, no desde un dominio publico, asi que no hay
    // usuarios de navegador de terceros a los que restringir aca.
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(List.of("*"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(false);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
