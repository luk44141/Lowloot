package com.lowloot.server.notification;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByUserIdOrderByCreatedAtDesc(Long userId);

    long countByUserIdAndReadFalse(Long userId);

    Optional<Notification> findByIdAndUserId(Long id, Long userId);

    // Usado al aceptar/rechazar/cancelar una solicitud de amistad: la
    // notificación de esa solicitud puntual deja de tener sentido (ya no
    // hay nada que aceptar/rechazar), así que se borra en vez de quedar
    // como leída para siempre.
    void deleteByTypeAndReferenceId(String type, Long referenceId);

    @Modifying
    @Query("update Notification n set n.read = true where n.userId = :userId and n.read = false")
    int markAllReadForUser(@Param("userId") Long userId);
}
