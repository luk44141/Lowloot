package com.lowloot.server.purchase;

import com.lowloot.server.Game;
import com.lowloot.server.library.UserGame;
import com.lowloot.server.library.UserGameRepository;
import com.lowloot.server.repository.GameRepository;
import com.lowloot.server.wallet.Transaction;
import com.lowloot.server.wallet.TransactionRepository;
import com.lowloot.server.wallet.Wallet;
import com.lowloot.server.wallet.WalletRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PurchaseService {

    private final GameRepository gameRepository;
    private final UserGameRepository userGameRepository;
    private final WalletRepository walletRepository;
    private final TransactionRepository transactionRepository;

    public PurchaseService(
            GameRepository gameRepository,
            UserGameRepository userGameRepository,
            WalletRepository walletRepository,
            TransactionRepository transactionRepository) {
        this.gameRepository = gameRepository;
        this.userGameRepository = userGameRepository;
        this.walletRepository = walletRepository;
        this.transactionRepository = transactionRepository;
    }

    /**
     * Compra atomica de uno o varios juegos (individual o carrito, mismo
     * camino). Pasos, en orden, tal como se pidio:
     * 1. usuario ya viene comprobado (autenticado) por quien llama.
     * 2. comprobar juegos.
     * 3. comprobar que no pertenezcan ya al usuario.
     * 4. calcular el total.
     * 5. comprobar saldo suficiente.
     * 6. descontar el saldo.
     * 7. registrar la transaccion.
     * 8. agregar los juegos a user_games.
     * 9. commit (automatico al salir del metodo @Transactional sin error).
     * Si cualquier paso falla se tira una excepcion y Spring hace ROLLBACK
     * de todo (no se descuenta saldo ni se agrega ningun juego).
     */
    @Transactional
    public PurchaseResponse purchase(Long userId, List<Long> requestedGameIds) {
        // Dedup preservando orden, por si el carrito manda el mismo id repetido.
        Set<Long> gameIds = new LinkedHashSet<>(requestedGameIds);

        // --- 2. Comprobar juegos ---
        List<Game> games = gameRepository.findAllById(gameIds);
        if (games.size() != gameIds.size()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Uno o mas juegos del carrito ya no existen");
        }
        Map<Long, Game> gamesById = games.stream().collect(Collectors.toMap(Game::getId, Function.identity()));

        // --- 3. Comprobar que no pertenezcan ya al usuario ---
        Set<Long> alreadyOwned = userGameRepository.findOwnedGameIds(userId, gameIds);
        if (!alreadyOwned.isEmpty()) {
            String names = alreadyOwned.stream()
                    .map(id -> gamesById.get(id).getName())
                    .collect(Collectors.joining(", "));
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya tenes en tu biblioteca: " + names);
        }

        // --- 4. Calcular el total ---
        BigDecimal total = BigDecimal.ZERO;
        for (Long id : gameIds) {
            total = total.add(finalUnitPrice(gamesById.get(id)));
        }
        total = total.setScale(2, RoundingMode.HALF_UP);

        // --- 5. Comprobar saldo suficiente (con lock para que dos compras
        // concurrentes del mismo usuario no lean el mismo saldo viejo) ---
        Wallet wallet = walletRepository.findByUserIdForUpdate(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "El usuario no tiene billetera"));

        if (wallet.getBalance().compareTo(total) < 0) {
            throw new InsufficientBalanceException("Saldo insuficiente");
        }

        // --- 6. Descontar el saldo ---
        wallet.setBalance(wallet.getBalance().subtract(total));
        walletRepository.save(wallet);

        // --- 7. Registrar la transaccion ---
        String gameNames = gameIds.stream().map(id -> gamesById.get(id).getName()).collect(Collectors.joining(", "));
        transactionRepository.save(new Transaction(userId, "PURCHASE", total.negate(), "Compra: " + gameNames));

        // --- 8. Agregar los juegos a user_games ---
        for (Long id : gameIds) {
            userGameRepository.save(new UserGame(userId, id));
        }

        // --- 9. commit automatico al retornar sin excepcion ---
        return new PurchaseResponse(List.copyOf(gameIds), total, wallet.getBalance());
    }

    private BigDecimal finalUnitPrice(Game game) {
        if (game.isFree()) return BigDecimal.ZERO;

        BigDecimal price = BigDecimal.valueOf(game.getPrice());
        BigDecimal discount = BigDecimal.valueOf(game.getDiscount());

        if (discount.compareTo(BigDecimal.ZERO) <= 0) return price;

        BigDecimal factor = BigDecimal.ONE.subtract(discount.divide(BigDecimal.valueOf(100)));
        return price.multiply(factor).setScale(2, RoundingMode.HALF_UP);
    }
}
