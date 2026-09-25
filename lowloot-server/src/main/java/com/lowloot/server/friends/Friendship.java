package com.lowloot.server.friends;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

// Mapea `friendships` (V6__friends.sql): UNA SOLA fila logica por par de
// usuarios amigos (userIdLow siempre el menor id, ver constraint
// chk_friendships_order). No hay una fila por direccion -- evita
// duplicados y hace que borrar la amistad sea borrar una sola fila.
@Entity
@Table(name = "friendships")
public class Friendship {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id_low", nullable = false)
    private Long userIdLow;

    @Column(name = "user_id_high", nullable = false)
    private Long userIdHigh;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime createdAt;

    public Friendship() {
    }

    // A proposito no valida el orden aca: FriendService siempre arma los
    // ids con Math.min/Math.max antes de instanciar, y la base tiene el
    // mismo chequeo como red de seguridad (chk_friendships_order).
    public Friendship(Long userIdLow, Long userIdHigh) {
        this.userIdLow = userIdLow;
        this.userIdHigh = userIdHigh;
    }

    public Long getId() {
        return id;
    }

    public Long getUserIdLow() {
        return userIdLow;
    }

    public Long getUserIdHigh() {
        return userIdHigh;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
