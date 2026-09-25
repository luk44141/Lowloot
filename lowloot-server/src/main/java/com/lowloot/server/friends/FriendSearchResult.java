package com.lowloot.server.friends;

// `status` le dice al frontend qué botón mostrar sin que tenga que cruzar
// listas por su cuenta: NONE (puede enviar solicitud), REQUEST_SENT (ya le
// mandó una, esperando), REQUEST_RECEIVED (ese usuario ya le mandó una a
// él), FRIENDS (ya son amigos).
public record FriendSearchResult(
        Long id,
        String username,
        String displayName,
        String friendCode,
        String avatarUrl,
        boolean online,
        String status) {
}
