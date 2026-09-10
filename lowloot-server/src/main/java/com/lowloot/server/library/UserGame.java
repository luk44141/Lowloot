package com.lowloot.server.library;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

// Mapea 1:1 la tabla `user_games` ya existente (id, user_id, game_id,
// purchased_at, installed, UNIQUE(user_id, game_id)). Esta es la UNICA
// fuente de verdad de que juegos son realmente del usuario -- reemplaza
// por completo a los juegos ficticios que antes mostraba el launcher.
@Entity
@Table(name = "user_games")
public class UserGame {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "game_id", nullable = false)
    private Long gameId;

    @Column(name = "purchased_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime purchasedAt;

    @Column(nullable = false)
    private boolean installed = false;

    // Favorito real por usuario (V4__user_games_favorite.sql), no un estado
    // simulado en memoria del launcher.
    @Column(nullable = false)
    private boolean favorite = false;

    public UserGame() {
    }

    public UserGame(Long userId, Long gameId) {
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

    public LocalDateTime getPurchasedAt() {
        return purchasedAt;
    }

    public boolean isInstalled() {
        return installed;
    }

    public void setInstalled(boolean installed) {
        this.installed = installed;
    }

    public boolean isFavorite() {
        return favorite;
    }

    public void setFavorite(boolean favorite) {
        this.favorite = favorite;
    }
}
