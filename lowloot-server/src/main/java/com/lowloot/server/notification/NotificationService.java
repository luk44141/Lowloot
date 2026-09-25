package com.lowloot.server.notification;

import com.lowloot.server.auth.User;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

// Único sistema de notificaciones de Lowloot (ver nota en
// Notification.java: no existía ninguno antes). FriendService lo consume
// para avisar solicitudes de amistad recibidas y aceptadas, pero está
// escrito para que cualquier otra funcionalidad futura llame a
// `create(...)` con su propio `type` sin tener que tocar esta clase.
@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    public Notification create(Long recipientUserId, String type, User actor, Long referenceId, String title, String body) {
        Notification notification = new Notification();
        notification.setUserId(recipientUserId);
        notification.setType(type);
        notification.setActorUserId(actor != null ? actor.getId() : null);
        notification.setReferenceId(referenceId);
        notification.setTitle(title);
        notification.setBody(body);
        return notificationRepository.save(notification);
    }

    // Se usa cuando el recurso al que apuntaba la notificación (ej. una
    // solicitud de amistad) dejó de existir o cambió de estado: aceptar,
    // rechazar o cancelar una solicitud borra su notificación en vez de
    // dejarla dando vueltas sin nada que hacer.
    @Transactional
    public void deleteByReference(String type, Long referenceId) {
        notificationRepository.deleteByTypeAndReferenceId(type, referenceId);
    }

    public List<NotificationResponse> listForUser(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(NotificationService::toResponse)
                .toList();
    }

    public long unreadCount(Long userId) {
        return notificationRepository.countByUserIdAndReadFalse(userId);
    }

    @Transactional
    public void markRead(Long userId, Long notificationId) {
        Notification notification = notificationRepository.findByIdAndUserId(notificationId, userId)
                .orElseThrow(() -> new ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "Notificación no encontrada"));
        if (!notification.isRead()) {
            notification.setRead(true);
            notificationRepository.save(notification);
        }
    }

    @Transactional
    public void markAllRead(Long userId) {
        notificationRepository.markAllReadForUser(userId);
    }

    private static NotificationResponse toResponse(Notification n) {
        return new NotificationResponse(
                n.getId(),
                n.getType(),
                n.getActorUserId(),
                n.getReferenceId(),
                n.getTitle(),
                n.getBody(),
                n.isRead(),
                n.getCreatedAt());
    }
}
