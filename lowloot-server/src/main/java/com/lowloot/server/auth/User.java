package com.lowloot.server.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

// Mapea la tabla `users` que ya existia en la base `lowloot` antes de este
// cambio (id, username, email, password_hash, created_at, role), mas
// `display_name` agregada en V5__user_profile.sql para el perfil. La foto
// de perfil NO vive aca (ver profile.UserAvatar): este User se carga en
// cada request autenticado (JwtAuthFilter), asi que no conviene traer un
// BYTEA pesado en cada consulta.
@Entity
@Table(name = "users")
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String username;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role = Role.USER;

    // Nombre visible del perfil, independiente de `username`. NULL cuando el
    // usuario todavia no lo configuro: en ese caso la UI y las respuestas
    // del API usan el username como valor por defecto (getEffectiveDisplayName).
    @Column(name = "display_name", length = 50)
    private String displayName;

    public User() {
    }

    public Long getId() {
        return id;
    }

    // Nombre de usuario para mostrar en la UI (columna `username` de la
    // tabla). No confundir con getUsername() de abajo, que es el metodo que
    // pide la interfaz UserDetails y que en Lowloot usamos con el email
    // como identificador de login.
    public String getDisplayUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    // Nombre a mostrar en la UI: el visible si esta configurado, o el
    // username como fallback. Evita repetir este "si es null, uso username"
    // en cada controller que arma una respuesta con el nombre del usuario.
    public String getEffectiveDisplayName() {
        return (displayName == null || displayName.isBlank()) ? username : displayName;
    }

    /* ---------- UserDetails (Spring Security se autentica contra esto) ---------- */

    @Override
    public String getPassword() {
        return passwordHash;
    }

    // Spring Security llama a esto "username", pero nuestro identificador de
    // login es el email (unico, y es lo que ya pide el modal de login).
    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }
}
