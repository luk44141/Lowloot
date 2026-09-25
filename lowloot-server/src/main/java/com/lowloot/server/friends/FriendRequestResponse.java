package com.lowloot.server.friends;

import java.time.LocalDateTime;

// Sirve tanto para "recibidas" como para "enviadas": userId/username/etc.
// son siempre los del OTRO usuario (quien envió, si es una recibida; a
// quien se le envió, si es una enviada), nunca los del usuario logueado.
public record FriendRequestResponse(
        Long id,
        Long userId,
        String username,
        String displayName,
        String avatarUrl,
        LocalDateTime createdAt) {
}
