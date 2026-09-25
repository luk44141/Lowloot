package com.lowloot.server.notification;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

// Mapea `notifications` (V6__friends.sql). Primera vez que existe una
// tabla real para esto en Lowloot (antes solo había un array vacío en el
// frontend, ver state.js) -- se diseña genérica (type/actorUserId/
// referenceId) a propósito para que otras funcionalidades a futuro la
// reutilicen en vez de crear su propio sistema, tal como se pidió para
// Amigos.
@Entity
@Table(name = "notifications")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    // Tipo de evento: "FRIEND_REQUEST", "FRIEND_ACCEPTED", etc. Un tipo
    // nuevo a futuro no requiere ninguna migración ni tabla nueva.
    @Column(nullable = false, length = 40)
    private String type;

    // Quién generó la notificación (quien envió la solicitud, quien
    // aceptó, etc). Nullable porque no todo tipo de notificación futuro
    // tiene necesariamente un actor humano.
    @Column(name = "actor_user_id")
    private Long actorUserId;

    // Id del recurso relacionado (ej. el id de la FriendRequest), para
    // poder encontrar y borrar/actualizar la notificación correspondiente
    // cuando ese recurso cambia de estado (ver NotificationService).
    @Column(name = "reference_id")
    private Long referenceId;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(length = 500)
    private String body;

    @Column(nullable = false)
    private boolean read = false;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime createdAt;

    public Notification() {
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public Long getActorUserId() {
        return actorUserId;
    }

    public void setActorUserId(Long actorUserId) {
        this.actorUserId = actorUserId;
    }

    public Long getReferenceId() {
        return referenceId;
    }

    public void setReferenceId(Long referenceId) {
        this.referenceId = referenceId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getBody() {
        return body;
    }

    public void setBody(String body) {
        this.body = body;
    }

    public boolean isRead() {
        return read;
    }

    public void setRead(boolean read) {
        this.read = read;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
