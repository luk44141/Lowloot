package com.lowloot.server.profile;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

// Mapea `user_avatars` (V5__user_profile.sql), separada de `users` a
// proposito: solo se consulta cuando hace falta mostrar/editar la foto, no
// en cada request autenticado como pasaria si viviera en la entidad User.
// user_id es PK y FK a la vez: relacion 1 a 1, un usuario tiene a lo sumo
// una foto personalizada guardada.
@Entity
@Table(name = "user_avatars")
public class UserAvatar {

    @Id
    @Column(name = "user_id")
    private Long userId;

    // OJO: a proposito SIN @Lob. Con @Lob, Hibernate mapea byte[] contra
    // PostgreSQL como un Large Object (columna tipo `oid`, via
    // lo_creat/lo_write), que no es compatible con nuestra columna
    // `image_data BYTEA` de V5__user_profile.sql: el INSERT/UPDATE falla en
    // tiempo de ejecucion con algo como "column image_data is of type
    // bytea but expression is of type oid" (se reprodujo justamente asi
    // contra un Postgres real). @JdbcTypeCode(SqlTypes.VARBINARY) fuerza el
    // mapeo correcto byte[] <-> bytea sin ambiguedad.
    @JdbcTypeCode(SqlTypes.VARBINARY)
    @Column(name = "image_data", nullable = false)
    private byte[] imageData;

    @Column(name = "content_type", nullable = false, length = 50)
    private String contentType = "image/png";

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    public UserAvatar() {
    }

    public UserAvatar(Long userId, byte[] imageData, String contentType) {
        this.userId = userId;
        this.imageData = imageData;
        this.contentType = contentType;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public byte[] getImageData() {
        return imageData;
    }

    public void setImageData(byte[] imageData) {
        this.imageData = imageData;
    }

    public String getContentType() {
        return contentType;
    }

    public void setContentType(String contentType) {
        this.contentType = contentType;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
