package com.lowloot.server.repository;

import com.lowloot.server.GameImage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GameImageRepository extends JpaRepository<GameImage, Long> {

    List<GameImage> findByGameIdOrderByDisplayOrder(Long gameId);
}