package com.lowloot.server.admin;

import com.lowloot.server.auth.User;
import com.lowloot.server.auth.UserRepository;
import com.lowloot.server.wallet.Transaction;
import com.lowloot.server.wallet.TransactionRepository;
import com.lowloot.server.wallet.Wallet;
import com.lowloot.server.wallet.WalletRepository;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

// Ruta bajo /admin: SecurityConfig ya exige ROLE_ADMIN para todo lo que
// empiece con /admin/**, asi que la validacion de rol pasa en el
// servidor, no solo en que Electron oculte o no el boton del panel.
@RestController
@RequestMapping("/admin")
public class AdminController {

    private final UserRepository userRepository;
    private final WalletRepository walletRepository;
    private final TransactionRepository transactionRepository;

    public AdminController(
            UserRepository userRepository,
            WalletRepository walletRepository,
            TransactionRepository transactionRepository) {
        this.userRepository = userRepository;
        this.walletRepository = walletRepository;
        this.transactionRepository = transactionRepository;
    }

    @GetMapping("/users")
    public List<AdminUserView> listUsers() {
        return userRepository.findAll().stream()
                .map(user -> new AdminUserView(
                        user.getId(),
                        user.getDisplayUsername(),
                        user.getEmail(),
                        user.getRole().name(),
                        walletRepository.findByUserId(user.getId()).map(Wallet::getBalance).orElse(BigDecimal.ZERO),
                        user.getCreatedAt()))
                .toList();
    }

    @Transactional
    @PatchMapping("/users/{userId}/balance")
    public AdminUserView adjustBalance(
            @PathVariable Long userId,
            @Valid @RequestBody AdminBalanceAdjustmentRequest request) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));

        Wallet wallet = walletRepository.findByUserIdForUpdate(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "El usuario no tiene billetera"));

        BigDecimal newBalance = wallet.getBalance().add(request.delta());
        if (newBalance.compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El saldo no puede quedar negativo");
        }

        wallet.setBalance(newBalance);
        walletRepository.save(wallet);

        // Cada ajuste de saldo por parte del admin queda registrado en
        // transactions, tal como se pidio.
        String type = request.delta().compareTo(BigDecimal.ZERO) >= 0 ? "ADMIN_CREDIT" : "ADMIN_DEBIT";
        String description = request.reason() != null && !request.reason().isBlank()
                ? request.reason()
                : "Ajuste de saldo por administrador";
        transactionRepository.save(new Transaction(userId, type, request.delta(), description));

        return new AdminUserView(
                user.getId(),
                user.getDisplayUsername(),
                user.getEmail(),
                user.getRole().name(),
                wallet.getBalance(),
                user.getCreatedAt());
    }
}
