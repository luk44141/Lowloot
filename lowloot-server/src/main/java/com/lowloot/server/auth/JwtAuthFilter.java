package com.lowloot.server.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Duration;
import java.time.LocalDateTime;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    // Margen minimo entre escrituras de "ultima actividad" por usuario:
    // evita un UPDATE en cada request autenticado (el launcher pega varios
    // por segundo mientras se navega) sin perder precision real para el
    // umbral de Online/Offline de Amigos (varios minutos, ver FriendService).
    private static final Duration LAST_ACTIVE_UPDATE_MARGIN = Duration.ofSeconds(60);

    private final JwtService jwtService;
    private final UserRepository userRepository;

    public JwtAuthFilter(JwtService jwtService, UserRepository userRepository) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        String header = request.getHeader("Authorization");

        if (header == null || !header.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = header.substring(7);

        try {
            if (!jwtService.isExpired(token)) {
                String email = jwtService.extractEmail(token);

                if (SecurityContextHolder.getContext().getAuthentication() == null) {
                    userRepository.findByEmail(email).ifPresent(user -> {
                        UsernamePasswordAuthenticationToken authToken =
                                new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());
                        authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(authToken);
                        touchLastActive(user);
                    });
                }
            }
        } catch (Exception ex) {
            // Token invalido/corrupto/vencido: seguimos sin autenticar, y el
            // endpoint protegido correspondiente devolvera 401/403 solo.
            SecurityContextHolder.clearContext();
        }

        filterChain.doFilter(request, response);
    }

    // Base del estado Online/Offline de Amigos (ver FriendService): sin
    // WebSockets ni presencia en tiempo real, solo "ultima vez que hizo un
    // request autenticado", con el margen de arriba para no escribir en
    // cada request.
    private void touchLastActive(User user) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime last = user.getLastActiveAt();
        if (last != null && Duration.between(last, now).compareTo(LAST_ACTIVE_UPDATE_MARGIN) < 0) {
            return;
        }
        user.setLastActiveAt(now);
        userRepository.save(user);
    }
}
