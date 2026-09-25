package com.lowloot.server.friends;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FriendshipRepository extends JpaRepository<Friendship, Long> {

    Optional<Friendship> findByUserIdLowAndUserIdHigh(Long userIdLow, Long userIdHigh);

    boolean existsByUserIdLowAndUserIdHigh(Long userIdLow, Long userIdHigh);

    @Query("select f from Friendship f where f.userIdLow = :userId or f.userIdHigh = :userId")
    List<Friendship> findAllForUser(@Param("userId") Long userId);
}
