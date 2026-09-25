package com.lowloot.server.friends;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FriendRequestRepository extends JpaRepository<FriendRequest, Long> {

    Optional<FriendRequest> findBySenderIdAndReceiverId(Long senderId, Long receiverId);

    boolean existsBySenderIdAndReceiverId(Long senderId, Long receiverId);

    List<FriendRequest> findByReceiverIdOrderByCreatedAtDesc(Long receiverId);

    List<FriendRequest> findBySenderIdOrderByCreatedAtDesc(Long senderId);

    // Fuente de verdad del contador de la pestaña Amigos (requisito 5): se
    // deriva directamente de las solicitudes pendientes reales, no de si
    // el usuario marco notificaciones como leidas, así que aceptar o
    // rechazar es lo único que lo mueve.
    long countByReceiverId(Long receiverId);
}
