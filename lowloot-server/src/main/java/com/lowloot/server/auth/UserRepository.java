package com.lowloot.server.auth;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    boolean existsByUsername(String username);

    boolean existsByFriendCode(String friendCode);

    Optional<User> findByFriendCodeIgnoreCase(String friendCode);

    // Busqueda de Amigos por nombre visible (o username como respaldo,
    // para usuarios que nunca configuraron un nombre visible propio).
    // Excluye al que busca para no encontrarse a si mismo en los resultados.
    @Query("select u from User u where u.id <> :excludeId "
            + "and lower(coalesce(u.displayName, u.username)) like lower(concat('%', :query, '%')) "
            + "order by coalesce(u.displayName, u.username)")
    List<User> searchByDisplayName(@Param("query") String query, @Param("excludeId") Long excludeId);
}
