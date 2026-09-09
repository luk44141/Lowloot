package com.lowloot.server.auth.dto;

public record AuthResponse(
        String token,
        Long userId,
        String username,
        String email,
        String role,
        java.math.BigDecimal balance) {
}
