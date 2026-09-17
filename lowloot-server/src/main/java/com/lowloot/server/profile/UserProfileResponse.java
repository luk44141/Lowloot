package com.lowloot.server.profile;

import java.math.BigDecimal;

// Forma comun de "datos de perfil" que devuelven /users/me y /auth/login
// /auth/register, y tambien PATCH /users/me. `avatarUrl` es null cuando el
// usuario no tiene foto personalizada: el frontend en ese caso usa
// lowloot-launcher/assets/profile/default-profile.png en vez de pedirle
// algo al servidor.
public record UserProfileResponse(
        Long id,
        String username,
        String displayName,
        String email,
        String role,
        BigDecimal balance,
        String avatarUrl) {
}
