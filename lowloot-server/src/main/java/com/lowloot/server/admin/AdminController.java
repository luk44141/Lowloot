package com.lowloot.server.admin;

import com.lowloot.server.Game;
import com.lowloot.server.auth.User;
import com.lowloot.server.auth.UserRepository;
import com.lowloot.server.library.LibraryEntryResponse;
import com.lowloot.server.library.UserGame;
import com.lowloot.server.library.UserGameRepository;
import com.lowloot.server.repository.GameRepository;
import com.lowloot.server.wallet.Transaction;
import com.lowloot.server.wallet.TransactionRepository;
import com.lowloot.server.wallet.Wallet;
import com.lowloot.server.wallet.WalletRepository;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
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
    private final UserGameRepository userGameRepository;
    private final GameRepository gameRepository;

    public AdminController(
            UserRepository userRepository,
            WalletRepository walletRepository,
            TransactionRepository transactionRepository,
            UserGameRepository userGameRepository,
            GameRepository gameRepository) {
        this.userRepository = userRepository;
        this.walletRepository = walletRepository;
        this.transactionRepository = transactionRepository;
        this.userGameRepository = userGameRepository;
        this.gameRepository = gameRepository;
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

    // Biblioteca real de un usuario puntual, para que el admin vea qué
    // tiene antes de decidir si le quita algo.
    @GetMapping("/users/{userId}/library")
    public List<LibraryEntryResponse> userLibrary(@PathVariable Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado");
        }

        List<UserGame> owned = userGameRepository.findByUserId(userId);
        if (owned.isEmpty()) return List.of();

        Map<Long, Game> gamesById = gameRepository
                .findAllById(owned.stream().map(UserGame::getGameId).toList())
                .stream()
                .collect(Collectors.toMap(Game::getId, Function.identity()));

        return owned.stream()
                .map(ug -> {
                    Game game = gamesById.get(ug.getGameId());
                    if (game == null) return null;
                    return new LibraryEntryResponse(
                            game.getId(),
                            game.getName(),
                            game.getGenre(),
                            game.getCoverImageUrl(),
                            game.getPrice(),
                            ug.isInstalled(),
                            ug.isFavorite(),
                            ug.getPurchasedAt());
                })
                .filter(java.util.Objects::nonNull)
                .toList();
    }

    // Le quita un juego de la biblioteca a un usuario puntual. Es una baja
    // administrativa real en user_games (no un ocultamiento visual): si
    // vuelve a comprarlo más adelante, se crea una fila nueva.
    @DeleteMapping("/users/{userId}/library/{gameId}")
    public void removeFromLibrary(@PathVariable Long userId, @PathVariable Long gameId) {
        UserGame userGame = userGameRepository.findByUserIdAndGameId(userId, gameId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ese usuario no tiene ese juego en su biblioteca"));
        userGameRepository.delete(userGame);
    }
}
