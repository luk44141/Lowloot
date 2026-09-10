package com.lowloot.server.library;

import com.lowloot.server.Game;
import com.lowloot.server.auth.User;
import com.lowloot.server.repository.GameRepository;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/library")
public class LibraryController {

    private final UserGameRepository userGameRepository;
    private final GameRepository gameRepository;

    public LibraryController(UserGameRepository userGameRepository, GameRepository gameRepository) {
        this.userGameRepository = userGameRepository;
        this.gameRepository = gameRepository;
    }

    // Unica fuente de la Biblioteca del launcher: SOLO lo que este usuario
    // realmente tiene en user_games. Nada hardcodeado ni derivado del
    // catalogo completo de /games.
    @GetMapping("/me")
    public List<LibraryEntryResponse> myLibrary(@AuthenticationPrincipal User user) {
        List<UserGame> owned = userGameRepository.findByUserId(user.getId());
        if (owned.isEmpty()) return List.of();

        Map<Long, Game> gamesById = gameRepository
                .findAllById(owned.stream().map(UserGame::getGameId).toList())
                .stream()
                .collect(Collectors.toMap(Game::getId, Function.identity()));

        return owned.stream()
                .map(ug -> {
                    Game game = gamesById.get(ug.getGameId());
                    if (game == null) return null; // juego borrado del catalogo: no se muestra
                    return toResponse(game, ug);
                })
                .filter(java.util.Objects::nonNull)
                .toList();
    }

    // No hay instalacion real todavia: esto solo persiste el estado
    // "instalado" para que la Biblioteca lo recuerde entre sesiones. El
    // launcher es responsable de mostrar el modal "En proceso" antes de
    // llamar aca.
    @PatchMapping("/{gameId}/install")
    public LibraryEntryResponse markInstalled(@AuthenticationPrincipal User user, @PathVariable Long gameId) {
        UserGame userGame = findOwned(user, gameId);
        userGame.setInstalled(true);
        userGameRepository.save(userGame);
        return toResponse(gameOrThrow(gameId), userGame);
    }

    // Desinstalar tambien es simulado: solo pone installed=false. No borra
    // ni toca ningun archivo real (no hay instalacion real todavia).
    @PatchMapping("/{gameId}/uninstall")
    public LibraryEntryResponse markUninstalled(@AuthenticationPrincipal User user, @PathVariable Long gameId) {
        UserGame userGame = findOwned(user, gameId);
        userGame.setInstalled(false);
        userGameRepository.save(userGame);
        return toResponse(gameOrThrow(gameId), userGame);
    }

    // Favorito real por usuario (persistido en user_games.favorite, ver
    // V3__user_games_favorite.sql), no un estado simulado en el launcher.
    @PatchMapping("/{gameId}/favorite")
    public LibraryEntryResponse setFavorite(
            @AuthenticationPrincipal User user,
            @PathVariable Long gameId,
            @Valid @RequestBody FavoriteRequest request) {
        UserGame userGame = findOwned(user, gameId);
        userGame.setFavorite(request.favorite());
        userGameRepository.save(userGame);
        return toResponse(gameOrThrow(gameId), userGame);
    }

    private UserGame findOwned(User user, Long gameId) {
        return userGameRepository.findByUserIdAndGameId(user.getId(), gameId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ese juego no está en tu biblioteca"));
    }

    private Game gameOrThrow(Long gameId) {
        return gameRepository.findById(gameId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Juego no encontrado"));
    }

    private LibraryEntryResponse toResponse(Game game, UserGame userGame) {
        return new LibraryEntryResponse(
                game.getId(),
                game.getName(),
                game.getGenre(),
                game.getCoverImageUrl(),
                game.getPrice(),
                userGame.isInstalled(),
                userGame.isFavorite(),
                userGame.getPurchasedAt());
    }
}
