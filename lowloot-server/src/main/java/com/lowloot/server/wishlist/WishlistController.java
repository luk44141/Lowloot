package com.lowloot.server.wishlist;

import com.lowloot.server.Game;
import com.lowloot.server.auth.User;
import com.lowloot.server.repository.GameRepository;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/wishlist")
public class WishlistController {

    private final WishlistRepository wishlistRepository;
    private final GameRepository gameRepository;

    public WishlistController(WishlistRepository wishlistRepository, GameRepository gameRepository) {
        this.wishlistRepository = wishlistRepository;
        this.gameRepository = gameRepository;
    }

    @GetMapping("/me")
    public List<WishlistEntryResponse> myWishlist(@AuthenticationPrincipal User user) {
        List<WishlistItem> items = wishlistRepository.findByUserIdOrderByAddedAtDesc(user.getId());
        if (items.isEmpty()) return List.of();

        Map<Long, Game> gamesById = gameRepository
                .findAllById(items.stream().map(WishlistItem::getGameId).toList())
                .stream()
                .collect(Collectors.toMap(Game::getId, Function.identity()));

        return items.stream()
                .map(item -> {
                    Game game = gamesById.get(item.getGameId());
                    if (game == null) return null; // juego borrado del catalogo: no se muestra
                    return new WishlistEntryResponse(
                            game.getId(),
                            game.getName(),
                            game.getGenre(),
                            game.getCoverImageUrl(),
                            game.getPrice(),
                            game.getDiscount(),
                            game.getReleaseDate(),
                            item.getAddedAt());
                })
                .filter(java.util.Objects::nonNull)
                .toList();
    }

    @PostMapping("/{gameId}")
    public ResponseEntity<Void> add(@AuthenticationPrincipal User user, @PathVariable Long gameId) {
        if (!gameRepository.existsById(gameId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Juego no encontrado");
        }
        if (!wishlistRepository.existsByUserIdAndGameId(user.getId(), gameId)) {
            wishlistRepository.save(new WishlistItem(user.getId(), gameId));
        }
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @DeleteMapping("/{gameId}")
    public ResponseEntity<Void> remove(@AuthenticationPrincipal User user, @PathVariable Long gameId) {
        wishlistRepository.findByUserIdAndGameId(user.getId(), gameId)
                .ifPresent(wishlistRepository::delete);
        return ResponseEntity.noContent().build();
    }
}
