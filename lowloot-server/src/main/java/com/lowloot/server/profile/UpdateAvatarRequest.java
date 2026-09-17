package com.lowloot.server.profile;

import jakarta.validation.constraints.NotBlank;

// La imagen ya llega recortada/ajustada desde el editor del launcher
// (canvas -> toDataURL), codificada en base64. Puede venir con el prefijo
// "data:image/png;base64," o sin el; ProfileController lo saca si esta.
public record UpdateAvatarRequest(@NotBlank String imageBase64) {
}
