package com.lowloot.server.wishlist;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

// Mapea la tabla `wishlist` ya existente (id, user_id, game_id,
// UNIQUE(user_id, game_id)) mas la columna `added_at` agregada en
// V2__wishlist_added_at.sql.
@Entity
@Table(name = "wishlist")
public class WishlistItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "game_id", nullable = false)
    private Long gameId;

    @Column(name = "added_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime addedAt;

    public WishlistItem() {
    }

    public WishlistItem(Long userId, Long gameId) {
        this.userId = userId;
        this.gameId = gameId;
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public Long getGameId() {
        return gameId;
    }

    public LocalDateTime getAddedAt() {
        return addedAt;
    }
}
