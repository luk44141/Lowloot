package com.lowloot.server.notification;

import java.time.LocalDateTime;

public record NotificationResponse(
        Long id,
        String type,
        Long actorUserId,
        Long referenceId,
        String title,
        String body,
        boolean read,
        LocalDateTime createdAt) {
}
