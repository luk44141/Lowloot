package com.lowloot.server.auth;

import com.lowloot.server.profile.UserAvatarRepository;
import com.lowloot.server.profile.UserProfileResponse;
import com.lowloot.server.wallet.Wallet;
import com.lowloot.server.wallet.WalletRepository;
import java.math.BigDecimal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/users")
public class MeController {

    private final WalletRepository walletRepository;
    private final UserAvatarRepository userAvatarRepository;

    public MeController(WalletRepository walletRepository, UserAvatarRepository userAvatarRepository) {
        this.walletRepository = walletRepository;
        this.userAvatarRepository = userAvatarRepository;
    }

    // Requiere estar logueado (regla general de SecurityConfig: todo lo que
    // no sea /games, /assets o /auth pide autenticacion). El saldo sale de
    // PostgreSQL en el momento, nunca de un valor guardado en el cliente.
    // La forma de la respuesta (UserProfileResponse) es la misma que usa
    // ProfileController al editar el perfil, asi el frontend no distingue.
    @GetMapping("/me")
    public UserProfileResponse me(@AuthenticationPrincipal User user) {
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
