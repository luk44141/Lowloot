package com.lowloot.server.profile;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// Adrede NO tiene un campo "username": el nombre de cuenta no se puede
// tocar desde el perfil, solo el nombre visible.
public record UpdateDisplayNameRequest(@NotBlank @Size(min = 1, max = 50) String displayName) {
}
