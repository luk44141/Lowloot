package com.lowloot.server.auth;

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

    public MeController(WalletRepository walletRepository) {
        this.walletRepository = walletRepository;
    }

    // Requiere estar logueado (regla general de SecurityConfig: todo lo que
    // no sea /games, /assets o /auth pide autenticacion). El saldo sale de
    // PostgreSQL en el momento, nunca de un valor guardado en el cliente.
    @GetMapping("/me")
    public MeResponse me(@AuthenticationPrincipal User user) {
        BigDecimal balance = walletRepository.findByUserId(user.getId())
                .map(Wallet::getBalance)
                .orElse(BigDecimal.ZERO);

        return new MeResponse(
                user.getId(),
                user.getDisplayUsername(),
                user.getEmail(),
                user.getRole().name(),
                balance);
    }

    public record MeResponse(Long id, String username, String email, String role, BigDecimal balance) {
    }
}
