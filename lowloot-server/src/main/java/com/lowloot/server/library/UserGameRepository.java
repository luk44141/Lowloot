package com.lowloot.server.library;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserGameRepository extends JpaRepository<UserGame, Long> {

    List<UserGame> findByUserId(Long userId);

    Optional<UserGame> findByUserIdAndGameId(Long userId, Long gameId);

    boolean existsByUserIdAndGameId(Long userId, Long gameId);

    // Para el panel admin: sacarle un juego a un usuario de su biblioteca.
    void deleteByUserIdAndGameId(Long userId, Long gameId);

    // Para el paso "comprobar que no pertenezcan ya al usuario" de la
    // compra, sin ida y vuelta juego por juego.
    @Query("select ug.gameId from UserGame ug where ug.userId = :userId and ug.gameId in :gameIds")
    Set<Long> findOwnedGameIds(@Param("userId") Long userId, @Param("gameIds") Set<Long> gameIds);
}
