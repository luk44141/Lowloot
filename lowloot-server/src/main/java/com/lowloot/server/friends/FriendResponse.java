package com.lowloot.server.friends;

import java.time.LocalDateTime;

public record FriendResponse(
        Long id,
        String username,
        String displayName,
        String avatarUrl,
        boolean online,
        LocalDateTime lastActiveAt) {
}
