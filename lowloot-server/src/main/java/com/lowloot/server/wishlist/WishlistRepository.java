package com.lowloot.server.wishlist;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WishlistRepository extends JpaRepository<WishlistItem, Long> {

    List<WishlistItem> findByUserIdOrderByAddedAtDesc(Long userId);

    Optional<WishlistItem> findByUserIdAndGameId(Long userId, Long gameId);

    boolean existsByUserIdAndGameId(Long userId, Long gameId);

    long countByGameId(Long gameId);

    // Se usa al confirmar una compra: si alguno de los juegos comprados
    // estaba en la wishlist del usuario, sale de ahí automáticamente.
    void deleteByUserIdAndGameIdIn(Long userId, Collection<Long> gameIds);
}
