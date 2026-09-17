package com.lowloot.server.profile;

import com.lowloot.server.auth.User;
import com.lowloot.server.auth.UserRepository;
import com.lowloot.server.wallet.Wallet;
import com.lowloot.server.wallet.WalletRepository;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.util.Base64;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

// Perfil de usuario: nombre visible + foto de perfil. Vive separado de
// MeController (que ya tenia /users/me para el saldo) para no mezclar
// "sesion actual" con "edicion de perfil", pero ambos devuelven la misma
// forma de datos (UserProfileResponse) para que el frontend no tenga que
// distinguir de donde vino la respuesta.
@RestController
@RequestMapping("/users")
public class ProfileController {

    // Limite generoso pero acotado para el PNG ya recortado que manda el
    // editor del launcher (circulo de a lo sumo unos cientos de px). Frena
    // tanto errores del cliente como abuso, sin acoplarse a un tamano de
    // canvas especifico.
    private static final int MAX_AVATAR_BYTES = 3 * 1024 * 1024;

    private final UserRepository userRepository;
    private final WalletRepository walletRepository;
    private final UserAvatarRepository userAvatarRepository;

    public ProfileController(
            UserRepository userRepository,
            WalletRepository walletRepository,
            UserAvatarRepository userAvatarRepository) {
        this.userRepository = userRepository;
        this.walletRepository = walletRepository;
        this.userAvatarRepository = userAvatarRepository;
    }

    // Cambiar el nombre visible. A proposito no acepta "username": el
    // identificador de cuenta no se toca desde aca (requisito del perfil).
    @PatchMapping("/me")
    public UserProfileResponse updateDisplayName(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody UpdateDisplayNameRequest request) {
        user.setDisplayName(request.displayName().trim());
        userRepository.save(user);
        return toProfileResponse(user);
    }

    // Guarda la foto ya recortada/ajustada (el editor del launcher hace el
    // recorte en el cliente con canvas y manda el PNG final). Reemplaza
    // cualquier foto anterior del mismo usuario.
    @PutMapping("/me/avatar")
    public UserProfileResponse updateAvatar(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody UpdateAvatarRequest request) {
        byte[] imageData = decodeImage(request.imageBase64());

        UserAvatar avatar = userAvatarRepository.findByUserId(user.getId())
                .orElseGet(() -> new UserAvatar(user.getId(), imageData, "image/png"));
        avatar.setImageData(imageData);
        avatar.setContentType("image/png");
        avatar.setUpdatedAt(java.time.LocalDateTime.now());
        userAvatarRepository.save(avatar);

        return toProfileResponse(user);
    }

    // Elimina la foto personalizada: a partir de aca el usuario vuelve a
    // usar default-profile.png (que vive solo en el frontend, nunca en la
    // base). Idempotente: si no tenia foto, no rompe nada.
    @DeleteMapping("/me/avatar")
    public ResponseEntity<Void> deleteAvatar(@AuthenticationPrincipal User user) {
        userAvatarRepository.deleteByUserId(user.getId());
        return ResponseEntity.noContent().build();
    }

    // Publico (ver SecurityConfig: GET /users/*/avatar esta en permitAll)
    // porque la foto de perfil es dato publico basico, igual que el nombre
    // visible, y se va a reutilizar despues en la lista de amigos sin pedir
    // sesion por cada miniatura.
    @GetMapping("/{id}/avatar")
    public ResponseEntity<byte[]> getAvatar(@PathVariable Long id) {
        UserAvatar avatar = userAvatarRepository.findByUserId(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Este usuario no tiene foto de perfil personalizada"));

        MediaType mediaType = MediaType.parseMediaType(avatar.getContentType());
        return ResponseEntity.ok()
                .contentType(mediaType)
                .cacheControl(org.springframework.http.CacheControl.noCache())
                .body(avatar.getImageData());
    }

    private byte[] decodeImage(String raw) {
        String base64 = raw.contains(",") ? raw.substring(raw.indexOf(',') + 1) : raw;
        byte[] imageData;
        try {
            imageData = Base64.getDecoder().decode(base64);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La imagen enviada no es válida");
        }

        if (imageData.length == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La imagen enviada está vacía");
        }
        if (imageData.length > MAX_AVATAR_BYTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La imagen es demasiado pesada");
        }
        return imageData;
    }

    private UserProfileResponse toProfileResponse(User user) {
        BigDecimal balance = walletRepository.findByUserId(user.getId())
                .map(Wallet::getBalance)
                .orElse(BigDecimal.ZERO);
        boolean hasAvatar = userAvatarRepository.existsByUserId(user.getId());

        return new UserProfileResponse(
                user.getId(),
                user.getDisplayUsername(),
                user.getEffectiveDisplayName(),
                user.getEmail(),
                user.getRole().name(),
                balance,
                hasAvatar ? "/users/" + user.getId() + "/avatar" : null);
    }
}
