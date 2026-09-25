package com.lowloot.server.friends;

import java.time.LocalDateTime;

// Perfil publico de otro usuario (abierto desde la lista de Amigos o
// desde un resultado de búsqueda). `isFriend` le permite al frontend
// mostrar "Eliminar amigo" en vez de "Agregar" cuando corresponde.
public record FriendProfileResponse(
        Long id,
        String username,
        String displayName,
        String avatarUrl,
        boolean isFriend,
        boolean online,
        LocalDateTime lastActiveAt) {
}
