package com.lowloot.server.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// "Olvidaste tu contrasena" version escolar: identifica al usuario por
// email (no hay recuperacion por correo real) y establece una contrasena
// nueva directamente. Igual se guarda siempre hasheada con BCrypt.
public record ChangePasswordRequest(
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8, max = 72) String newPassword) {
}
